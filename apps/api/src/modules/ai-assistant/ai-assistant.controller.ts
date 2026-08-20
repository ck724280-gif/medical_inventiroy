import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsArray, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { AiAssistantService } from './ai-assistant.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  message: string;

  @IsOptional()
  @IsArray()
  history?: Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }>;
}

@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
export class AiAssistantController {
  constructor(private readonly aiService: AiAssistantService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatMessageDto, @CurrentUser() user: any) {
    const message = dto?.message || (dto as any)?.prompt || (dto as any)?.text || '';
    return this.aiService.processChat(message, dto?.history);
  }
}
