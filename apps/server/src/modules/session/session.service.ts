import { Injectable, Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../../config/redis.config';
import { TableService } from '../table/table.service';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { CreateSessionDto, SessionResponse } from '@qr-order/shared-types';

const SESSION_PREFIX = 'session:';
const SESSION_LOOKUP_PREFIX = 'session-lookup:';

export interface SessionData {
  sessionToken: string;
  storeId: string;
  tableId: string;
  tableNumber: number;
  tableName: string;
  createdAt: string;
  expiresAt: string;
}

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
    return `${SESSION_PREFIX}${storeId}:${sessionToken}`;
  }

  async createSession(dto: CreateSessionDto): Promise<SessionResponse> {
    const table = await this.tableService.validateQrToken(dto.qrToken);
    if (!table) {
      throw new BadRequestException('유효하지 않거나 만료된 QR 코드입니다.');
    }

    const storeId = table.storeId;
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + this.ttl * 1000).toISOString();

    const sessionData: SessionData = {
      sessionToken,
      storeId,
      tableId: table.id,
      tableNumber: table.tableNumber,
      tableName: table.name,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    const sessionKey = this.getSessionKey(storeId, sessionToken);
    const lookupKey = `${SESSION_LOOKUP_PREFIX}${sessionToken}`;

    await Promise.all([
      this.redis.setex(sessionKey, this.ttl, JSON.stringify(sessionData)),
      // storeId 역조회용 보조 키 (세션과 동일한 TTL)
      this.redis.setex(lookupKey, this.ttl, storeId),
    ]);

    return {
      sessionToken,
      tableId: table.id,
      tableNumber: table.tableNumber,
      tableName: table.name,
      expiresAt,
    };
  }

  async validateSession(sessionToken: string): Promise<SessionData> {
    const storeId = await this.redis.get(`${SESSION_LOOKUP_PREFIX}${sessionToken}`);
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
    const storeId = await this.redis.get(`${SESSION_LOOKUP_PREFIX}${sessionToken}`);
    if (!storeId) return;

    const sessionKey = this.getSessionKey(storeId, sessionToken);
    const lookupKey = `${SESSION_LOOKUP_PREFIX}${sessionToken}`;
    await Promise.all([
      this.redis.expire(sessionKey, this.ttl),
      this.redis.expire(lookupKey, this.ttl),
    ]);
  }

  async deleteSession(sessionToken: string): Promise<void> {
    const storeId = await this.redis.get(`${SESSION_LOOKUP_PREFIX}${sessionToken}`);
    if (!storeId) return;

    await Promise.all([
      this.redis.del(this.getSessionKey(storeId, sessionToken)),
      this.redis.del(`${SESSION_LOOKUP_PREFIX}${sessionToken}`),
    ]);
  }
}
