import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const message =
      exception instanceof Error ? exception.message : 'An error occurred';
    client.emit('chat_error', { message });
  }
}
