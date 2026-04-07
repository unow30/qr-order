import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableEntity } from '@server/modules/table/entities/table.entity';
import { CreateTableDto } from '@server/modules/table/dto/create-table.dto';

@Injectable()
export class TableService {
  constructor(
    @InjectRepository(TableEntity)
    private readonly tableRepository: Repository<TableEntity>,
  ) {}

  async findAll(storeId: string | null): Promise<TableEntity[]> {
    return this.tableRepository.find({
      where: storeId ? { storeId } : {},
      order: { tableNumber: 'ASC' },
    });
  }

  async findAllWithTokens(
    storeId: string | null,
  ): Promise<
    {
      table: TableEntity;
      token: string;
      isActive: boolean;
    }[]
  > {
    const tables = await this.tableRepository.find({
      where: storeId ? { storeId } : undefined,
      order: { tableNumber: 'ASC' },
    });
    return tables.map((table) => ({
      table,
      token: table.qrToken,
      isActive: table.isActive,
    }));
  }

  async findOne(id: string): Promise<TableEntity> {
    const table = await this.tableRepository.findOne({ where: { id } });
    if (!table) {
      throw new NotFoundException(`테이블 ID ${id}를 찾을 수 없습니다.`);
    }
    return table;
  }

  async create(storeId: string, dto: CreateTableDto): Promise<TableEntity> {
    const table = this.tableRepository.create({ ...dto, storeId });
    return this.tableRepository.save(table);
  }

  async remove(id: string): Promise<void> {
    const table = await this.findOne(id);
    await this.tableRepository.remove(table);
  }

  async validateQrToken(token: string): Promise<TableEntity | null> {
    if (!token) return null;
    return this.tableRepository.findOne({ where: { qrToken: token } });
  }
}
