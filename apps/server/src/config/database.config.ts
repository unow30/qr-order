import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TypeOrmQueryLogger } from '@server/common/logging/collect/typeorm-query-logger';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST', 'localhost'),
  port: configService.get<number>('DATABASE_PORT', 5432),
  username: configService.get<string>('DATABASE_USER', 'qrorder'),
  password: configService.get<string>('DATABASE_PASSWORD', 'qrorder_password'),
  database: configService.get<string>('DATABASE_NAME', 'qrorder_db'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize:
    configService.get<string>('NODE_ENV') !== 'production' ||
    configService.get<string>('TYPEORM_SYNC') === 'true',
  logger: new TypeOrmQueryLogger(),
  maxQueryExecutionTime: parseInt(configService.get<string>('LOG_SLOW_QUERY_MS', '2000'), 10),
  autoLoadEntities: true,
});
