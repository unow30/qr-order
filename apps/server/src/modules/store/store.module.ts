import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreController } from '@server/modules/store/store.controller';
import { StoreService } from '@server/modules/store/store.service';
import { StoreEntity } from '@server/modules/store/entities/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StoreEntity])],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
