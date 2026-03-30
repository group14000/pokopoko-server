export class ConversationOtherUserDto {
  id!: string;
  name!: string;
  email!: string;
  imageUrl?: string | null;
}

export class ConversationLastMessageDto {
  message!: string;
  timestamp!: Date;
}

export class ConversationItemDto {
  conversationId!: string;
  otherUser!: ConversationOtherUserDto;
  lastMessage!: ConversationLastMessageDto;
  updatedAt!: Date;
  unreadCount!: number;
}
