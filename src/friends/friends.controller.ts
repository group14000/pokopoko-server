import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateFriendDto } from './dto/create-friend.dto';
import { FriendsListResponseDto } from './dto/friends-list-response.dto';
import { FriendsService } from './friends.service';

@Controller('friends')
@UseGuards(ClerkAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post()
  async addFriend(
    @CurrentUser() auth: { userId?: string | null },
    @Body() body: CreateFriendDto,
  ) {
    return this.friendsService.addFriend(auth.userId, body.friendId);
  }

  @Get()
  async getFriends(
    @CurrentUser() auth: { userId?: string | null },
  ): Promise<FriendsListResponseDto> {
    return this.friendsService.getFriends(auth.userId);
  }
}
