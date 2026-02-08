"use client";

import React, { useRef, useEffect } from 'react';
import { useMessages } from '@/hooks/use-messages';
import type { User, Message } from '@/lib/definitions';
import { UserAvatar } from './user-avatar';
import { format } from 'date-fns';
import { Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { deleteMessage } from '@/lib/actions';
import { CustomAudioPlayer } from './custom-audio-player';

interface MessagesViewProps {
  chatId: string;
  allUsers: User[];
}

const MessageContent = ({ message, user }: { message: Message, user?: User }) => {
    if (message.type === 'image') {
        const isGif = message.content.includes('giphy.com');
        const altText = user?.id === 'user_Gemini' 
            ? 'AI generated image' 
            : isGif 
            ? 'GIF from Giphy' 
            : 'User upload';
        return (
            <div className="relative mt-2 h-64 w-full max-w-md overflow-hidden rounded-md">
                <Image 
                    src={message.content} 
                    alt={altText} 
                    fill 
                    style={{ objectFit: 'contain' }} 
                    unoptimized={isGif}
                />
            </div>
        )
    }
    if (message.type === 'audio') {
        return <CustomAudioPlayer src={message.content} />
    }
    return <p className="text-foreground/90">{message.content}</p>
}

export function MessagesView({ chatId, allUsers }: MessagesViewProps) {
  const { messages, error } = useMessages(chatId);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDelete = async (messageId: string) => {
    try {
        await deleteMessage(messageId, chatId);
        // Revalidation will refresh the messages from the server action
    } catch(e) {
        const error = e instanceof Error ? e.message : 'Could not delete message';
        toast({
            variant: 'destructive',
            title: 'Error deleting message',
            description: error
        });
    }
  };

  if (error) {
    return <div className="flex flex-1 items-center justify-center text-destructive">Error: {error}</div>;
  }

  if (!messages) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message, index) => {
        const messageUser = allUsers.find(u => u.id === message.userId);
        const prevMessage = messages[index - 1];
        const showAvatarAndHeader = !prevMessage || prevMessage.userId !== message.userId || (message.timestamp - prevMessage.timestamp > 5 * 60 * 1000);
        const canDelete = currentUser?.role === 'admin' || currentUser?.id === message.userId;

        return (
          <div key={message.id} className={`group relative flex items-start space-x-4 ${showAvatarAndHeader ? 'mt-4' : 'mt-1'}`}>
            {showAvatarAndHeader ? (
              <UserAvatar user={messageUser} className="mt-1" />
            ) : (
              <div className="w-10 flex-shrink-0"></div>
            )}
            <div className="flex-1">
              {showAvatarAndHeader && (
                <div className="flex items-baseline space-x-2">
                  <span className="font-bold text-primary">{messageUser?.username}</span>
                  {messageUser?.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.timestamp), 'Pp')}
                  </span>
                </div>
              )}
              <MessageContent message={message} user={messageUser} />
            </div>
             {canDelete && (
                <button
                    onClick={() => handleDelete(message.id)}
                    className="absolute top-0 right-4 h-6 w-6 items-center justify-center rounded bg-background/50 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 hidden group-hover:flex">
                    <X className="h-4 w-4" />
                </button>
            )}
          </div>
        );
      })}
      <div ref={endOfMessagesRef} />
    </div>
  );
}
