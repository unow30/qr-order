import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from '@server/modules/payment/payment.controller';
import { PaymentService } from '@server/modules/payment/payment.service';
import { PaymentEntity } from '@server/modules/payment/entities/payment.entity';
import { OrderModule } from '@server/modules/order/order.module';
import { SessionModule } from '@server/modules/session/session.module';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity]), OrderModule, SessionModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
