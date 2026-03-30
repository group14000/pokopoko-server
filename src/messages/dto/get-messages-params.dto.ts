import { IsNotEmpty, IsString } from 'class-validator';

export class GetMessagesParamsDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
