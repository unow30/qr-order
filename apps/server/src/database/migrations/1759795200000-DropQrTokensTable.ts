import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * qr_tokens 테이블 제거 및 tables.qrToken 컬럼 추가
 *
 * 변경:
 *   - tables 테이블에 qrToken (uuid, unique, not null) 컬럼 추가
 *   - 기존 qr_tokens 테이블의 최신 토큰을 tables.qrToken으로 백필
 *   - 백필 불가능한 행은 새 uuid 할당
 *   - qr_tokens 테이블 삭제
 *
 * 사유: QR 토큰을 테이블당 1개 고정값으로 단순화. 만료/재발급 개념 제거.
 */
export class DropQrTokensTable1759795200000 implements MigrationInterface {
  name = 'DropQrTokensTable1759795200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. tables 에 qrToken 컬럼 추가 (nullable)
    await queryRunner.query(`
      ALTER TABLE "tables"
      ADD COLUMN IF NOT EXISTS "qrToken" uuid
    `);

    // 2. 기존 qr_tokens 가 있으면 최신 토큰을 백필
    const qrTokensExists = await queryRunner.query(`
      SELECT to_regclass('public.qr_tokens') AS exists
    `);
    if (qrTokensExists[0]?.exists) {
      await queryRunner.query(`
        UPDATE "tables" t
        SET "qrToken" = sub.token::uuid
        FROM (
          SELECT DISTINCT ON ("tableId") "tableId", "token"
          FROM "qr_tokens"
          ORDER BY "tableId", "createdAt" DESC
        ) sub
        WHERE t."id" = sub."tableId"
          AND t."qrToken" IS NULL
      `);
    }

    // 3. 백필 안 된 행에 새 uuid 할당
    await queryRunner.query(`
      UPDATE "tables"
      SET "qrToken" = gen_random_uuid()
      WHERE "qrToken" IS NULL
    `);

    // 4. NOT NULL 제약 추가
    await queryRunner.query(`
      ALTER TABLE "tables"
      ALTER COLUMN "qrToken" SET NOT NULL
    `);

    // 5. UNIQUE 인덱스 추가
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tables_qrToken"
      ON "tables" ("qrToken")
    `);

    // 6. qr_tokens 테이블 삭제
    await queryRunner.query(`DROP TABLE IF EXISTS "qr_tokens"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // qr_tokens 테이블 재생성 (기존 토큰 값은 tables.qrToken에서 복원)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "qr_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tableId" uuid NOT NULL,
        "token" varchar NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_qr_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_qr_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_qr_tokens_table" FOREIGN KEY ("tableId")
          REFERENCES "tables"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO "qr_tokens" ("tableId", "token", "expiresAt")
      SELECT "id", "qrToken"::text, now() + interval '1 year'
      FROM "tables"
      WHERE "qrToken" IS NOT NULL
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_tables_qrToken"`);
    await queryRunner.query(`ALTER TABLE "tables" DROP COLUMN IF EXISTS "qrToken"`);
  }
}
