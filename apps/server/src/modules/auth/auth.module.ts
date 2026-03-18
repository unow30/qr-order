import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from '@server/modules/auth/auth.controller';
import { AdminsController } from '@server/modules/auth/admins.controller';
import { AuthService } from '@server/modules/auth/auth.service';
import { JwtStrategy } from '@server/modules/auth/strategies/jwt.strategy';
import { LocalStrategy } from '@server/modules/auth/strategies/local.strategy';
import { AdminEntity } from '@server/modules/auth/entities/admin.entity';
import { StoreEntity } from '@server/modules/store/entities/store.entity';
import { getJwtConfig } from '@server/config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminEntity, StoreEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getJwtConfig,
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, AdminsController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
