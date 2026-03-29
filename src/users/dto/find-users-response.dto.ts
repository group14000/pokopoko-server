import { UserDto } from './user.dto';

export class FindUsersResponseDto {
  users!: UserDto[];
  nextCursor!: string | null;
}
