import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  async resolveLocalUserIdFromClerkId(clerkUserId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(
        'Authenticated user not found in local database. Sync users first.',
      );
    }

    return user.id;
  }

  registerOnlineUser(userId: string, socketId: string) {
    const sockets = this.onlineUsers.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.onlineUsers.set(userId, sockets);
  }

  unregisterOnlineUser(userId: string, socketId: string) {
    const sockets = this.onlineUsers.get(userId);
    if (!sockets) {
      return;
    }

    sockets.delete(socketId);
    if (!sockets.size) {
      this.onlineUsers.delete(userId);
    }
  }

  getOnlineSocketIds(userId: string): string[] {
    return Array.from(this.onlineUsers.get(userId) ?? []);
  }

  async saveMessage(senderId: string, payload: SendMessageDto) {
    if (!payload.message.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: payload.receiverId },
      select: { id: true },
    });

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    const [userAId, userBId] =
      senderId < payload.receiverId
        ? [senderId, payload.receiverId]
        : [payload.receiverId, senderId];

    const createdMessage = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.upsert({
        where: {
          userAId_userBId: {
            userAId,
            userBId,
          },
        },
        update: {},
        create: {
          userAId,
          userBId,
        },
        select: {
          id: true,
        },
      });

      const message = await tx.message.create({
        data: {
          senderId,
          receiverId: payload.receiverId,
          content: payload.message,
          timestamp: new Date(payload.timestamp),
          conversationId: conversation.id,
          readAt: null,
        },
        select: {
          id: true,
          senderId: true,
          receiverId: true,
          content: true,
          timestamp: true,
          readAt: true,
        },
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageId: message.id,
        },
      });

      return message;
    });

    return {
      id: createdMessage.id,
      senderId: createdMessage.senderId,
      receiverId: createdMessage.receiverId,
      message: createdMessage.content,
      timestamp: createdMessage.timestamp,
      readAt: createdMessage.readAt,
    };
  }

  async markConversationAsRead(
    readerUserId: string,
    otherUserId: string,
  ): Promise<{ markedCount: number; readAt: Date }> {
    const otherUser = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true },
    });

    if (!otherUser) {
      throw new NotFoundException('User not found');
    }

    const readAt = new Date();
    const updated = await this.prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: readerUserId,
        readAt: null,
      },
      data: {
        readAt,
      },
    });

    return {
      markedCount: updated.count,
      readAt,
    };
  }
}
