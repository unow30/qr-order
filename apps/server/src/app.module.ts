import { Module, Global, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@server/config/database.config';
import { getRedisClient, REDIS_CLIENT } from '@server/config/redis.config';
import { createRedisLoggerProxy } from '@server/common/logging/collect/redis-logger.proxy';
import { LoggingModule } from '@server/common/logging/logging.module';
import { AuthModule } from '@server/modules/auth/auth.module';
import { StoreModule } from '@server/modules/store/store.module';
import { TableModule } from '@server/modules/table/table.module';
import { MenuModule } from '@server/modules/menu/menu.module';
import { SessionModule } from '@server/modules/session/session.module';
import { CartModule } from '@server/modules/cart/cart.module';
import { OrderModule } from '@server/modules/order/order.module';
import { PaymentModule } from '@server/modules/payment/payment.module';
import { ReportModule } from '@server/modules/report/report.module';
import { CouponModule } from '@server/modules/coupon/coupon.module';
import { ReviewModule } from '@server/modules/review/review.module';
import { ImageModule } from '@server/modules/image/image.module';
import { RlsModule } from '@server/common/rls/rls.module';
import { HealthModule } from '@server/modules/health/health.module';
import { StoreContextMiddleware } from '@server/common/middleware/store-context.middleware';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.production', '.env', '.env.example'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    LoggingModule,  // LoggingInterceptor가 가장 바깥쪽에서 실행되도록 먼저 import
    AuthModule,
    StoreModule,
    TableModule,
    MenuModule,
    SessionModule,
    CartModule,
    OrderModule,
    PaymentModule,
    ReportModule,
    CouponModule,
    ReviewModule,
    ImageModule,
    RlsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const client = getRedisClient(configService);
        return createRedisLoggerProxy(client);
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(StoreContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
