import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TableController } from '@server/modules/table/table.controller';
import { TableService } from '@server/modules/table/table.service';
import { TableEntity } from '@server/modules/table/entities/table.entity';
import { QrToken } from '@server/modules/table/entities/qr-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TableEntity, QrToken]), ConfigModule],
  controllers: [TableController],
  providers: [TableService],
  exports: [TableService],
})
export class TableModule {}
