import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetMessagesParamsDto } from './dto/get-messages-params.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { GetMessagesResponseDto } from './dto/get-messages-response.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(ClerkAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':userId')
  async getMessages(
    @CurrentUser() auth: { userId?: string | null },
    @Param() params: GetMessagesParamsDto,
    @Query() query: GetMessagesQueryDto,
  ): Promise<GetMessagesResponseDto> {
    return this.messagesService.getConversationMessages(
      auth.userId,
      params.userId,
      query,
    );
  }
}
