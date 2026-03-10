import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Order } from '../order/entities/order.entity';
import { StoreEntity } from '../store/entities/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, StoreEntity])],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
