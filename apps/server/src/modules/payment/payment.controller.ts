import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, ConfirmPaymentDto, WebhookPaymentDto } from '@qr-order/shared-types';

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
}
