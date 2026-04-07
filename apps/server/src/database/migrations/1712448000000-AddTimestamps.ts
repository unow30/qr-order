import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 누락된 createdAt/updatedAt 컬럼 추가
 *
 * 대상:
 *   - menu_option_groups (createdAt, updatedAt)
 *   - menu_options       (createdAt, updatedAt)
 *   - review_images      (updatedAt)
 *
 * 사유: 엔티티에 @CreateDateColumn / @UpdateDateColumn 추가했으나
 *       프로덕션은 synchronize=false 라서 수동 적용 필요.
 */
export class AddTimestamps1712448000000 implements MigrationInterface {
  name = 'AddTimestamps1712448000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // menu_option_groups
    await queryRunner.query(`
      ALTER TABLE "menu_option_groups"
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE "menu_option_groups"
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // menu_options
    await queryRunner.query(`
      ALTER TABLE "menu_options"
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE "menu_options"
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // review_images
    await queryRunner.query(`
      ALTER TABLE "review_images"
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "review_images" DROP COLUMN IF EXISTS "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "menu_options" DROP COLUMN IF EXISTS "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "menu_options" DROP COLUMN IF EXISTS "createdAt"`);
    await queryRunner.query(`ALTER TABLE "menu_option_groups" DROP COLUMN IF EXISTS "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "menu_option_groups" DROP COLUMN IF EXISTS "createdAt"`);
  }
}
