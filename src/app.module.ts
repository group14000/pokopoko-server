import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { FriendsModule } from './friends/friends.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [PrismaModule, UsersModule, FriendsModule, ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
