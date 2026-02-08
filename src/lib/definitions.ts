export type User = {
  id: string;
  username: string;
  password?: string; // Will be hashed and not sent to client
  avatarUrl: string;
  role: 'admin' | 'user';
  isBanned: boolean;
  createdAt: number;
  lastSeen: number;
};

export type RoomChannel = { 
  id: string, 
  name: string,
  topic?: string,
};

export type Room = {
  id: string;
  name: string;
  iconUrl: string;
  channels?: RoomChannel[];
  isLocked?: boolean;
};

export type Message = {
  id:string;
  chatId: string;
  userId: string;
  timestamp: number;
  content: string;
  type: 'text' | 'image' | 'audio';
};

export type UserFriendsInfo = {
  friends: string[]; // array of friend user IDs
  requests: string[]; // array of user IDs who sent a request
};

export type FriendsData = {
  [userId: string]: UserFriendsInfo;
};

export type AllMessages = { 
  [chatId: string]: Message[] 
};

export type Announcement = {
    id: string;
    adminName: string;
    message: string;
    timestamp: number;
}

export type AllAnnouncements = Announcement[];

export type SystemState = {
    isShutdown: boolean;
    shutdownMessage?: string;
};

export type AuditLog = {
    id: string;
    timestamp: number;
    adminId: string;
    adminUsername: string;
    action: string;
    details: Record<string, any>;
};

export type AllAuditLogs = AuditLog[];

export type FileNode = {
    name: string;
    type: 'file';
    path: string;
};

export type DirectoryNode = {
    name: string;
    type: 'directory';
    children: (FileNode | DirectoryNode)[];
};

export type ProjectStructure = (FileNode | DirectoryNode)[];
