import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from '@server/modules/cart/cart.controller';
import { CartService } from '@server/modules/cart/cart.service';
import { SessionModule } from '@server/modules/session/session.module';
import { MenuItem } from '@server/modules/menu/entities/menu-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem]), SessionModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
