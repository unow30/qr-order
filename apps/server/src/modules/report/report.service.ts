import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import { OrderItem } from '../order/entities/order-item.entity';
import { StoreEntity } from '../store/entities/store.entity';
import { OrderStatus } from '@qr-order/shared-types';
import { OverallReportSummary, StoreReportSummary, ReportQueryDto } from '@qr-order/shared-types';

export interface MenuItemStat {
  menuItemId: string;
  menuItemName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export interface MenuAnalyticsResult {
  storeId: string;
  periodStart: string;
  periodEnd: string;
  topItems: MenuItemStat[];      // 판매량 TOP 10
  topRevenueItems: MenuItemStat[]; // 매출 TOP 10
}

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
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

  /**
   * F12: 메뉴 아이템별 판매 분석
   * 취소되지 않은 주문의 아이템만 집계
   */
  async getMenuAnalytics(storeId: string, query: ReportQueryDto): Promise<MenuAnalyticsResult> {
    const { start, end } = this.buildDateRange(query);

    // 해당 기간 취소되지 않은 주문 ID 조회
    const orders = await this.orderRepository.find({
      where: { storeId, createdAt: Between(start, end) },
      select: ['id', 'status'],
    });
    const validOrderIds = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .map((o) => o.id);

    if (!validOrderIds.length) {
      return {
        storeId,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        topItems: [],
        topRevenueItems: [],
      };
    }

    // 해당 주문들의 아이템 조회
    const items = await this.orderItemRepository
      .createQueryBuilder('item')
      .where('item.orderId IN (:...orderIds)', { orderIds: validOrderIds })
      .getMany();

    // menuItemId 기준으로 집계
    const statsMap = new Map<string, MenuItemStat>();
    for (const item of items) {
      const existing = statsMap.get(item.menuItemId);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.totalPrice;
        existing.orderCount += 1;
      } else {
        statsMap.set(item.menuItemId, {
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          totalQuantity: item.quantity,
          totalRevenue: item.totalPrice,
          orderCount: 1,
        });
      }
    }

    const allStats = Array.from(statsMap.values());

    // 판매량 TOP 10
    const topItems = [...allStats]
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    // 매출 TOP 10
    const topRevenueItems = [...allStats]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return {
      storeId,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      topItems,
      topRevenueItems,
    };
  }
}
