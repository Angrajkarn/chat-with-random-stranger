import type { FC } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
  sender: 'you' | 'stranger';
  text: string;
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'you';
  const senderName = isUser ? 'You' : 'Stranger';

  return (
    <div className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      <div className="flex flex-col space-y-1 max-w-[75%]">
        <div
          className={cn(
            'rounded-lg px-4 py-2 break-words',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-none'
              : 'bg-muted text-foreground rounded-bl-none'
          )}
        >
          <p className="text-sm">{message.text}</p>
        </div>
      </div>
       {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default MessageBubble;
