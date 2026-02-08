export type User = {
  id: string;
  username: string;
  password?: string; // Will be hashed and not sent to client
  avatarUrl: string;
  role: 'admin' | 'user';
  isBanned: boolean;
};

export type Room = {
  id: string;
  name: string;
  iconUrl: string;
  channels?: { id: string, name: string }[];
};

export type Message = {
  id: string;
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
};
