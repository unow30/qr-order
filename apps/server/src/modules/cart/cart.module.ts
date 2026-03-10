import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { SessionModule } from '../session/session.module';
import { MenuItem } from '../menu/entities/menu-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem]), SessionModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
