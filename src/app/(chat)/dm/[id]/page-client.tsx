"use client";

import { MessagesView } from '@/components/chat/messages-view';
import { MessageInput } from '@/components/chat/message-input';
import { useAuth } from '@/components/auth-provider';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import type { User } from '@/lib/definitions';

export function DMPageClient({ allUsers }: { allUsers: User[] }) {
    const { user: currentUser } = useAuth();
    const params = useParams();
    const friendId = params.id as string;

    const friend = allUsers?.find(u => u.id === friendId);

    const chatId = useMemo(() => {
        if (!currentUser || !friendId) return null;
        // Create a consistent, unique ID for the DM channel
        return ['dm', ...[currentUser.id, friendId].sort()].join('_');
    }, [currentUser, friendId]);

    if (!friendId) {
        return <div className="p-4 text-center text-muted-foreground">This is where direct messages would appear.</div>;
    }

    if (!friend && allUsers && allUsers.length > 0) {
        // notFound() can't be used in client components easily
        return <div className="p-4">User not found.</div>;
    }

    if (!chatId) {
        return <div className="p-4">Loading chat...</div>
    }

  return (
    <div className="flex h-full flex-col">
      <MessagesView chatId={chatId} allUsers={allUsers} />
      <MessageInput chatId={chatId} />
    </div>
  );
}
