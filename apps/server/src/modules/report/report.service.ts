import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import { StoreEntity } from '../store/entities/store.entity';
import { OrderStatus } from '@qr-order/shared-types';
import { OverallReportSummary, StoreReportSummary, ReportQueryDto } from '@qr-order/shared-types';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(StoreEntity)
    private readonly storeRepository: Repository<StoreEntity>,
  ) {}

  private buildDateRange(query: ReportQueryDto): { start: Date; end: Date } {
    const end = query.endDate ? new Date(query.endDate) : new Date();
    const start = query.startDate
      ? new Date(query.startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 기본 30일
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  async getOverallSummary(query: ReportQueryDto): Promise<OverallReportSummary> {
    const { start, end } = this.buildDateRange(query);
    const stores = await this.storeRepository.find({ order: { createdAt: 'ASC' } });

    const storeSummaries: StoreReportSummary[] = await Promise.all(
      stores.map((store) => this.getStoreSummary(store.id, query, store.name)),
    );

    const totalOrders = storeSummaries.reduce((sum, s) => sum + s.totalOrders, 0);
    const totalRevenue = storeSummaries.reduce((sum, s) => sum + s.totalRevenue, 0);

    return {
      totalStores: stores.length,
      totalOrders,
      totalRevenue,
      stores: storeSummaries,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    };
  }

  async getStoreSummary(
    storeId: string,
    query: ReportQueryDto,
    storeName?: string,
  ): Promise<StoreReportSummary> {
    const { start, end } = this.buildDateRange(query);

    const orders = await this.orderRepository.find({
      where: {
        storeId,
        createdAt: Between(start, end),
      },
      select: ['id', 'status', 'totalAmount'],
    });

    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingOrders = orders.filter((o) =>
      [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING].includes(o.status),
    ).length;
    const completedOrders = orders.filter((o) => o.status === OrderStatus.SERVED).length;
    const cancelledOrders = orders.filter((o) => o.status === OrderStatus.CANCELLED).length;

    // storeName이 주어지지 않으면 DB에서 조회
    let name = storeName;
    if (!name) {
      const store = await this.storeRepository.findOne({ where: { id: storeId } });
      name = store?.name ?? storeId;
    }

    return {
      storeId,
      storeName: name,
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
    };
  }
}
