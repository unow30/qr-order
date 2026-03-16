import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TableEntity } from './entities/table.entity';
import { QrToken } from './entities/qr-token.entity';
import { CreateTableDto } from './dto/create-table.dto';

@Injectable()
export class TableService {
  constructor(
    @InjectRepository(TableEntity)
    private readonly tableRepository: Repository<TableEntity>,
    @InjectRepository(QrToken)
    private readonly qrTokenRepository: Repository<QrToken>,
  ) {}

  async findAll(storeId: string | null): Promise<TableEntity[]> {
    return this.tableRepository.find({
      where: storeId ? { storeId } : {},
      order: { tableNumber: 'ASC' },
    });
  }

  async findAllWithTokens(
    storeId: string | null,
  ): Promise<{ table: TableEntity; token: string | null; isActive: boolean }[]> {
    const tables = await this.tableRepository.find({
      where: storeId ? { storeId } : undefined,
      order: { tableNumber: 'ASC' },
      relations: ['qrTokens'],
    });
    return tables.map((table) => {
      const latestToken = table.qrTokens
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      return { table, token: latestToken?.token ?? null, isActive: table.isActive };
    });
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

  async generateQrToken(tableId: string): Promise<QrToken> {
    const table = await this.findOne(tableId);

    // 기존 토큰 무효화
    await this.qrTokenRepository.delete({ tableId });

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1년 유효

    const qrToken = this.qrTokenRepository.create({
      tableId: table.id,
      token: uuidv4(),
      expiresAt,
    });

    return this.qrTokenRepository.save(qrToken);
  }

  async getQrToken(tableId: string): Promise<QrToken | null> {
    return this.qrTokenRepository.findOne({
      where: { tableId },
      order: { createdAt: 'DESC' },
    });
  }

  async validateQrToken(token: string): Promise<TableEntity | null> {
    const qrToken = await this.qrTokenRepository.findOne({
      where: { token },
      relations: ['table'],
    });

    if (!qrToken || qrToken.expiresAt < new Date()) {
      return null;
    }

    return qrToken.table;
  }
}
