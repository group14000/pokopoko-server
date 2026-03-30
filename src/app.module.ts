import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { FriendsModule } from './friends/friends.module';

@Module({
  imports: [PrismaModule, UsersModule, FriendsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
