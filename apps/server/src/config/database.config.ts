import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { TypeOrmQueryLogger } from '@server/common/logging/collect/typeorm-query-logger';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const sslEnabled = configService.get<string>('DATABASE_SSL', 'false') === 'true';

  return {
    type: 'postgres',
    host: configService.get<string>('DATABASE_HOST', 'localhost'),
    port: configService.get<number>('DATABASE_PORT', 5432),
    username: configService.get<string>('DATABASE_USER', 'qrorder'),
    password: configService.get<string>('DATABASE_PASSWORD', 'qrorder_password'),
    database: configService.get<string>('DATABASE_NAME', 'qrorder_db'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    // 마이그레이션은 컴파일된 .js만 매칭 (런타임 전용)
    migrations: [path.join(__dirname, '/../database/migrations/*.js')],
    migrationsTableName: 'migrations',
    migrationsRun: true, // 앱 시작 시 적용되지 않은 마이그레이션 자동 실행
    synchronize:
      configService.get<string>('NODE_ENV') !== 'production' ||
      configService.get<string>('TYPEORM_SYNC') === 'true',
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    logger: new TypeOrmQueryLogger(),
    maxQueryExecutionTime: parseInt(configService.get<string>('LOG_SLOW_QUERY_MS', '2000'), 10),
    autoLoadEntities: true,
  };
};
