export class UserDto {
  id!: string;
  email!: string;
  name!: string;
  imageUrl?: string | null;
  createdAt!: Date;
}
