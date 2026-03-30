import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  receiverId!: string;

  @Transform(({ obj, value }) => value ?? obj.send_message)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsDateString()
  timestamp!: string;
}
