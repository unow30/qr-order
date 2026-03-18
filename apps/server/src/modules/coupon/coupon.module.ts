import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponController } from '@server/modules/coupon/coupon.controller';
import { CouponService } from '@server/modules/coupon/coupon.service';
import { CouponEntity } from '@server/modules/coupon/entities/coupon.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CouponEntity])],
  controllers: [CouponController],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}
