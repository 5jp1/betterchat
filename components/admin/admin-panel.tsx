"use client";

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { setUserRole, setUserBanStatus, sendAnnouncement, setSystemShutdown } from '@/lib/actions';
import type { User, SystemState } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from '../chat/user-avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Shield, ShieldOff, UserX, UserCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

interface AdminPanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: User[];
  systemState: SystemState;
}

export function AdminPanelDialog({ open, onOpenChange, allUsers, systemState }: AdminPanelDialogProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [isShutdown, setIsShutdown] = useState(systemState?.isShutdown ?? false);

  if (currentUser?.role !== 'admin') return null;

  const handleSetRole = async (userId: string, role: 'admin' | 'user') => {
    try {
      await setUserRole(userId, role);
      toast({ title: 'Success', description: `User role has been updated.` });
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Operation Failed', description: error });
    }
  };

  const handleSetBan = async (userId: string, isBanned: boolean) => {
    try {
      await setUserBanStatus(userId, isBanned);
      toast({ title: 'Success', description: `User ban status has been updated.` });
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Operation Failed', description: error });
    }
  };

  const handleSendAnnouncement = async () => {
    if (!currentUser || !announcement) return;
    try {
        await sendAnnouncement(announcement, currentUser.username);
        toast({ title: 'Success', description: 'Announcement sent globally.' });
        setAnnouncement('');
    } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown error occurred.';
        toast({ variant: 'destructive', title: 'Operation Failed', description: error });
    }
  };

  const handleShutdownToggle = async (checked: boolean) => {
    setIsShutdown(checked);
    try {
        await setSystemShutdown(checked);
        toast({ title: 'Success', description: `System has been ${checked ? 'shut down' : 're-enabled'}.` });
    } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown error occurred.';
        toast({ variant: 'destructive', title: 'Operation Failed', description: error });
        setIsShutdown(!checked); // Revert on failure
    }
  };
  
  const filteredUsers = allUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Admin Panel</DialogTitle>
          <DialogDescription>Manage users, announcements, and system settings.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="users" className="w-full pt-2">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="announcements">Announcements</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="pt-4">
                <Input
                    placeholder="Search username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-4"
                />
                <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between rounded-md p-2 hover:bg-accent">
                            <div className="flex items-center gap-2">
                                <UserAvatar user={user} />
                                <div className="flex flex-col">
                                    <span>{user.username}</span>
                                    <div className="flex gap-1 items-center">
                                        {user.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
                                        {user.isBanned && <Badge variant="destructive">Banned</Badge>}
                                    </div>
                                </div>
                            </div>
                            {user.username !== 'gollclock' && (
                                <div className="flex gap-1">
                                    {user.role !== 'admin' ? (
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSetRole(user.id, 'admin')}>
                                            <Shield className="text-green-500" />
                                        </Button>
                                    ) : (
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSetRole(user.id, 'user')}>
                                            <ShieldOff className="text-muted-foreground" />
                                        </Button>
                                    )}
                                    {user.isBanned ? (
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSetBan(user.id, false)}>
                                            <UserCheck className="text-green-500" />
                                        </Button>
                                    ) : (
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSetBan(user.id, true)}>
                                            <UserX className="text-red-500" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    </div>
                </ScrollArea>
            </TabsContent>
            <TabsContent value="announcements">
                <div className="space-y-4 pt-4">
                    <Label htmlFor="announcement-text">Global Announcement Message</Label>
                    <Textarea
                        id="announcement-text"
                        placeholder="Type your announcement here..."
                        value={announcement}
                        onChange={(e) => setAnnouncement(e.target.value)}
                        className="h-32"
                    />
                    <Button onClick={handleSendAnnouncement} disabled={!announcement}>Send Announcement</Button>
                </div>
            </TabsContent>
            <TabsContent value="system">
                <div className="space-y-4 pt-4">
                    <div className="flex items-center space-x-2 rounded-lg border p-4">
                        <div className="flex-1 space-y-1">
                            <Label htmlFor="shutdown-switch">Shutdown Website</Label>
                            <p className="text-sm text-muted-foreground">
                                If enabled, all non-admin users will see a shutdown message and will not be able to use the app.
                            </p>
                        </div>
                        <Switch
                            id="shutdown-switch"
                            checked={isShutdown}
                            onCheckedChange={handleShutdownToggle}
                        />
                    </div>
                </div>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
