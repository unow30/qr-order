import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RlsInitService } from '@server/common/rls/rls-init.service';
import { RlsInterceptor } from '@server/common/rls/rls.interceptor';

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
