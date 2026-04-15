import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from '@server/modules/order/order.controller';
import { OrderService } from '@server/modules/order/order.service';
import { OrderSseService } from '@server/modules/order/order-sse.service';
import { Order } from '@server/modules/order/entities/order.entity';
import { OrderItem } from '@server/modules/order/entities/order-item.entity';
import { PaymentEntity } from '@server/modules/payment/entities/payment.entity';
import { CartModule } from '@server/modules/cart/cart.module';
import { SessionModule } from '@server/modules/session/session.module';
import { CouponModule } from '@server/modules/coupon/coupon.module';
import { MenuModule } from '@server/modules/menu/menu.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, PaymentEntity]),
    forwardRef(() => CartModule),
    forwardRef(() => SessionModule),
    CouponModule,
    MenuModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderSseService],
  exports: [OrderService],
})
export class OrderModule {}
