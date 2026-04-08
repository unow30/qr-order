import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * menu_option_groups, menu_options 테이블에 sort_order 컬럼 추가
 *
 * 정렬 우선순위: sortOrder ASC → createdAt ASC → id ASC
 */
export class AddSortOrderToOptions1760000000000 implements MigrationInterface {
  name = 'AddSortOrderToOptions1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "menu_option_groups"
      ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "menu_options"
      ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "menu_options" DROP COLUMN IF EXISTS "sortOrder"`);
    await queryRunner.query(`ALTER TABLE "menu_option_groups" DROP COLUMN IF EXISTS "sortOrder"`);
  }
}
