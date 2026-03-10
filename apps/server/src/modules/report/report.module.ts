import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Order } from '../order/entities/order.entity';
import { OrderItem } from '../order/entities/order-item.entity';
import { StoreEntity } from '../store/entities/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, StoreEntity])],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
