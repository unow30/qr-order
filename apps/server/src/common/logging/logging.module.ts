import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LogTransportService } from './flush/log-transport.service';
import { LogEventService } from './collect/log-event.service';
import { LoggingInterceptor } from './start/logging.interceptor';

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
