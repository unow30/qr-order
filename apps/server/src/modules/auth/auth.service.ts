import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string): Promise<{ username: string } | null> {
    const adminUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin1234');

    if (username !== adminUsername) {
      return null;
    }

    // 개발 환경: 평문 비교 / 프로덕션: bcrypt 비교
    const isMatch = adminPassword.startsWith('$2b$')
      ? await bcrypt.compare(password, adminPassword)
      : password === adminPassword;

    if (!isMatch) {
      return null;
    }

    return { username };
  }

  login(user: { username: string }): { accessToken: string } {
    const payload = { sub: user.username, username: user.username };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
