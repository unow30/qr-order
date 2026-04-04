import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

let redisClient: Redis | null = null;

export const getRedisClient = (configService: ConfigService): Redis => {
  if (!redisClient) {
    const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
    const useTls = configService.get<string>('REDIS_TLS', 'false') === 'true';

    redisClient = new Redis({
      host: redisHost,
      port: configService.get<number>('REDIS_PORT', 6380),
      password: configService.get<string>('REDIS_PASSWORD'),
      tls: useTls ? {} : undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }
  return redisClient;
};

export const REDIS_CLIENT = 'REDIS_CLIENT';
