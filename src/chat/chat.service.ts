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

    const createdMessage = await this.prisma.message.create({
      data: {
        senderId,
        receiverId: payload.receiverId,
        content: payload.message,
        timestamp: new Date(payload.timestamp),
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        timestamp: true,
      },
    });

    return {
      id: createdMessage.id,
      senderId: createdMessage.senderId,
      receiverId: createdMessage.receiverId,
      message: createdMessage.content,
      timestamp: createdMessage.timestamp,
    };
  }
}
