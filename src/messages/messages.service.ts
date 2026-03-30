import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import {
  GetMessagesResponseDto,
  MessageItemDto,
} from './dto/get-messages-response.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveAuthenticatedUser(clerkUserId?: string | null) {
    if (!clerkUserId) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(
        'Authenticated user not found in local database. Sync users first.',
      );
    }

    return user;
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  async getConversationMessages(
    clerkUserId: string | null | undefined,
    otherUserId: string,
    query: GetMessagesQueryDto,
  ): Promise<GetMessagesResponseDto> {
    const me = await this.resolveAuthenticatedUser(clerkUserId);
    await this.ensureUserExists(otherUserId);

    const conversationWhere = {
      OR: [
        { senderId: me.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: me.id },
      ],
    };

    if (query.cursor) {
      const cursorMessage = await this.prisma.message.findFirst({
        where: {
          id: query.cursor,
          ...conversationWhere,
        },
        select: { id: true },
      });

      if (!cursorMessage) {
        throw new BadRequestException('Invalid cursor for this conversation');
      }
    }

    const normalizedLimit = query.limit ?? 20;
    const take = normalizedLimit + 1;

    const messages = await this.prisma.message.findMany({
      where: conversationWhere,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
      take,
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        timestamp: true,
        readAt: true,
      },
    });

    let nextCursor: string | null = null;
    if (messages.length > normalizedLimit) {
      nextCursor = messages[normalizedLimit].id;
      messages.pop();
    }

    const responseMessages: MessageItemDto[] = messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      message: message.content,
      timestamp: message.timestamp,
      readAt: message.readAt,
    }));

    return {
      messages: responseMessages,
      nextCursor,
    };
  }

  async markConversationAsRead(
    clerkUserId: string | null | undefined,
    otherUserId: string,
  ): Promise<{ markedCount: number }> {
    const me = await this.resolveAuthenticatedUser(clerkUserId);
    await this.ensureUserExists(otherUserId);

    const updated = await this.prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: me.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return {
      markedCount: updated.count,
    };
  }
}
