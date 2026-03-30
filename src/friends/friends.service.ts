import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FriendsListResponseDto } from './dto/friends-list-response.dto';

@Injectable()
export class FriendsService {
  constructor(private prisma: PrismaService) {}

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

  async addFriend(clerkUserId: string | null | undefined, friendId: string) {
    const me = await this.resolveAuthenticatedUser(clerkUserId);

    if (friendId === me.id) {
      throw new BadRequestException('You cannot add yourself as a friend');
    }

    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
      select: { id: true },
    });

    if (!friend) {
      throw new NotFoundException('Friend user not found');
    }

    const [userAId, userBId] =
      me.id < friend.id ? [me.id, friend.id] : [friend.id, me.id];

    const existing = await this.prisma.friendship.findUnique({
      where: {
        userAId_userBId: {
          userAId,
          userBId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Friendship already exists');
    }

    await this.prisma.friendship.create({
      data: {
        userAId,
        userBId,
      },
    });

    return { friendId: friend.id };
  }

  async getFriends(
    clerkUserId: string | null | undefined,
  ): Promise<FriendsListResponseDto> {
    const me = await this.resolveAuthenticatedUser(clerkUserId);

    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userAId: me.id }, { userBId: me.id }],
      },
      select: {
        userAId: true,
        userBId: true,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const friends = friendships.map((friendship) =>
      friendship.userAId === me.id ? friendship.userB : friendship.userA,
    );

    return {
      total: friends.length,
      friends,
    };
  }
}
