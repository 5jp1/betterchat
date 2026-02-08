"use client";

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { sendFriendRequest } from '@/lib/actions';
import type { User } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from './user-avatar';
import { ScrollArea } from '../ui/scroll-area';
import { UserPlus } from 'lucide-react';

interface AddFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: User[];
}

export function AddFriendDialog({ open, onOpenChange, allUsers }: AddFriendDialogProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSendRequest = async (friendId: string) => {
    if (!currentUser) return;
    try {
      await sendFriendRequest(currentUser.id, friendId);
      toast({
        title: 'Friend request sent!',
        description: 'Your request has been sent successfully.',
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Failed to send request', description: error });
    }
  };

  const filteredUsers = allUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
    user.id !== currentUser?.id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>Search for users to add them as a friend.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Search username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between rounded-md p-2 hover:bg-accent">
                    <div className="flex items-center gap-2">
                      <UserAvatar user={user} />
                      <span>{user.username}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleSendRequest(user.id)}>
                      <UserPlus className="mr-2 h-4 w-4" /> Add
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">No users found.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
