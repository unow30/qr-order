import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { getRedisClient, REDIS_CLIENT } from './config/redis.config';
import { AuthModule } from './modules/auth/auth.module';
import { TableModule } from './modules/table/table.module';
import { MenuModule } from './modules/menu/menu.module';
import { SessionModule } from './modules/session/session.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    AuthModule,
    TableModule,
    MenuModule,
    SessionModule,
    CartModule,
    OrderModule,
    PaymentModule,
  ],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: getRedisClient,
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class AppModule {}
