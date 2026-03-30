import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '@clerk/backend';
import {
  UnauthorizedException,
  UseFilters,
  ValidationPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { WsExceptionFilter } from './ws-exception.filter';

type SocketAuthData = {
  localUserId?: string;
};

@UseFilters(new WsExceptionFilter())
@WebSocketGateway({ namespace: 'chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly messageValidationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
  });

  private readonly markAsReadValidationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
  });

  constructor(private readonly chatService: ChatService) {}

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === 'string') {
      const trimmed = authorization.trim();
      if (trimmed.toLowerCase().startsWith('bearer ')) {
        return trimmed.slice(7).trim();
      }
      if (trimmed) {
        return trimmed;
      }
    }

    return null;
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new UnauthorizedException('Missing authentication token');
      }

      const verifiedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const clerkUserId = verifiedToken.sub;

      if (!clerkUserId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      const localUserId =
        await this.chatService.resolveLocalUserIdFromClerkId(clerkUserId);

      (client.data as SocketAuthData).localUserId = localUserId;
      this.chatService.registerOnlineUser(localUserId, client.id);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const localUserId = (client.data as SocketAuthData).localUserId;
    if (localUserId) {
      this.chatService.unregisterOnlineUser(localUserId, client.id);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ) {
    return this.processSendMessage(client, payload);
  }

  @SubscribeMessage('message')
  async handleDefaultMessageEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ) {
    return this.processSendMessage(client, payload);
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MarkAsReadDto,
  ) {
    const validatedPayload = await this.markAsReadValidationPipe.transform(
      payload,
      {
        type: 'body',
        metatype: MarkAsReadDto,
      },
    );

    const readerId = (client.data as SocketAuthData).localUserId;
    if (!readerId) {
      client.emit('chat_error', { message: 'Unauthorized' });
      return;
    }

    try {
      const result = await this.chatService.markConversationAsRead(
        readerId,
        validatedPayload.userId,
      );

      const senderSocketIds = this.chatService.getOnlineSocketIds(
        validatedPayload.userId,
      );

      for (const socketId of senderSocketIds) {
        this.server.to(socketId).emit('messages_read', {
          byUserId: readerId,
          withUserId: validatedPayload.userId,
          markedCount: result.markedCount,
          readAt: result.readAt,
        });
      }

      return { status: 'ok', ...result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Read receipt update failed';
      client.emit('chat_error', { message });
      return;
    }
  }

  private async processSendMessage(client: Socket, payload: SendMessageDto) {
    const validatedPayload = await this.messageValidationPipe.transform(
      payload,
      {
        type: 'body',
        metatype: SendMessageDto,
      },
    );

    const senderId = (client.data as SocketAuthData).localUserId;
    if (!senderId) {
      client.emit('chat_error', { message: 'Unauthorized' });
      return;
    }

    try {
      const message = await this.chatService.saveMessage(
        senderId,
        validatedPayload,
      );

      const receiverSocketIds = this.chatService.getOnlineSocketIds(
        message.receiverId,
      );

      for (const socketId of receiverSocketIds) {
        this.server.to(socketId).emit('receive_message', message);
      }

      return { status: 'ok', id: message.id };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Message delivery failed';
      client.emit('chat_error', { message });
      return;
    }
  }
}
