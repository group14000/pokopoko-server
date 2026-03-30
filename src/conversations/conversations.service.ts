import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationItemDto } from './dto/get-conversations-response.dto';

@Injectable()
export class ConversationsService {
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

  async getConversations(
    clerkUserId: string | null | undefined,
  ): Promise<ConversationItemDto[]> {
    const me = await this.resolveAuthenticatedUser(clerkUserId);

    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ userAId: me.id }, { userBId: me.id }],
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        userAId: true,
        userA: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        lastMessage: {
          select: {
            content: true,
            timestamp: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                receiverId: me.id,
                readAt: null,
              },
            },
          },
        },
        updatedAt: true,
      },
    });

    return conversations
      .filter((conversation) => Boolean(conversation.lastMessage))
      .map((conversation) => {
        const otherUser =
          conversation.userAId === me.id
            ? conversation.userB
            : conversation.userA;

        return {
          conversationId: conversation.id,
          otherUser,
          lastMessage: {
            message: conversation.lastMessage!.content,
            timestamp: conversation.lastMessage!.timestamp,
          },
          updatedAt: conversation.updatedAt,
          unreadCount: conversation._count.messages,
        };
      });
  }
}
