"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import type { Room, User, FriendsData, Announcement, SystemState, AllAuditLogs, ProjectStructure } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { Button } from '../ui/button';
import { UserAvatar } from './user-avatar';
import { LogOut, MessageSquare, Hash, AtSign, Settings, Plus, X, Trash2, Inbox, UserPlus, Terminal, Frown, Puzzle } from 'lucide-react';
import { logout, deleteRoom, deleteMessages } from '@/lib/actions';
import { AddRoomDialog } from './add-room-dialog';
import { ProfileEditor } from './profile-editor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { AddFriendDialog } from './add-friend-dialog';
import { InboxDialog } from './inbox-dialog';
import { AdminPanelDialog } from '../admin/admin-panel';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';


interface ChatLayoutProps {
  rooms: Room[];
  allUsers: User[];
  friendsData: FriendsData;
  announcements: Announcement[];
  systemState: SystemState;
  children: React.ReactNode;
  allChatIds: string[];
  auditLogs: AllAuditLogs;
  projectStructure: ProjectStructure;
}

export function ChatLayout({ rooms, allUsers, friendsData, children, announcements, systemState, allChatIds, auditLogs, projectStructure }: ChatLayoutProps) {
  const { user, isLoading, login } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const [isAddRoomOpen, setAddRoomOpen] = useState(false);
  const [isProfileEditorOpen, setProfileEditorOpen] = useState(false);
  const [isAddFriendOpen, setAddFriendOpen] = useState(false);
  const [isInboxOpen, setInboxOpen] = useState(false);
  const [isAdminPanelOpen, setAdminPanelOpen] = useState(false);
  
  const latestAnnouncementTimestamp = React.useRef<number | null>(null);

  React.useEffect(() => {
    // Show toast for new announcements
    if (announcements && announcements.length > 0) {
      const latestAnn = announcements[0];
      if (latestAnnouncementTimestamp.current === null) {
        // On first load, just set the timestamp
        latestAnnouncementTimestamp.current = latestAnn.timestamp;
      } else if (latestAnn.timestamp > latestAnnouncementTimestamp.current) {
        // If a new announcement arrived since last check
        toast({
          title: `Announcement from ${latestAnn.adminName}`,
          description: latestAnn.message,
          duration: 10000,
        });
        latestAnnouncementTimestamp.current = latestAnn.timestamp;
      }
    }
  }, [announcements, toast]);

  React.useEffect(() => {
    if (!isLoading && user && allUsers.length > 0) {
      const latestUserData = allUsers.find(u => u.id === user.id);
      if (latestUserData) {
        const { password, ...latestUserToCompare } = latestUserData;
        if (JSON.stringify(latestUserToCompare) !== JSON.stringify(user)) {
          login(latestUserData);
        }
      }
    }
  }, [user, isLoading, allUsers, login]);

  const isAdmin = user?.role === 'admin';

  const { friends, hasNewRequests } = React.useMemo(() => {
    if (!user || !friendsData[user.id]) return { friends: [], hasNewRequests: false };
    
    const friendList = (friendsData[user.id].friends || [])
      .map(friendId => allUsers.find(u => u.id === friendId))
      .filter(Boolean) as User[];
      
    const newRequests = (friendsData[user.id].requests || []).length > 0;

    return { friends: friendList, hasNewRequests: newRequests };
  }, [user, friendsData, allUsers]);
  
  const currentRoom = rooms.find(r => r.id === params.id);
  
  if (isLoading) {
    return null; // or a loading skeleton
  }

  if (!user) {
    // This should be handled by a higher-level redirect, but as a fallback:
    return <div className="flex h-screen items-center justify-center">Redirecting to login...</div>;
  }

  if (systemState?.isShutdown && user?.role !== 'admin') {
      return (
          <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground text-center p-8">
              <Frown className="h-24 w-24 text-primary" />
              <h1 className="mt-4 text-4xl font-bold">Temporarily Down</h1>
              <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
                {systemState.shutdownMessage || "BetterChat is currently undergoing maintenance. Please check back later."}
              </p>
          </div>
      );
  }
  
  const isDM = pathname.startsWith('/dm');
  const activeChatId = params.id as string;
  const GeminiUser = allUsers.find(u => u.id === 'user_Gemini');

  const handleDeleteRoom = (roomId: string) => {
    if (!user) return;
    deleteRoom(user.id, roomId);
  }

  const handleDeleteMessages = () => {
    if (activeChatId && user) {
        deleteMessages(user.id, activeChatId);
    }
  }

  return (
    <TooltipProvider>
      <AddRoomDialog open={isAddRoomOpen} onOpenChange={setAddRoomOpen} />
      <ProfileEditor open={isProfileEditorOpen} onOpenChange={setProfileEditorOpen} />
      <AddFriendDialog open={isAddFriendOpen} onOpenChange={setAddFriendOpen} allUsers={allUsers} />
      <InboxDialog open={isInboxOpen} onOpenChange={setInboxOpen} allUsers={allUsers} friendsData={friendsData} announcements={announcements} />
      {isAdmin && <AdminPanelDialog open={isAdminPanelOpen} onOpenChange={setAdminPanelOpen} allUsers={allUsers} systemState={systemState} allChatIds={allChatIds} auditLogs={auditLogs} rooms={rooms} projectStructure={projectStructure} />}

      <div className="relative flex h-screen bg-secondary">
        {systemState?.isShutdown && user?.role === 'admin' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-fit rounded-md border border-destructive bg-destructive/20 p-3 text-destructive-foreground shadow-lg">
                <p className="font-bold">System is currently SHUT DOWN.</p>
                <p className="text-sm">Only admins can access the app.</p>
            </div>
        )}
        {/* Server List */}
        <div className="flex flex-col items-center space-y-2 bg-background p-2">
          <Link href={friends.length > 0 ? `/dm/${friends[0].id}` : '/dm'}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("h-12 w-12 flex items-center justify-center rounded-2xl cursor-pointer transition-all", isDM ? 'bg-primary rounded-2xl' : 'bg-secondary rounded-full hover:bg-primary hover:rounded-2xl')}>
                  <MessageSquare className={cn(isDM ? 'text-white' : 'text-primary')} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Direct Messages</TooltipContent>
            </Tooltip>
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
                <button onClick={() => setAddFriendOpen(true)} className="group h-12 w-12 flex items-center justify-center rounded-full bg-secondary hover:bg-primary hover:rounded-2xl cursor-pointer transition-all">
                    <UserPlus className="h-6 w-6 text-primary group-hover:text-white" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="right">Add Friend</TooltipContent>
          </Tooltip>
          <div className="h-px w-8 bg-border" />
          {rooms.map(room => (
            <div key={room.id} className="group relative">
              <Link href={`/room/${room.id}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn("h-12 w-12 rounded-full overflow-hidden cursor-pointer transition-all", !isDM && activeChatId === room.id ? 'ring-2 ring-white rounded-2xl' : 'hover:rounded-2xl')}>
                       <Image src={room.iconUrl} alt={room.name} width={48} height={48} unoptimized />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{room.name}</TooltipContent>
                </Tooltip>
              </Link>
              {isAdmin && room.id !== 'room_general' && (
                 <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X className="h-4 w-4" />
                              </Button>
                          </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right">Delete Channel</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the "{room.name}" channel and all of its messages. This action cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteRoom(room.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
          {isAdmin && (
             <Tooltip>
                <TooltipTrigger asChild>
                    <button onClick={() => setAddRoomOpen(true)} className="group h-12 w-12 flex items-center justify-center rounded-full bg-secondary hover:bg-primary cursor-pointer transition-all">
                        <Plus className="text-primary group-hover:text-primary-foreground" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right">Add a Channel</TooltipContent>
            </Tooltip>
          )}

          <div className="flex-grow" />

          <Tooltip>
            <TooltipTrigger asChild>
                <Link href="/wordle">
                    <button className={cn("group h-12 w-12 flex items-center justify-center rounded-full bg-secondary hover:bg-primary hover:rounded-2xl cursor-pointer transition-all", pathname === "/wordle" && "bg-primary rounded-2xl")}>
                        <Puzzle className={cn("h-6 w-6 text-primary group-hover:text-white", pathname === "/wordle" && "text-white")} />
                    </button>
                </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Wordle</TooltipContent>
          </Tooltip>

          {isAdmin && (
             <Tooltip>
                <TooltipTrigger asChild>
                    <button onClick={() => setAdminPanelOpen(true)} className="group h-12 w-12 flex items-center justify-center rounded-full bg-secondary hover:bg-primary hover:rounded-2xl cursor-pointer transition-all">
                        <Terminal className="h-6 w-6 text-primary group-hover:text-white" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right">Admin Panel</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
                <button onClick={() => setInboxOpen(true)} className="relative group h-12 w-12 flex items-center justify-center rounded-full bg-secondary hover:bg-primary hover:rounded-2xl cursor-pointer transition-all">
                    <Inbox className="h-6 w-6 text-primary group-hover:text-white" />
                    {hasNewRequests && <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />}
                </button>
            </TooltipTrigger>
            <TooltipContent side="right">Inbox</TooltipContent>
          </Tooltip>
        </div>

        {/* Channel/Friend List */}
        <div className="flex w-60 flex-col bg-secondary">
          <header className="flex h-12 flex-shrink-0 items-center border-b border-border px-4 shadow-sm">
            <h2 className="font-bold">{isDM ? 'Direct Messages' : currentRoom?.name}</h2>
          </header>
          <div className="flex-1 overflow-y-auto p-2">
            {isDM ? (
              <>
                <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => setAddFriendOpen(true)}>Find or start a conversation</Button>
                <p className="p-2 text-xs font-semibold uppercase text-muted-foreground">Direct Messages</p>
                <div className="space-y-1">
                  {GeminiUser && (
                    <Link key={GeminiUser.id} href={`/dm/${GeminiUser.id}`} className={cn("flex items-center justify-between space-x-2 rounded p-2", activeChatId === GeminiUser.id ? 'bg-accent' : 'hover:bg-accent/50')}>
                      <div className="flex items-center space-x-2">
                        <UserAvatar user={GeminiUser} />
                        <span>{GeminiUser.username}</span>
                      </div>
                      <Badge variant="secondary">AI</Badge>
                    </Link>
                  )}
                  {friends.map(friend => (
                     <Link key={friend.id} href={`/dm/${friend.id}`} className={cn("flex items-center space-x-2 rounded p-2", activeChatId === friend.id ? 'bg-accent' : 'hover:bg-accent/50')}>
                        <UserAvatar user={friend} />
                        <span>{friend.username}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-1">
                 {currentRoom?.channels?.map(channel => (
                   <div key={channel.id} className={cn("flex items-center space-x-2 rounded p-2 text-muted-foreground cursor-pointer", "bg-accent text-foreground", "hover:bg-accent/80")}>
                    <Hash className="h-5 w-5" />
                    <span>{channel.name}</span>
                  </div>
                 ))}
              </div>
            )}
          </div>
          <div className="mt-auto flex h-14 flex-shrink-0 items-center justify-between bg-background/50 p-2">
            <div className="flex items-center space-x-2">
              <UserAvatar user={user} />
              <span className="text-sm font-medium">{user.username}</span>
              {isAdmin && <Badge variant="secondary">Admin</Badge>}
            </div>
            <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={() => setProfileEditorOpen(true)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Settings className="h-4 w-4" />
                </Button>
                <form action={logout}>
                    <Button variant="ghost" size="icon" type="submit" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <LogOut className="h-4 w-4" />
                    </Button>
                </form>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex flex-1 flex-col bg-background">
            <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border px-4 shadow-sm">
                <div className="flex items-center text-lg font-semibold truncate">
                   {isDM ? <AtSign className="mr-2 h-5 w-5 text-muted-foreground"/> : <Hash className="mr-2 h-6 w-6 text-muted-foreground" />}
                   <span className="truncate">{isDM ? allUsers.find(u=> u.id === activeChatId)?.username : currentRoom?.channels?.[0]?.name}</span>
                    {currentRoom?.channels?.[0]?.topic && !isDM && (
                       <span className="ml-4 text-sm text-muted-foreground font-normal hidden md:block truncate">| {currentRoom.channels[0].topic}</span>
                   )}
                </div>
                {isAdmin && activeChatId && (
                    <AlertDialog>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon">
                                        <Trash2 />
                                    </Button>
                                </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Clear all messages in this chat</TooltipContent>
                        </Tooltip>
                         <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete all messages in this chat. This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteMessages}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </header>
            <div className="flex-1 overflow-hidden">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
}
