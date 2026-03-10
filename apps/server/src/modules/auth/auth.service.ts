import {
  Injectable,
  ConflictException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AdminEntity } from './entities/admin.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { JwtPayload } from '@qr-order/shared-types';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(AdminEntity)
    private readonly adminRepository: Repository<AdminEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // 서버 시작 시 어드민 계정이 없으면 환경변수로 초기 SUPER_ADMIN 자동 생성
  async onModuleInit(): Promise<void> {
    const count = await this.adminRepository.count();
    if (count > 0) return;

    const username = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const plainPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin1234');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    await this.adminRepository.save(
      this.adminRepository.create({
        username,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        storeId: null,
      }),
    );
  }

  async validateUser(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string; role: string; storeId: string | null } | null> {
    const admin = await this.adminRepository.findOne({
      where: { username, isActive: true },
    });
    if (!admin) return null;

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return null;

    return { id: admin.id, username: admin.username, role: admin.role, storeId: admin.storeId };
  }

  login(user: {
    id: string;
    username: string;
    role: string;
    storeId: string | null;
  }): { accessToken: string } {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role as JwtPayload['role'],
      storeId: user.storeId ?? undefined,
    };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async findAllAdmins(): Promise<Omit<AdminEntity, 'password'>[]> {
    const admins = await this.adminRepository.find({ order: { createdAt: 'ASC' } });
    return admins.map(({ password: _pw, ...rest }) => rest);
  }

  async createAdmin(dto: CreateAdminDto): Promise<Omit<AdminEntity, 'password'>> {
    if (dto.role === 'STORE_ADMIN' && !dto.storeId) {
      throw new BadRequestException('STORE_ADMIN은 storeId가 필요합니다.');
    }

    const existing = await this.adminRepository.findOne({ where: { username: dto.username } });
    if (existing) {
      throw new ConflictException(`사용자명 '${dto.username}'은 이미 사용 중입니다.`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const admin = this.adminRepository.create({
      ...dto,
      password: hashedPassword,
      storeId: dto.storeId ?? null,
    });
    const saved = await this.adminRepository.save(admin);
    const { password: _pw, ...result } = saved;
    return result;
  }
}
