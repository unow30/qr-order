import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TableController } from './table.controller';
import { TableService } from './table.service';
import { TableEntity } from './entities/table.entity';
import { QrToken } from './entities/qr-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TableEntity, QrToken]), ConfigModule],
  controllers: [TableController],
  providers: [TableService],
  exports: [TableService],
})
export class TableModule {}
