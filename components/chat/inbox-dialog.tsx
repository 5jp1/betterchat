"use client";

import { useAuth } from '@/components/auth-provider';
import { acceptFriendRequest, declineFriendRequest } from '@/lib/actions';
import type { User, FriendsData, Announcement } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from './user-avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Check, X, Megaphone } from 'lucide-react';
import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface InboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: User[];
  friendsData: FriendsData;
  announcements: Announcement[];
}

export function InboxDialog({ open, onOpenChange, allUsers, friendsData, announcements }: InboxDialogProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const friendRequests = React.useMemo(() => {
    if (!currentUser || !friendsData[currentUser.id]) return [];
    return (friendsData[currentUser.id].requests || [])
      .map(userId => allUsers.find(u => u.id === userId))
      .filter(Boolean) as User[];
  }, [currentUser, friendsData, allUsers]);

  const handleAccept = async (requestingUserId: string) => {
    if (!currentUser) return;
    try {
      await acceptFriendRequest(currentUser.id, requestingUserId);
      toast({ title: 'Friend request accepted!' });
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Failed to accept', description: error });
    }
  };

  const handleDecline = async (requestingUserId: string) => {
    if (!currentUser) return;
    try {
      await declineFriendRequest(currentUser.id, requestingUserId);
      toast({ title: 'Friend request declined.' });
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Failed to decline', description: error });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inbox</DialogTitle>
          <DialogDescription>Manage your friend requests and view announcements.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-6">
              {/* Friend Requests */}
              <div>
                <h4 className="mb-2 px-2 text-sm font-semibold text-muted-foreground">Friend Requests</h4>
                <div className="space-y-2">
                  {friendRequests.length > 0 ? (
                    friendRequests.map(user => (
                      <div key={user.id} className="flex items-center justify-between rounded-md p-2 hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <UserAvatar user={user} />
                          <span>{user.username}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-500" onClick={() => handleAccept(user.id)}>
                                <Check />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-500" onClick={() => handleDecline(user.id)}>
                                <X />
                            </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="px-2 text-sm text-center text-muted-foreground">No new friend requests.</p>
                  )}
                </div>
              </div>
              {/* Announcements */}
              <div>
                <h4 className="mb-2 px-2 text-sm font-semibold text-muted-foreground">Announcements</h4>
                <div className="space-y-2">
                  {announcements.length > 0 ? (
                    announcements.map(ann => (
                        <div key={ann.id} className="flex items-start gap-3 rounded-md p-2">
                            <div className="mt-1">
                                <Megaphone className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm">{ann.message}</p>
                                <p className="text-xs text-muted-foreground">
                                    – {ann.adminName}, {formatDistanceToNow(ann.timestamp, { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    ))
                  ) : (
                    <p className="px-2 text-sm text-center text-muted-foreground">No recent announcements.</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
