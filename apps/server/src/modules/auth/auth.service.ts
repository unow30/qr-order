import {
  Injectable,
  ConflictException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AdminEntity } from '@server/modules/auth/entities/admin.entity';
import { StoreEntity } from '@server/modules/store/entities/store.entity';
import { CreateAdminDto } from '@server/modules/auth/dto/create-admin.dto';
import { JwtPayload } from '@qr-order/shared-types';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(AdminEntity)
    private readonly adminRepository: Repository<AdminEntity>,
    @InjectRepository(StoreEntity)
    private readonly storeRepository: Repository<StoreEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // 서버 시작 시 어드민 계정이 없으면 환경변수로 초기 SUPER_ADMIN 자동 생성
  // 추가로 SUPER_ADMIN_READONLY 시드 계정도 보장
  async onModuleInit(): Promise<void> {
    const count = await this.adminRepository.count();
    if (count === 0) {
      const username = this.configService.get<string>('ADMIN_USERNAME', 'admin');
      const plainPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin1234');
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      await this.adminRepository.save(
        this.adminRepository.create({
          username,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          stores: [],
        }),
      );
    }

    // SUPER_ADMIN_READONLY 시드 (username 기준 upsert)
    const readonlyExists = await this.adminRepository.findOne({
      where: { username: 'admin_readonly' },
    });
    if (!readonlyExists) {
      const hashed = await bcrypt.hash('admin_readonly', 10);
      await this.adminRepository.save(
        this.adminRepository.create({
          username: 'admin_readonly',
          password: hashed,
          role: 'SUPER_ADMIN_READONLY',
          stores: [],
        }),
      );
    }
  }

  async validateUser(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string; role: string; stores: StoreEntity[] } | null> {
    const admin = await this.adminRepository.findOne({
      where: { username, isActive: true },
      relations: ['stores'],
    });
    if (!admin) return null;

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return null;

    return { id: admin.id, username: admin.username, role: admin.role, stores: admin.stores ?? [] };
  }

  login(user: {
    id: string;
    username: string;
    role: string;
    stores: StoreEntity[];
  }): { accessToken: string } {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role as JwtPayload['role'],
      storeIds: user.stores?.map((s) => s.id) ?? [],
    };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async findAllAdmins(): Promise<Omit<AdminEntity, 'password'>[]> {
    const admins = await this.adminRepository.find({
      relations: ['stores'],
      order: { createdAt: 'ASC' },
    });
    return admins.map(({ password: _pw, ...rest }) => rest);
  }

  async createAdmin(dto: CreateAdminDto): Promise<Omit<AdminEntity, 'password'>> {
    if (dto.role === 'STORE_ADMIN' && (!dto.storeIds || dto.storeIds.length === 0)) {
      throw new BadRequestException('STORE_ADMIN은 storeIds가 필요합니다.');
    }

    const existing = await this.adminRepository.findOne({ where: { username: dto.username } });
    if (existing) {
      throw new ConflictException(`사용자명 '${dto.username}'은 이미 사용 중입니다.`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const admin = this.adminRepository.create({
      username: dto.username,
      password: hashedPassword,
      role: dto.role,
    });

    if (dto.role === 'STORE_ADMIN' && dto.storeIds?.length) {
      admin.stores = await this.storeRepository.findBy({ id: In(dto.storeIds) });
    } else {
      admin.stores = [];
    }

    const saved = await this.adminRepository.save(admin);
    const { password: _pw, ...result } = saved;
    return result;
  }
}
