export class MessageItemDto {
  id!: string;
  senderId!: string;
  receiverId!: string;
  message!: string;
  timestamp!: Date;
}

export class GetMessagesResponseDto {
  messages!: MessageItemDto[];
  nextCursor!: string | null;
}
