import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { FindUsersResponseDto } from './dto/find-users-response.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth/clerk-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('sync-from-clerk')
  @UseGuards(ClerkAuthGuard)
  async syncFromClerk() {
    return this.usersService.syncUsersFromClerk();
  }

  @Get()
  @UseGuards(ClerkAuthGuard)
  async getUsers(
    @Query() query: FindUsersQueryDto,
  ): Promise<FindUsersResponseDto> {
    return this.usersService.findUsersWithPagination(
      query.search,
      query.cursor,
      query.limit,
    );
  }
}
