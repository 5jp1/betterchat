import fs from 'fs/promises';
import path from 'path';
import type { User, Room, FriendsData, AllMessages, AllAnnouncements, SystemState } from './definitions';

const dataPath = path.join(process.cwd(), 'src', 'lib', 'data');

async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    const filePath = path.join(dataPath, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // File doesn't exist, create it with default value
      await writeJsonFile(filename, defaultValue);
      return defaultValue;
    }
    console.error(`Error reading ${filename}:`, error);
    throw error;
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(dataPath, filename);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// User functions
export const getUsers = () => readJsonFile<User[]>('users.json', []);
export const writeUsers = (users: User[]) => writeJsonFile('users.json', users);

// Room functions
export const getRooms = () => readJsonFile<Room[]>('rooms.json', []);
export const writeRooms = (rooms: Room[]) => writeJsonFile('rooms.json', rooms);

// Friends functions
export const getFriends = () => readJsonFile<FriendsData>('friends.json', {});
export const writeFriends = (friends: FriendsData) => writeJsonFile('friends.json', friends);

// Message functions
export const getAllMessages = () => readJsonFile<AllMessages>('messages.json', {});
export const writeAllMessages = (messages: AllMessages) => writeJsonFile('messages.json', messages);

// Announcement functions
export const getAnnouncements = () => readJsonFile<AllAnnouncements>('announcements.json', []);
export const writeAnnouncements = (announcements: AllAnnouncements) => writeJsonFile('announcements.json', announcements);

// System state functions
export const getSystemState = () => readJsonFile<SystemState>('system.json', { isShutdown: false });
export const writeSystemState = (state: SystemState) => writeJsonFile('system.json', state);
