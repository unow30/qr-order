import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from '@server/modules/payment/payment.service';
import { JwtAuthGuard } from '@server/modules/auth/guards/jwt-auth.guard';
import { CurrentStoreId } from '@server/common/decorators/current-store-id.decorator';
import { CreatePaymentDto, ConfirmPaymentDto, WebhookPaymentDto, AdminProcessPaymentDto } from '@qr-order/shared-types';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: '결제 요청 (paymentId 반환)' })
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment(dto);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'PG 결제 검증' })
  confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentService.confirmPayment(dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PG 웹훅 콜백' })
  webhook(@Body() dto: WebhookPaymentDto) {
    return this.paymentService.handleWebhook(dto);
  }

  @Post('admin/process')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 현장 결제 처리' })
  processAdminPayment(
    @Body() dto: AdminProcessPaymentDto,
    @CurrentStoreId(false) storeId: string | null,
  ) {
    return this.paymentService.processAdminPayment(dto, storeId);
  }
}
