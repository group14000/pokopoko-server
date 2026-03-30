import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConversationItemDto } from './dto/get-conversations-response.dto';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
@UseGuards(ClerkAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async getConversations(
    @CurrentUser() auth: { userId?: string | null },
  ): Promise<ConversationItemDto[]> {
    return this.conversationsService.getConversations(auth.userId);
  }
}
