import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RlsInitService } from './rls-init.service';
import { RlsInterceptor } from './rls.interceptor';

@Module({
  providers: [
    RlsInitService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RlsInterceptor,
    },
  ],
})
export class RlsModule {}
