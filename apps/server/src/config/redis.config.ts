import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

let redisClient: Redis | null = null;

export const getRedisClient = (configService: ConfigService): Redis => {
  if (!redisClient) {
    redisClient = new Redis({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6380),
      password: configService.get<string>('REDIS_PASSWORD'),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }
  return redisClient;
};

export const REDIS_CLIENT = 'REDIS_CLIENT';
