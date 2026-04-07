/**
 * TypeORM CLI 전용 DataSource.
 *
 * 용도:
 *   - `typeorm migration:generate` (엔티티 변경사항 자동 감지하여 마이그레이션 생성)
 *   - `typeorm migration:create`   (빈 마이그레이션 파일 생성)
 *   - `typeorm migration:run`      (마이그레이션 적용)
 *   - `typeorm migration:revert`   (마이그레이션 롤백)
 *
 * 런타임에는 `app.module.ts` → `database.config.ts`가 사용된다.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

// NODE_ENV에 따라 적절한 .env 파일 로드
const envFile =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const sslEnabled = process.env.DATABASE_SSL === 'true';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  entities: [path.join(__dirname, '/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '/database/migrations/*{.ts,.js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
});
