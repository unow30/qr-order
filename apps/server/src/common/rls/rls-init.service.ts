import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * F8: PostgreSQL Row-Level Security
 *
 * 앱 레벨(storeId 필터)의 2차 보안막으로 DB 레벨 격리를 추가합니다.
 * `app.store_id` 세션 변수를 기준으로 각 테이블의 행 접근을 제어합니다.
 *
 * 정책 규칙:
 *   - SUPER_ADMIN / SUPER_ADMIN_READONLY 역할 → 모든 행 접근 허용
 *   - 그 외 → store_id 컬럼 값이 `app.store_id` 세션 변수와 일치하는 행만 접근 허용
 *   - `app.store_id`가 비어 있으면 접근 차단 (공개 엔드포인트는 RLS 미적용 테이블 사용)
 */
const PROTECTED_TABLES = [
  'menu_categories',
  'orders',
  'tables',
];

@Injectable()
export class RlsInitService implements OnModuleInit {
  private readonly logger = new Logger(RlsInitService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      await this.setupRls();
    } catch (err) {
      this.logger.error('RLS 초기화 중 오류 발생 (서버 시작은 계속됩니다)', err);
    }
  }

  private async setupRls() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      for (const table of PROTECTED_TABLES) {
        // 테이블 존재 여부 확인
        const exists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
          )
        `, [table]);

        if (!exists[0].exists) {
          this.logger.warn(`테이블 '${table}'이 존재하지 않아 RLS 설정을 건너뜁니다.`);
          continue;
        }

        // RLS 활성화
        await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);

        // 기존 정책 삭제 후 재생성 (idempotent)
        await queryRunner.query(`DROP POLICY IF EXISTS "store_isolation" ON "${table}"`);

        // 정책 생성: SUPER_ADMIN(또는 READONLY)이거나 store_id가 일치하는 행만 접근
        await queryRunner.query(`
          CREATE POLICY "store_isolation" ON "${table}"
          USING (
            current_setting('app.role', true) IN ('SUPER_ADMIN', 'SUPER_ADMIN_READONLY')
            OR "storeId" = NULLIF(current_setting('app.store_id', true), '')
          )
        `);

        this.logger.log(`RLS 정책 적용 완료: ${table}`);
      }

      this.logger.log(`RLS 초기화 완료 (보호 테이블: ${PROTECTED_TABLES.join(', ')})`);
    } finally {
      await queryRunner.release();
    }
  }
}
