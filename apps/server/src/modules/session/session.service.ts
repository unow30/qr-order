import { Injectable, Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../../config/redis.config';
import { TableService } from '../table/table.service';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { CreateSessionDto, SessionResponse } from '@qr-order/shared-types';

const SESSION_PREFIX = 'session:';

export interface SessionData {
  sessionToken: string;
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

  async createSession(dto: CreateSessionDto): Promise<SessionResponse> {
    const table = await this.tableService.validateQrToken(dto.qrToken);
    if (!table) {
      throw new BadRequestException('유효하지 않거나 만료된 QR 코드입니다.');
    }

    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + this.ttl * 1000).toISOString();

    const sessionData: SessionData = {
      sessionToken,
      tableId: table.id,
      tableNumber: table.tableNumber,
      tableName: table.name,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    await this.redis.setex(
      `${SESSION_PREFIX}${sessionToken}`,
      this.ttl,
      JSON.stringify(sessionData),
    );

    return {
      sessionToken,
      tableId: table.id,
      tableNumber: table.tableNumber,
      tableName: table.name,
      expiresAt,
    };
  }

  async validateSession(sessionToken: string): Promise<SessionData> {
    const data = await this.redis.get(`${SESSION_PREFIX}${sessionToken}`);
    if (!data) {
      throw new UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
    }
    return JSON.parse(data);
  }

  async renewSession(sessionToken: string): Promise<void> {
    const data = await this.redis.get(`${SESSION_PREFIX}${sessionToken}`);
    if (data) {
      await this.redis.expire(`${SESSION_PREFIX}${sessionToken}`, this.ttl);
    }
  }

  async deleteSession(sessionToken: string): Promise<void> {
    await this.redis.del(`${SESSION_PREFIX}${sessionToken}`);
  }
}
