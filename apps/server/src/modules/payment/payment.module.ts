import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentEntity } from './entities/payment.entity';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity]), OrderModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
