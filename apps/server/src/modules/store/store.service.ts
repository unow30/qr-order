import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreEntity } from './entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(StoreEntity)
    private readonly storeRepository: Repository<StoreEntity>,
  ) {}

  async findAll(): Promise<StoreEntity[]> {
    return this.storeRepository.find({ order: { createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<StoreEntity> {
    const store = await this.storeRepository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException(`매장 ID ${id}를 찾을 수 없습니다.`);
    }
    return store;
  }

  async findBySlug(slug: string): Promise<StoreEntity | null> {
    return this.storeRepository.findOne({ where: { slug, isActive: true } });
  }

  async create(dto: CreateStoreDto): Promise<StoreEntity> {
    const existing = await this.storeRepository.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`슬러그 '${dto.slug}'는 이미 사용 중입니다.`);
    }
    const store = this.storeRepository.create(dto);
    return this.storeRepository.save(store);
  }

  async update(id: string, dto: UpdateStoreDto): Promise<StoreEntity> {
    const store = await this.findOne(id);
    Object.assign(store, dto);
    return this.storeRepository.save(store);
  }

  async deactivate(id: string): Promise<void> {
    const store = await this.findOne(id);
    store.isActive = false;
    await this.storeRepository.save(store);
  }
}
