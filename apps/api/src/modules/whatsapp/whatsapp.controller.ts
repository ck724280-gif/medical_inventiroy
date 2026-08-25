import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('status')
  async getStatus(@Query('branchId') branchId: string, @CurrentUser() user: any) {
    const activeBranchId = branchId || user?.branchId;
    return this.whatsappService.getSessionStatus(activeBranchId);
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async connectSession(@Body('branchId') branchId: string, @CurrentUser() user: any) {
    const activeBranchId = branchId || user?.branchId;
    return this.whatsappService.connectSession(activeBranchId);
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnectSession(@Body('branchId') branchId: string, @CurrentUser() user: any) {
    const activeBranchId = branchId || user?.branchId;
    return this.whatsappService.disconnectSession(activeBranchId);
  }

  @Post('send-message')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Body() body: { branchId?: string; recipientPhone: string; recipientName?: string; content: string; messageType?: any; customerId?: string },
    @CurrentUser() user: any,
  ) {
    const branchId = body.branchId || user?.branchId;
    return this.whatsappService.sendMessage({
      branchId,
      recipientPhone: body.recipientPhone,
      recipientName: body.recipientName,
      messageType: body.messageType || 'DIRECT_CHAT',
      content: body.content,
      customerId: body.customerId,
      sentByUserId: user?.id,
    });
  }

  @Post('send-bill/:invoiceId')
  @HttpCode(HttpStatus.OK)
  async sendBill(
    @Param('invoiceId') invoiceId: string,
    @Body('branchId') branchId: string,
    @Body('customNote') customNote: string,
    @CurrentUser() user: any,
  ) {
    const activeBranchId = branchId || user?.branchId;
    return this.whatsappService.sendBillInvoice(activeBranchId, invoiceId, customNote, user?.id);
  }

  @Post('send-reminder/:customerId')
  @HttpCode(HttpStatus.OK)
  async sendReminder(
    @Param('customerId') customerId: string,
    @Body('branchId') branchId: string,
    @Body('customNote') customNote: string,
    @CurrentUser() user: any,
  ) {
    const activeBranchId = branchId || user?.branchId;
    return this.whatsappService.sendDueReminder(activeBranchId, customerId, customNote, user?.id);
  }

  @Post('send-payment/:paymentId')
  @HttpCode(HttpStatus.OK)
  async sendPaymentReceipt(
    @Param('paymentId') paymentId: string,
    @Body('branchId') branchId: string,
    @Body('customNote') customNote: string,
    @CurrentUser() user: any,
  ) {
    const activeBranchId = branchId || user?.branchId;
    return this.whatsappService.sendPaymentConfirmation(activeBranchId, paymentId, customNote, user?.id);
  }


  @Get('conversations')
  async getConversations(@Query('branchId') branchId: string, @CurrentUser() user: any) {
    const activeBranchId = branchId || user?.branchId;
    return this.whatsappService.getConversations(activeBranchId);
  }

  @Get('conversation-messages')
  async getConversationMessages(
    @Query('phone') phone: string,
    @Query('branchId') branchId: string,
    @CurrentUser() user: any,
  ) {
    const activeBranchId = branchId || user?.branchId;
    return this.whatsappService.getConversationMessages(activeBranchId, phone);
  }

  @Get('logs')
  async getLogs(
    @Query('branchId') branchId?: string,
    @Query('messageType') messageType?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.whatsappService.getMessageLogs({
      branchId,
      messageType,
      status,
      search,
      page,
      limit,
    });
  }
}
