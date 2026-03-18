import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from '@server/modules/report/report.controller';
import { ReportService } from '@server/modules/report/report.service';
import { Order } from '@server/modules/order/entities/order.entity';
import { OrderItem } from '@server/modules/order/entities/order-item.entity';
import { StoreEntity } from '@server/modules/store/entities/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, StoreEntity])],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
