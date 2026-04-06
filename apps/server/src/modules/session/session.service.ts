import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '@server/config/redis.config';
import { REDIS_KEYS, SessionData } from '@server/common/redis/redis-keys';
import { TableService } from '@server/modules/table/table.service';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import {
  CreateSessionDto,
  JoinSessionDto,
  SessionResponse,
  SessionConflictResponse,
  MoveSessionResponse,
  TableSessionInfo,
  ForceDeleteSessionResponse,
} from '@qr-order/shared-types';

export { SessionData };

@Injectable()
export class SessionService {
  private readonly ttl: number;

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly tableService: TableService,
    private readonly configService: ConfigService,
  ) {
    this.ttl = configService.get<number>('SESSION_TTL_SECONDS', 7200);
  }

  getSessionKey(storeId: string, sessionToken: string): string {
    return REDIS_KEYS.session.key(storeId, sessionToken);
  }

  private generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createSession(dto: CreateSessionDto): Promise<SessionResponse> {
    const table = await this.tableService.validateQrToken(dto.qrToken);
    if (!table) {
      throw new BadRequestException('유효하지 않거나 만료된 QR 코드입니다.');
    }

    const storeId = table.storeId;
    const sessionToken = uuidv4();
    const tableSessionKey = REDIS_KEYS.tableSession.key(storeId, table.id);

    // 원자적 SET NX — 테이블당 1개 세션만 허용
    const wasSet = await this.redis.set(
      tableSessionKey,
      sessionToken,
      'EX',
      this.ttl,
      'NX',
    );

    if (!wasSet) {
      // 이미 활성 세션이 존재 → PIN 입력 필요
      const conflict: SessionConflictResponse = {
        requirePin: true,
        tableId: table.id,
        tableName: table.name,
        tableNumber: table.tableNumber,
      };
      throw new ConflictException(conflict);
    }

    const pin = this.generatePin();
    const expiresAt = new Date(Date.now() + this.ttl * 1000).toISOString();

    const sessionData: SessionData = {
      sessionToken,
      storeId,
      tableId: table.id,
      tableNumber: table.tableNumber,
      tableName: table.name,
      createdAt: new Date().toISOString(),
      expiresAt,
      pin,
      joinedCount: 1,
      capacity: table.capacity,
    };

    const sessionKey = this.getSessionKey(storeId, sessionToken);
    const lookupKey = REDIS_KEYS.sessionLookup.key(sessionToken);

    await Promise.all([
      this.redis.setex(sessionKey, this.ttl, JSON.stringify(sessionData)),
      this.redis.setex(lookupKey, this.ttl, storeId),
    ]);

    return {
      sessionToken,
      tableId: table.id,
      tableNumber: table.tableNumber,
      tableName: table.name,
      expiresAt,
      pin,
    };
  }

  async joinSession(dto: JoinSessionDto): Promise<SessionResponse> {
    // QR 토큰 검증 (물리적 위치 증명)
    const table = await this.tableService.validateQrToken(dto.qrToken);
    if (!table) {
      throw new BadRequestException('유효하지 않거나 만료된 QR 코드입니다.');
    }

    const storeId = table.storeId;
    const tableSessionKey = REDIS_KEYS.tableSession.key(storeId, table.id);

    // 활성 세션 조회
    const activeSessionToken = await this.redis.get(tableSessionKey);
    if (!activeSessionToken) {
      throw new BadRequestException(
        '이 테이블에 활성 세션이 없습니다. QR 코드를 다시 스캔해 주세요.',
      );
    }

    // 세션 데이터 조회
    const sessionKey = this.getSessionKey(storeId, activeSessionToken);
    const data = await this.redis.get(sessionKey);
    if (!data) {
      // table-session 키는 있지만 세션 데이터가 없는 비정상 상태 → 정리
      await this.redis.del(tableSessionKey);
      throw new BadRequestException(
        '세션이 만료되었습니다. QR 코드를 다시 스캔해 주세요.',
      );
    }

    const sessionData: SessionData = JSON.parse(data);

    // PIN 검증
    if (dto.pin !== sessionData.pin) {
      throw new UnauthorizedException('PIN 번호가 일치하지 않습니다.');
    }

    // 수용인원 검증
    if (sessionData.joinedCount >= sessionData.capacity) {
      throw new BadRequestException('테이블 인원이 초과되었습니다.');
    }

    // joinedCount 증가 및 저장
    sessionData.joinedCount += 1;
    const remainingTtl = await this.redis.ttl(sessionKey);
    const ttlToUse = remainingTtl > 0 ? remainingTtl : this.ttl;

    await this.redis.setex(sessionKey, ttlToUse, JSON.stringify(sessionData));

    // lookup 키도 설정 (이미 존재하지만 안전하게)
    const lookupKey = REDIS_KEYS.sessionLookup.key(activeSessionToken);
    await this.redis.expire(lookupKey, ttlToUse);

    return {
      sessionToken: activeSessionToken,
      tableId: table.id,
      tableNumber: table.tableNumber,
      tableName: table.name,
      expiresAt: sessionData.expiresAt,
    };
  }

  async validateSession(sessionToken: string): Promise<SessionData> {
    const storeId = await this.redis.get(REDIS_KEYS.sessionLookup.key(sessionToken));
    if (!storeId) {
      throw new UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
    }

    const data = await this.redis.get(this.getSessionKey(storeId, sessionToken));
    if (!data) {
      throw new UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
    }
    return JSON.parse(data);
  }

  async renewSession(sessionToken: string): Promise<void> {
    const storeId = await this.redis.get(REDIS_KEYS.sessionLookup.key(sessionToken));
    if (!storeId) return;

    const sessionKey = this.getSessionKey(storeId, sessionToken);
    const lookupKey = REDIS_KEYS.sessionLookup.key(sessionToken);

    // 세션 데이터에서 tableId 추출하여 table-session 키도 갱신
    const data = await this.redis.get(sessionKey);
    const renewPromises: Promise<unknown>[] = [
      this.redis.expire(sessionKey, this.ttl),
      this.redis.expire(lookupKey, this.ttl),
    ];

    if (data) {
      const sessionData: SessionData = JSON.parse(data);
      const tableSessionKey = REDIS_KEYS.tableSession.key(storeId, sessionData.tableId);
      renewPromises.push(this.redis.expire(tableSessionKey, this.ttl));

      // expiresAt도 갱신
      sessionData.expiresAt = new Date(Date.now() + this.ttl * 1000).toISOString();
      renewPromises.push(
        this.redis.setex(sessionKey, this.ttl, JSON.stringify(sessionData)),
      );
    }

    await Promise.all(renewPromises);
  }

  async deleteSession(sessionToken: string): Promise<void> {
    const storeId = await this.redis.get(REDIS_KEYS.sessionLookup.key(sessionToken));
    if (!storeId) return;

    // 세션 데이터에서 tableId 추출
    const sessionKey = this.getSessionKey(storeId, sessionToken);
    const data = await this.redis.get(sessionKey);

    const delPromises: Promise<unknown>[] = [
      this.redis.del(sessionKey),
      this.redis.del(REDIS_KEYS.sessionLookup.key(sessionToken)),
      this.redis.del(REDIS_KEYS.cart.key(storeId, sessionToken)),
    ];

    if (data) {
      const sessionData: SessionData = JSON.parse(data);
      delPromises.push(
        this.redis.del(REDIS_KEYS.tableSession.key(storeId, sessionData.tableId)),
      );
    }

    await Promise.all(delPromises);
  }

  // ─── 고객 자리이동 ──────────────────────────────────────────────────

  async moveSession(
    sessionToken: string,
    qrToken: string,
  ): Promise<MoveSessionResponse> {
    // 1. 현재 세션 검증
    const sessionData = await this.validateSession(sessionToken);
    const storeId = sessionData.storeId;
    const oldTableId = sessionData.tableId;

    // 2. 새 테이블 QR 토큰 검증 (물리적 위치 증명)
    const newTable = await this.tableService.validateQrToken(qrToken);
    if (!newTable) {
      throw new BadRequestException('유효하지 않거나 만료된 QR 코드입니다.');
    }

    // 같은 테이블이면 이동 불필요
    if (newTable.id === oldTableId) {
      return {
        sessionToken,
        tableId: newTable.id,
        tableNumber: newTable.tableNumber,
        tableName: newTable.name,
        expiresAt: sessionData.expiresAt,
      };
    }

    // 3. 새 테이블에 이미 활성 세션이 있는지 체크
    const newTableSessionKey = REDIS_KEYS.tableSession.key(storeId, newTable.id);
    const existingSession = await this.redis.get(newTableSessionKey);
    if (existingSession) {
      throw new ConflictException({
        requirePin: true,
        tableId: newTable.id,
        tableName: newTable.name,
        tableNumber: newTable.tableNumber,
      } as SessionConflictResponse);
    }

    // 4. 수용인원 검증
    if (newTable.capacity < sessionData.joinedCount) {
      throw new BadRequestException(
        `이동할 테이블의 수용인원(${newTable.capacity}명)이 현재 인원(${sessionData.joinedCount}명)보다 적습니다.`,
      );
    }

    // 5. Redis 키 이동
    const oldTableSessionKey = REDIS_KEYS.tableSession.key(storeId, oldTableId);
    const remainingTtl = await this.redis.ttl(
      this.getSessionKey(storeId, sessionToken),
    );
    const ttlToUse = remainingTtl > 0 ? remainingTtl : this.ttl;

    // SessionData 업데이트
    sessionData.tableId = newTable.id;
    sessionData.tableNumber = newTable.tableNumber;
    sessionData.tableName = newTable.name;
    sessionData.capacity = newTable.capacity;

    await Promise.all([
      this.redis.del(oldTableSessionKey),
      this.redis.setex(newTableSessionKey, ttlToUse, sessionToken),
      this.redis.setex(
        this.getSessionKey(storeId, sessionToken),
        ttlToUse,
        JSON.stringify(sessionData),
      ),
    ]);

    return {
      sessionToken,
      tableId: newTable.id,
      tableNumber: newTable.tableNumber,
      tableName: newTable.name,
      expiresAt: sessionData.expiresAt,
    };
  }

  // ─── 관리자 세션 관리 ──────────────────────────────────────────────

  async getTableSession(
    storeId: string,
    tableId: string,
  ): Promise<TableSessionInfo | null> {
    const tableSessionKey = REDIS_KEYS.tableSession.key(storeId, tableId);
    const activeSessionToken = await this.redis.get(tableSessionKey);
    if (!activeSessionToken) return null;

    const sessionKey = this.getSessionKey(storeId, activeSessionToken);
    const data = await this.redis.get(sessionKey);
    if (!data) {
      // 키 불일치 정리
      await this.redis.del(tableSessionKey);
      return null;
    }

    const sd: SessionData = JSON.parse(data);
    return {
      sessionToken: sd.sessionToken,
      pin: sd.pin,
      joinedCount: sd.joinedCount,
      capacity: sd.capacity,
      tableId: sd.tableId,
      tableName: sd.tableName,
      tableNumber: sd.tableNumber,
      createdAt: sd.createdAt,
      expiresAt: sd.expiresAt,
    };
  }

  async adminMoveSession(
    storeId: string,
    fromTableId: string,
    targetTableId: string,
  ): Promise<TableSessionInfo> {
    // 1. from 테이블의 활성 세션 확인
    const fromKey = REDIS_KEYS.tableSession.key(storeId, fromTableId);
    const activeSessionToken = await this.redis.get(fromKey);
    if (!activeSessionToken) {
      throw new NotFoundException('이 테이블에 활성 세션이 없습니다.');
    }

    const sessionKey = this.getSessionKey(storeId, activeSessionToken);
    const data = await this.redis.get(sessionKey);
    if (!data) {
      await this.redis.del(fromKey);
      throw new NotFoundException('세션 데이터가 존재하지 않습니다.');
    }
    const sessionData: SessionData = JSON.parse(data);

    // 2. target 테이블 정보 조회
    const targetTable = await this.tableService.findOne(targetTableId);
    if (!targetTable) {
      throw new NotFoundException('이동 대상 테이블을 찾을 수 없습니다.');
    }

    // 3. target에 이미 세션 있으면 차단
    const toKey = REDIS_KEYS.tableSession.key(storeId, targetTableId);
    const existingTarget = await this.redis.get(toKey);
    if (existingTarget) {
      throw new ConflictException('이동 대상 테이블에 이미 활성 세션이 있습니다.');
    }

    // 4. 수용인원 검증
    if (targetTable.capacity < sessionData.joinedCount) {
      throw new BadRequestException(
        `대상 테이블 수용인원(${targetTable.capacity}명)이 현재 인원(${sessionData.joinedCount}명)보다 적습니다.`,
      );
    }

    // 5. Redis 키 이동
    const remainingTtl = await this.redis.ttl(sessionKey);
    const ttlToUse = remainingTtl > 0 ? remainingTtl : this.ttl;

    sessionData.tableId = targetTable.id;
    sessionData.tableNumber = targetTable.tableNumber;
    sessionData.tableName = targetTable.name;
    sessionData.capacity = targetTable.capacity;

    await Promise.all([
      this.redis.del(fromKey),
      this.redis.setex(toKey, ttlToUse, activeSessionToken),
      this.redis.setex(sessionKey, ttlToUse, JSON.stringify(sessionData)),
    ]);

    return {
      sessionToken: sessionData.sessionToken,
      pin: sessionData.pin,
      joinedCount: sessionData.joinedCount,
      capacity: sessionData.capacity,
      tableId: sessionData.tableId,
      tableName: sessionData.tableName,
      tableNumber: sessionData.tableNumber,
      createdAt: sessionData.createdAt,
      expiresAt: sessionData.expiresAt,
    };
  }

  async forceDeleteTableSession(
    storeId: string,
    tableId: string,
  ): Promise<ForceDeleteSessionResponse> {
    const tableSessionKey = REDIS_KEYS.tableSession.key(storeId, tableId);
    const activeSessionToken = await this.redis.get(tableSessionKey);
    if (!activeSessionToken) {
      throw new NotFoundException('이 테이블에 활성 세션이 없습니다.');
    }

    // 세션 관련 Redis 키 전체 삭제
    await Promise.all([
      this.redis.del(this.getSessionKey(storeId, activeSessionToken)),
      this.redis.del(REDIS_KEYS.sessionLookup.key(activeSessionToken)),
      this.redis.del(REDIS_KEYS.cart.key(storeId, activeSessionToken)),
      this.redis.del(tableSessionKey),
    ]);

    return { deleted: true, sessionToken: activeSessionToken };
  }
}
