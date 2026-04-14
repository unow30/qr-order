import { Module, forwardRef } from '@nestjs/common';
import { SessionController } from '@server/modules/session/session.controller';
import { SessionService } from '@server/modules/session/session.service';
import { TableModule } from '@server/modules/table/table.module';
import { StoreModule } from '@server/modules/store/store.module';
import { OrderModule } from '@server/modules/order/order.module';

@Module({
  imports: [TableModule, StoreModule, forwardRef(() => OrderModule)],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
