export class FriendItemDto {
  id!: string;
  name!: string;
  email!: string;
  imageUrl?: string | null;
}

export class FriendsListResponseDto {
  total!: number;
  friends!: FriendItemDto[];
}
