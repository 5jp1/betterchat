import fs from 'fs/promises';
import path from 'path';
import type { User, Room, FriendsData, AllMessages, AllAnnouncements, SystemState, AllAuditLogs, ProjectStructure, FileNode, DirectoryNode } from './definitions';

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

// Audit Log functions
export const getAuditLogs = () => readJsonFile<AllAuditLogs>('audit.json', []);
export const writeAuditLogs = (logs: AllAuditLogs) => writeJsonFile('audit.json', logs);

// System state functions
export const getSystemState = () => readJsonFile<SystemState>('system.json', { isShutdown: false, shutdownMessage: '' });
export const writeSystemState = (state: SystemState) => writeJsonFile('system.json', state);


// --- Project Structure ---
const projectRoot = process.cwd();

async function getFileTree(dir: string): Promise<ProjectStructure> {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map(async (dirent) => {
        const res = path.resolve(dir, dirent.name);
        if (dirent.name === 'node_modules' || dirent.name === '.next' || dirent.name === '.git' || dirent.name.endsWith('.DS_Store')) {
            return null;
        }
        if (dirent.isDirectory()) {
            return { name: dirent.name, type: 'directory', children: await getFileTree(res) };
        } else {
            return { name: dirent.name, type: 'file', path: path.relative(projectRoot, res) };
        }
    }));
    const filteredFiles = files.filter(Boolean) as (FileNode | DirectoryNode)[];
    
    return filteredFiles.sort((a, b) => {
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
    });
}

export const getProjectStructure = () => getFileTree(projectRoot);
