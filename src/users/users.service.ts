import { Injectable } from '@nestjs/common';
import { clerkClient } from '@clerk/express';
import { PrismaService } from '../prisma/prisma.service';
import { FindUsersResponseDto } from './dto/find-users-response.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async syncUsersFromClerk(): Promise<{
    totalFromClerk: number;
    synced: number;
    skipped: number;
  }> {
    const clerkUsers: any[] = [];
    const batchSize = 100;
    let offset = 0;

    while (true) {
      const response = await clerkClient.users.getUserList({
        limit: batchSize,
        offset,
      });
      const batch = Array.isArray(response) ? response : response.data;

      if (!batch.length) {
        break;
      }

      clerkUsers.push(...batch);
      if (batch.length < batchSize) {
        break;
      }

      offset += batchSize;
    }

    let synced = 0;
    let skipped = 0;

    for (const clerkUser of clerkUsers) {
      const primaryEmail =
        clerkUser.emailAddresses?.find(
          (email) => email.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ?? clerkUser.emailAddresses?.[0]?.emailAddress;

      if (!primaryEmail) {
        skipped += 1;
        continue;
      }

      const fullName =
        `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`
          .trim()
          .replace(/\s+/g, ' ');
      const name =
        fullName || clerkUser.username || primaryEmail.split('@')[0] || 'User';

      const existing = await this.prisma.user.findFirst({
        where: {
          OR: [{ clerkId: clerkUser.id }, { email: primaryEmail }],
        },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            clerkId: clerkUser.id,
            email: primaryEmail,
            name,
            imageUrl: clerkUser.imageUrl ?? null,
          },
        });
      } else {
        await this.prisma.user.create({
          data: {
            clerkId: clerkUser.id,
            email: primaryEmail,
            name,
            imageUrl: clerkUser.imageUrl ?? null,
          },
        });
      }

      synced += 1;
    }

    return {
      totalFromClerk: clerkUsers.length,
      synced,
      skipped,
    };
  }

  async findUsersWithPagination(
    search?: string,
    cursor?: string,
    limit = 10,
  ): Promise<FindUsersResponseDto> {
    // Clamp limit to max 100
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);

    // Build where clause for search
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    // Fetch limit + 1 to detect if more pages exist
    const take = normalizedLimit + 1;

    // Execute cursor-based pagination
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { id: 'asc' },
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take,
      select: {
        id: true,
        email: true,
        name: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    // Determine nextCursor
    let nextCursor: string | null = null;
    if (users.length > normalizedLimit) {
      nextCursor = users[normalizedLimit].id;
      users.pop(); // Remove the extra row
    }

    return {
      users,
      nextCursor,
    };
  }
}
