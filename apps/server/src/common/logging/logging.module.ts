import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LogTransportService } from '@server/common/logging/flush/log-transport.service';
import { LogEventService } from '@server/common/logging/collect/log-event.service';
import { LoggingInterceptor } from '@server/common/logging/start/logging.interceptor';

@Module({
  providers: [
    LogTransportService,
    LogEventService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [LogTransportService, LogEventService],
})
export class LoggingModule {}
