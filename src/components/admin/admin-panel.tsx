'use client';

import { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  setUserRole,
  setUserBanStatus,
  sendAnnouncement,
  setSystemShutdown,
  updateUsername,
  deleteUser,
  resetPassword,
  createUser,
  deleteMessages,
  lockRoom,
  setRoomTopic,
  deleteUserMessages,
  impersonateUser,
  bulkBanUsers,
  pruneData,
} from '@/lib/actions';
import type { User, SystemState, Room, AllAuditLogs, ProjectStructure } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from '../chat/user-avatar';
import { ScrollArea } from '../ui/scroll-area';
import {
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Edit,
  Trash2,
  KeyRound,
  Eraser,
  Lock,
  Unlock,
  Info,
  History,
  Bot,
  Ban,
  BarChart,
  FileText,
  MessageSquare,
  Code,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { Checkbox } from '../ui/checkbox';
import { CodeEditor } from './code-editor';

interface AdminPanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: User[];
  systemState: SystemState;
  allChatIds: string[];
  auditLogs: AllAuditLogs;
  rooms: Room[];
  projectStructure: ProjectStructure;
}

function UserInfoDialog({
  user,
  isOpen,
  onOpenChange,
}: {
  user: User;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!user) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Info: {user.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            <strong className="inline-block w-24">User ID:</strong>{' '}
            <code className="text-xs">{user.id}</code>
          </p>
          <p>
            <strong className="inline-block w-24">Role:</strong> {user.role}
          </p>
          <p>
            <strong className="inline-block w-24">Status:</strong> {user.isBanned ? 'Banned' : 'Active'}
          </p>
          <p>
            <strong className="inline-block w-24">Avatar URL:</strong>{' '}
            <a
              href={user.avatarUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block max-w-xs truncate align-middle text-primary hover:underline"
            >
              {user.avatarUrl}
            </a>
          </p>
          <p>
            <strong className="inline-block w-24">Created:</strong> {format(user.createdAt, 'PPP p')}
          </p>
          <p>
            <strong className="inline-block w-24">Last Seen:</strong>{' '}
            {formatDistanceToNow(user.lastSeen, { addSuffix: true })}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminPanelDialog({
  open,
  onOpenChange,
  allUsers,
  systemState,
  allChatIds,
  auditLogs,
  rooms,
  projectStructure,
}: AdminPanelDialogProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [shutdownMessage, setShutdownMessage] = useState(systemState?.shutdownMessage ?? '');
  const [isShutdown, setIsShutdown] = useState(systemState?.isShutdown ?? false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const createUserFormRef = useRef<HTMLFormElement>(null);

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [pruningDays, setPruningDays] = useState('30');
  const [infoUser, setInfoUser] = useState<User | null>(null);

  const handleAdminAction = async (action: Promise<any>, successMessage: string) => {
    try {
      await action;
      toast({ title: 'Success', description: successMessage });
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Operation Failed', description: error });
    }
  };

  const filteredUsers = allUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAllUsersSelected = filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length;

  const systemStats = useMemo(
    () => ({
      totalUsers: allUsers.length,
      totalRooms: rooms.length,
      totalMessages: allChatIds.reduce((acc, id) => acc + (id.length || 0), 0),
      totalChats: allChatIds.length,
    }),
    [allUsers, rooms, allChatIds]
  );

  if (currentUser?.role !== 'admin') return null;

  return (
    <>
      {infoUser && <UserInfoDialog user={infoUser} isOpen={!!infoUser} onOpenChange={() => setInfoUser(null)} />}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[80vh] max-w-6xl flex-col">
          <DialogHeader>
            <DialogTitle>Admin Panel</DialogTitle>
            <DialogDescription>Manage users, rooms, system settings, and monitor activity.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="users" className="flex w-full flex-grow flex-col overflow-hidden pt-2">
            <TabsList className="grid w-full shrink-0 grid-cols-6">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="rooms">Rooms</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              <TabsTrigger value="createUser">Create User</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="flex-grow overflow-y-auto pt-4">
              <div className="mb-4 flex items-center gap-4">
                <Input
                  placeholder="Search username..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-grow"
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={selectedUsers.size === 0}>
                      <Ban className="mr-2" /> Ban Selected ({selectedUsers.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>This will ban {selectedUsers.size} user(s).</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          handleAdminAction(
                            bulkBanUsers(currentUser.id, Array.from(selectedUsers), true),
                            `${selectedUsers.size} users banned.`
                          )
                        }
                      >
                        Ban Users
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <ScrollArea className="h-[calc(100%-60px)]">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center justify-between rounded-md p-2 font-semibold">
                    <div className="flex w-1/2 items-center gap-3">
                      <Checkbox
                        checked={isAllUsersSelected}
                        onCheckedChange={checked => {
                          if (checked) {
                            setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
                          } else {
                            setSelectedUsers(new Set());
                          }
                        }}
                      />
                      User
                    </div>
                    <div className="w-1/2 pr-2 text-right">Actions</div>
                  </div>
                  {filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between rounded-md p-2 hover:bg-accent">
                      <div className="flex w-1/2 items-center gap-3">
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={checked => {
                            setSelectedUsers(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(user.id);
                              else next.delete(user.id);
                              return next;
                            });
                          }}
                        />
                        <UserAvatar user={user} />
                        <div className="flex flex-col">
                          <span>{user.username}</span>
                          <div className="flex items-center gap-1">
                            {user.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
                            {user.isBanned && <Badge variant="destructive">Banned</Badge>}
                            {user.id === 'user_Gemini' && <Badge variant="secondary">AI</Badge>}
                          </div>
                        </div>
                      </div>
                      {user.username !== 'gollclock' && user.id !== 'user_Gemini' && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setInfoUser(user)}>
                            <Info />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              handleAdminAction(impersonateUser(currentUser.id, user.id), 'Impersonating user...')
                            }
                          >
                            <Bot />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              handleAdminAction(
                                updateUsername(currentUser.id, user.id, prompt('Enter new username:', user.username) || ''),
                                'Username updated.'
                              )
                            }
                          >
                            <Edit />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              handleAdminAction(
                                resetPassword(currentUser.id, user.id, prompt('Enter new password:') || ''),
                                'Password reset.'
                              )
                            }
                          >
                            <KeyRound />
                          </Button>
                          {user.role !== 'admin' ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() =>
                                handleAdminAction(setUserRole(currentUser.id, user.id, 'admin'), 'User promoted to admin.')
                              }
                            >
                              <Shield />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() =>
                                handleAdminAction(setUserRole(currentUser.id, user.id, 'user'), 'Admin demoted to user.')
                              }
                            >
                              <ShieldOff />
                            </Button>
                          )}
                          {user.isBanned ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() =>
                                handleAdminAction(setUserBanStatus(currentUser.id, user.id, false), 'User unbanned.')
                              }
                            >
                              <UserCheck />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() =>
                                handleAdminAction(setUserBanStatus(currentUser.id, user.id, true), 'User banned.')
                              }
                            >
                              <UserX />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Eraser className="text-amber-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete all messages sent by "{user.username}". This action cannot
                                  be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleAdminAction(
                                      deleteUserMessages(currentUser.id, user.id),
                                      'User messages deleted.'
                                    )
                                  }
                                >
                                  Delete Messages
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Trash2 className="text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the user "{user.username}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleAdminAction(deleteUser(currentUser.id, user.id), 'User deleted.')}
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="rooms" className="overflow-y-auto pt-4">
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-4">
                  {rooms.map(room => (
                    <div key={room.id} className="flex items-center justify-between rounded-md p-2 hover:bg-accent">
                      <div className="flex flex-col">
                        <span className="font-semibold">{room.name}</span>
                        <code className="text-muted-foreground text-xs">{room.id}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Set channel topic..."
                          defaultValue={room.channels?.[0]?.topic}
                          onBlur={e =>
                            handleAdminAction(setRoomTopic(currentUser.id, room.id, e.target.value), 'Room topic updated.')
                          }
                          className="h-8 w-48"
                        />
                        <Switch
                          id={`lock-${room.id}`}
                          checked={room.isLocked}
                          onCheckedChange={checked =>
                            handleAdminAction(
                              lockRoom(currentUser.id, room.id, checked),
                              `Room ${checked ? 'locked' : 'unlocked'}.`
                            )
                          }
                        />
                        <Label htmlFor={`lock-${room.id}`}>{room.isLocked ? <Lock /> : <Unlock />}</Label>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eraser className="text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently clear all messages in the room "{room.name}". This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleAdminAction(deleteMessages(currentUser.id, room.id), `History for room ${room.name} cleared.`)
                                }
                              >
                                Clear History
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="system" className="space-y-6 overflow-y-auto pt-4">
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="shutdown-switch">Shutdown Website</Label>
                    <p className="text-muted-foreground text-sm">
                      If enabled, all non-admin users will see a full-screen shutdown message.
                    </p>
                  </div>
                  <Switch
                    id="shutdown-switch"
                    checked={isShutdown}
                    onCheckedChange={c => {
                      setIsShutdown(c);
                      handleAdminAction(
                        setSystemShutdown(currentUser.id, c, c ? shutdownMessage : ''),
                        `System ${c ? 'shut down' : 're-enabled'}.`
                      );
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shutdown-message">Shutdown Message</Label>
                  <Textarea
                    id="shutdown-message"
                    placeholder="The website is currently down for maintenance. We'll be back shortly!"
                    value={shutdownMessage}
                    onChange={e => setShutdownMessage(e.target.value)}
                    className="h-24"
                  />
                  <Button
                    onClick={() =>
                      handleAdminAction(
                        setSystemShutdown(currentUser.id, isShutdown, shutdownMessage),
                        'Shutdown message updated.'
                      )
                    }
                  >
                    Update Message
                  </Button>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border p-4">
                <Label htmlFor="announcement-text">Global Toast Announcement</Label>
                <Textarea
                  id="announcement-text"
                  placeholder="Type your announcement here..."
                  value={announcement}
                  onChange={e => setAnnouncement(e.target.value)}
                  className="h-24"
                />
                <Button onClick={() => handleAdminAction(sendAnnouncement(currentUser.id, announcement), 'Announcement sent.')} disabled={!announcement}>
                  Send Announcement
                </Button>
              </div>
              <div className="space-y-2 rounded-lg border p-4">
                <Label>Prune Old Data</Label>
                <p className="text-muted-foreground text-sm">
                  Permanently delete messages older than a specified number of days.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={pruningDays}
                    onChange={e => setPruningDays(e.target.value)}
                    className="w-24"
                  />
                  <Label>days</Label>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={parseInt(pruningDays) <= 0}>
                        Prune Messages
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all messages older than {pruningDays} days. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            handleAdminAction(pruneData(currentUser.id, parseInt(pruningDays)), 'Old messages have been pruned.')
                          }
                        >
                          Prune Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="monitoring" className="flex flex-col gap-4 overflow-y-auto pt-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  <BarChart className="text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
                    <div className="text-muted-foreground">Total Users</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  <FileText className="text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{systemStats.totalRooms}</div>
                    <div className="text-muted-foreground">Total Rooms</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  <MessageSquare className="text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{systemStats.totalMessages}</div>
                    <div className="text-muted-foreground">Total Messages</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  <History className="text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{systemStats.totalChats}</div>
                    <div className="text-muted-foreground">Total Chats</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-grow flex-col rounded-lg border p-4">
                <Label>Admin Audit Log</Label>
                <p className="text-muted-foreground mb-2 text-sm">Showing latest 200 admin actions.</p>
                <ScrollArea className="flex-grow">
                  <div className="space-y-2 pr-4">
                    {auditLogs.map(log => (
                      <div key={log.id} className="rounded-md p-2 text-xs hover:bg-accent">
                        <span className="font-semibold text-primary">{log.adminUsername}</span>
                        <span className="text-muted-foreground"> performed action </span>
                        <span className="font-semibold">{log.action}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          {formatDistanceToNow(log.timestamp, { addSuffix: true })}.{' '}
                        </span>
                        <span className="font-mono text-muted-foreground">{JSON.stringify(log.details)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
            <TabsContent value="createUser" className="pt-4">
              <form
                action={fd =>
                  handleAdminAction(createUser(currentUser.id, fd), 'New user created.').then(() =>
                    createUserFormRef.current?.reset()
                  )
                }
                ref={createUserFormRef}
                className="mx-auto max-w-sm space-y-4"
              >
                <div className="grid gap-2">
                  <Label htmlFor="create-username">Username</Label>
                  <Input id="create-username" name="username" type="text" placeholder="New username" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-password">Password</Label>
                  <Input id="create-password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full">
                  Create User
                </Button>
                {createUserError && <p className="text-destructive text-sm font-medium">{createUserError}</p>}
              </form>
            </TabsContent>
            <TabsContent value="code" className="h-full overflow-hidden pt-4">
              <CodeEditor initialStructure={projectStructure} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
