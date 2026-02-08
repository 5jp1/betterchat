'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { Message, User, Room, FriendsData, Announcement, AllAnnouncements, SystemState, AuditLog, AllAuditLogs } from './definitions';
import {
  getUsers, writeUsers, getRooms, writeRooms, getAllMessages, writeAllMessages,
  getFriends, writeFriends, getAnnouncements, writeAnnouncements, getSystemState, writeSystemState,
  getAuditLogs, writeAuditLogs
} from './data';
import fs from 'fs/promises';
import path from 'path';

const projectRoot = process.cwd();
const Gemini_USER_ID = 'user_Gemini';

async function logAdminAction(adminId: string, action: string, details: Record<string, any>) {
    const users = await getUsers();
    const admin = users.find(u => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
        // Silently fail if the user isn't an admin. Should be checked before calling.
        console.warn(`Attempted to log admin action for non-admin user: ${adminId}`);
        return;
    }

    const logs = await getAuditLogs();
    const newLog: AuditLog = {
        id: `log_${Date.now()}`,
        timestamp: Date.now(),
        adminId: admin.id,
        adminUsername: admin.username,
        action,
        details,
    };
    logs.unshift(newLog);
    // Keep the log from getting too big to prevent performance issues
    await writeAuditLogs(logs.slice(0, 200));
}

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    return;
  }
  const { username, password } = parsed.data;

  const users = await getUsers();
  if (users.find(u => u.username === username)) {
    console.error("User already exists");
    return;
  }

  const now = Date.now();
  const newUser: User = {
    id: `user_${now}`,
    username,
    password, // In a real app, hash this!
    avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${username}`,
    role: 'user',
    isBanned: false,
    createdAt: now,
    lastSeen: now,
  };

  await writeUsers([...users, newUser]);

  const friendsData = await getFriends();
  friendsData[newUser.id] = { friends: [], requests: [] };
  await writeFriends(friendsData);

  redirect('/login');
}


const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect('/login?error=Invalid_input');
    return;
  }
  
  const { username, password } = parsed.data;
  const users = await getUsers();
  const user = users.find(u => u.username === username);

  if (!user || user.password !== password) {
    redirect('/login?error=Invalid_credentials');
    return;
  }

  if (user.isBanned) {
    redirect('/login?error=This_account_has_been_banned');
    return;
  }
  
  const userIndex = users.findIndex(u => u.id === user.id);
  if (userIndex !== -1) {
    users[userIndex].lastSeen = Date.now();
    await writeUsers(users);
  }

  const { password: _, ...userToReturn } = user;
  const userJson = encodeURIComponent(JSON.stringify(userToReturn));
  
  redirect(`/login?user=${userJson}`);
}

export async function logout() {
    redirect('/login');
}

const messageSchema = z.object({
    content: z.string().optional(),
    chatId: z.string(),
    userId: z.string(),
    attachment: z.instanceof(File).optional(),
    gifUrl: z.string().url().optional(),
});

export async function sendMessage(formData: FormData) {
    const parsed = messageSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
        console.error("Invalid message data", parsed.error);
        throw new Error("Invalid message data");
    }

    const { content, chatId, userId, attachment, gifUrl } = parsed.data;

    const rooms = await getRooms();
    const room = rooms.find(r => r.id === chatId);
    const users = await getUsers();
    const user = users.find(u => u.id === userId);

    if (room?.isLocked && user?.role !== 'admin') {
      throw new Error("This room is locked. Only admins can send messages.");
    }
    
    let messageContent = content || '';
    let messageType: Message['type'] = 'text';

    if (gifUrl) {
        messageContent = gifUrl;
        messageType = 'image';
    } else if (attachment && attachment.size > 0) {
        const arrayBuffer = await attachment.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        messageContent = `data:${attachment.type};base64,${buffer.toString('base64')}`;
        
        if (attachment.type.startsWith('image/')) {
            messageType = 'image';
        } else if (attachment.type.startsWith('audio/')) {
            messageType = 'audio';
        } else {
            messageType = 'image'; // Fallback for other file types for now
        }
    } else if (!content) {
        return; // No content, attachment, or GIF
    }


    const newMessage: Message = {
        id: `msg_${Date.now()}`,
        chatId,
        userId,
        content: messageContent,
        timestamp: Date.now(),
        type: messageType,
    };

    const allMessages = await getAllMessages();
    
    if (!allMessages[chatId]) {
        allMessages[chatId] = [];
    }
    allMessages[chatId].push(newMessage);

    const isGeminiChat = chatId.includes(Gemini_USER_ID);

    if (isGeminiChat && newMessage.type === 'text' && newMessage.userId !== Gemini_USER_ID) {
        const { generateChatResponse } = await import('@/ai/flows/chat-flow');
        const botResponse = await generateChatResponse(newMessage.content);

        const botMessage: Message = {
            id: `msg_${Date.now()}_bot`,
            chatId,
            userId: Gemini_USER_ID,
            content: botResponse.content,
            timestamp: Date.now(),
            type: botResponse.type,
        };
        allMessages[chatId].push(botMessage);
    }


    await writeAllMessages(allMessages);
    
    revalidatePath(`/room/${chatId}`);
    revalidatePath(`/dm/${chatId}`);
    revalidatePath('/api/messages');
}

export async function updateAvatar(userId: string, formData: FormData) {
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error("User not found");
    }
    
    const iconSource = formData.get('iconSource') as 'url' | 'upload';
    let avatarUrl = '';

    if (iconSource === 'url') {
        const url = formData.get('avatarUrl') as string;
        if (!url) throw new Error("Avatar URL is required.");
        if (!url.startsWith('http') && !url.startsWith('https://api.dicebear.com')) {
             throw new Error("Invalid URL format");
        }
        avatarUrl = url;
    } else if (iconSource === 'upload') {
        const file = formData.get('avatarFile') as File;
        if (!file || file.size === 0) throw new Error("An image file is required.");
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        avatarUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
    }

    if (!avatarUrl) {
        throw new Error("An avatar must be provided.");
    }
    
    users[userIndex].avatarUrl = avatarUrl;
    await writeUsers(users);
    revalidatePath('/(chat)', 'layout');
}

export async function createRoom(formData: FormData) {
    const name = formData.get('name') as string;
    const iconSource = formData.get('iconSource') as 'seed' | 'url' | 'upload';

    if (!name) {
        throw new Error("Room name is required");
    }

    let iconUrl = '';

    if (iconSource === 'seed') {
        const seed = formData.get('seed') as string;
        if (!seed) throw new Error("Icon seed is required.");
        iconUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${seed}`;
    } else if (iconSource === 'url') {
        const url = formData.get('iconUrl') as string;
        if (!url) throw new Error("Icon URL is required.");
        if (!url.startsWith('http')) {
            throw new Error("Invalid URL format");
        }
        iconUrl = url;
    } else if (iconSource === 'upload') {
        const file = formData.get('iconFile') as File;
        if (!file || file.size === 0) throw new Error("An image file is required.");
        
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        iconUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
    }

    if (!iconUrl) {
        throw new Error("An icon must be provided.");
    }

    const rooms = await getRooms();
    const newRoom: Room = {
        id: `room_${name.toLowerCase().replace(/\s/g, '_')}_${Date.now()}`,
        name: name,
        iconUrl: iconUrl,
        channels: [{ id: `${name}-chat`, name: `${name}-chat` }]
    };
    await writeRooms([...rooms, newRoom]);
    revalidatePath('/(chat)', 'layout');
}

export async function deleteRoom(adminId: string, roomId: string) {
    const rooms = await getRooms();
    const roomToDelete = rooms.find(r => r.id === roomId);
    const updatedRooms = rooms.filter(r => r.id !== roomId);
    await writeRooms(updatedRooms);

    // Also delete messages for that room
    const allMessages = await getAllMessages();
    if (allMessages[roomId]) {
        delete allMessages[roomId];
        await writeAllMessages(allMessages);
    }
    
    await logAdminAction(adminId, "Deleted Room", { roomId, roomName: roomToDelete?.name });

    revalidatePath('/(chat)', 'layout');
    revalidatePath(`/room/${roomId}`);
    revalidatePath('/api/messages');
    redirect('/');
}

export async function deleteMessages(adminId: string, chatId: string) {
    const allMessages = await getAllMessages();
    if (allMessages[chatId]) {
        allMessages[chatId] = [];
        await writeAllMessages(allMessages);
    }
    await logAdminAction(adminId, "Cleared Chat History", { chatId });
    revalidatePath(`/room/${chatId}`);
    revalidatePath(`/dm/${chatId}`);
    revalidatePath('/api/messages');
}

export async function deleteMessage(messageId: string, chatId: string) {
    const allMessages = await getAllMessages();
    if (!allMessages[chatId]) {
        return;
    }

    const messageIndex = allMessages[chatId].findIndex(m => m.id === messageId);

    if (messageIndex === -1) {
        return; // Message not found
    }

    allMessages[chatId].splice(messageIndex, 1);

    await writeAllMessages(allMessages);

    revalidatePath(`/room/${chatId}`);
    revalidatePath(`/dm/${chatId}`);
    revalidatePath('/api/messages');
}


// --- Friend Actions ---

export async function sendFriendRequest(fromUserId: string, toUserId: string) {
    const friendsData = await getFriends();
    
    if (!friendsData[toUserId]) {
        friendsData[toUserId] = { friends: [], requests: [] };
    }
    if (!friendsData[fromUserId]) {
        friendsData[fromUserId] = { friends: [], requests: [] };
    }

    // Don't add if already friends, or request already sent/received
    if (friendsData[toUserId].friends.includes(fromUserId) || friendsData[toUserId].requests.includes(fromUserId) || friendsData[fromUserId].requests.includes(toUserId)) {
        throw new Error("Already friends or request pending.");
    }
    
    friendsData[toUserId].requests.push(fromUserId);
    await writeFriends(friendsData);
    revalidatePath('/(chat)', 'layout');
}

export async function acceptFriendRequest(userId: string, requestingUserId: string) {
    const friendsData = await getFriends();

    // Remove from requests
    friendsData[userId].requests = (friendsData[userId].requests || []).filter(id => id !== requestingUserId);
    
    // Add to friends list for both users
    if (!(friendsData[userId].friends || []).includes(requestingUserId)) {
        friendsData[userId].friends.push(requestingUserId);
    }
    if (!(friendsData[requestingUserId].friends || []).includes(userId)) {
        friendsData[requestingUserId].friends.push(userId);
    }

    await writeFriends(friendsData);
    revalidatePath('/(chat)', 'layout');
}

export async function declineFriendRequest(userId: string, requestingUserId: string) {
    const friendsData = await getFriends();
    friendsData[userId].requests = (friendsData[userId].requests || []).filter(id => id !== requestingUserId);
    await writeFriends(friendsData);
    revalidatePath('/(chat)', 'layout');
}

// --- Admin Actions ---

export async function setUserRole(adminId: string, targetUserId: string, role: 'admin' | 'user') {
    const users = await getUsers();
    const targetUser = users.find(u => u.id === targetUserId);

    if (!targetUser) throw new Error("User not found");
    if (targetUser.username === 'gollclock') throw new Error("Cannot change the primary admin's role.");

    targetUser.role = role;
    await writeUsers(users);
    await logAdminAction(adminId, "Set User Role", { targetUserId, targetUsername: targetUser.username, role });
    revalidatePath('/(chat)', 'layout');
}

export async function setUserBanStatus(adminId: string, targetUserId: string, isBanned: boolean) {
    const users = await getUsers();
    const targetUser = users.find(u => u.id === targetUserId);

    if (!targetUser) throw new Error("User not found");
    if (targetUser.username === 'gollclock') throw new Error("Cannot ban the primary admin.");

    targetUser.isBanned = isBanned;
    await writeUsers(users);
    await logAdminAction(adminId, isBanned ? "Banned User" : "Unbanned User", { targetUserId, targetUsername: targetUser.username });
    revalidatePath('/(chat)', 'layout');
}

export async function sendAnnouncement(adminId: string, message: string) {
    if (!message) throw new Error("Announcement message cannot be empty.");
    
    const admin = (await getUsers()).find(u => u.id === adminId);
    if (!admin) throw new Error("Admin user not found");

    const newAnnouncement: Announcement = {
        id: `announcement_${Date.now()}`,
        adminName: admin.username,
        message,
        timestamp: Date.now(),
    };

    const announcements = (await getAnnouncements()).slice(0, 19);
    announcements.unshift(newAnnouncement);

    await writeAnnouncements(announcements);
    await logAdminAction(adminId, "Sent Announcement", { message });
    revalidatePath('/(chat)', 'layout');
}

export async function setSystemShutdown(adminId: string, isShutdown: boolean, message?: string) {
    await writeSystemState({ isShutdown, shutdownMessage: message || '' });
    await logAdminAction(adminId, isShutdown ? "System Shutdown" : "System Enabled", { message: message || '' });
    revalidatePath('/(chat)', 'layout');
}

export async function updateUsername(adminId: string, userId: string, newUsername: string) {
    if (!newUsername || newUsername.length < 3) throw new Error("Username must be at least 3 characters long.");
    
    const users = await getUsers();
    const userToUpdate = users.find(u => u.id === userId);

    if (!userToUpdate) throw new Error("User not found");
    if (userToUpdate.username === 'gollclock') throw new Error("Cannot change the primary admin's username.");
    if (users.some(u => u.username === newUsername && u.id !== userId)) throw new Error("Username is already taken.");

    const oldUsername = userToUpdate.username;
    userToUpdate.username = newUsername;
    await writeUsers(users);
    await logAdminAction(adminId, "Updated Username", { userId, oldUsername, newUsername });
    revalidatePath('/(chat)', 'layout');
}

export async function deleteUser(adminId: string, userId: string) {
    const users = await getUsers();
    const userToDelete = users.find(u => u.id === userId);

    if (!userToDelete) throw new Error("User not found");
    if (userToDelete.username === 'gollclock') throw new Error("Cannot delete the primary admin.");

    await writeUsers(users.filter(u => u.id !== userId));

    const friendsData = await getFriends();
    delete friendsData[userId];
    for (const id in friendsData) {
        friendsData[id].friends = friendsData[id].friends.filter(friendId => friendId !== userId);
        friendsData[id].requests = friendsData[id].requests.filter(reqId => reqId !== userId);
    }
    await writeFriends(friendsData);
    
    await logAdminAction(adminId, "Deleted User", { userId, username: userToDelete.username });
    revalidatePath('/(chat)', 'layout');
}

export async function resetPassword(adminId: string, userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) throw new Error("Password must be at least 6 characters long.");
    
    const users = await getUsers();
    const userToUpdate = users.find(u => u.id === userId);

    if (!userToUpdate) throw new Error("User not found");

    userToUpdate.password = newPassword; // In a real app, hash this!
    await writeUsers(users);
    await logAdminAction(adminId, "Reset Password", { userId, username: userToUpdate.username });
}

export async function createUser(adminId: string, formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const parsed = signupSchema.safeParse({ username, password });
    if (!parsed.success) throw new Error(parsed.error.flatten().fieldErrors.username?.[0] || parsed.error.flatten().fieldErrors.password?.[0] || "Invalid input.");
    
    const users = await getUsers();
    if (users.find(u => u.username === username)) throw new Error("User already exists");

    const now = Date.now();
    const newUser: User = {
        id: `user_${now}`,
        username,
        password, // In a real app, hash this!
        avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${username}`,
        role: 'user',
        isBanned: false,
        createdAt: now,
        lastSeen: now,
    };

    await writeUsers([...users, newUser]);
    const friendsData = await getFriends();
    friendsData[newUser.id] = { friends: [], requests: [] };
    await writeFriends(friendsData);

    await logAdminAction(adminId, "Created User", { newUserId: newUser.id, newUsername: newUser.username });
    revalidatePath('/(chat)', 'layout');
}

// 10 new admin actions
export async function lockRoom(adminId: string, roomId: string, isLocked: boolean) {
    const rooms = await getRooms();
    const room = rooms.find(r => r.id === roomId);
    if (!room) throw new Error("Room not found");

    room.isLocked = isLocked;
    await writeRooms(rooms);
    await logAdminAction(adminId, isLocked ? "Locked Room" : "Unlocked Room", { roomId, roomName: room.name });
    revalidatePath('/(chat)', 'layout');
    revalidatePath(`/room/${roomId}`);
}

export async function setRoomTopic(adminId: string, roomId: string, topic: string) {
    const rooms = await getRooms();
    const room = rooms.find(r => r.id === roomId);
    if (!room || !room.channels || room.channels.length === 0) throw new Error("Room or channel not found");
    
    room.channels[0].topic = topic;
    await writeRooms(rooms);
    await logAdminAction(adminId, "Set Room Topic", { roomId, roomName: room.name, topic });
    revalidatePath('/(chat)', 'layout');
}

export async function deleteUserMessages(adminId: string, userId: string) {
    const allMessages = await getAllMessages();
    let deletedCount = 0;
    for (const chatId in allMessages) {
        const originalCount = allMessages[chatId].length;
        allMessages[chatId] = allMessages[chatId].filter(msg => msg.userId !== userId);
        deletedCount += originalCount - allMessages[chatId].length;
    }
    await writeAllMessages(allMessages);
    
    const user = (await getUsers()).find(u => u.id === userId);
    await logAdminAction(adminId, "Deleted All User Messages", { userId, username: user?.username, deletedCount });
    revalidatePath('/(chat)', 'layout');
}

export async function impersonateUser(adminId: string, userId: string) {
    const users = await getUsers();
    const userToImpersonate = users.find(u => u.id === userId);

    if (!userToImpersonate) throw new Error("User not found");
    
    await logAdminAction(adminId, "Impersonated User", { userId, username: userToImpersonate.username });
    
    const { password: _, ...userToReturn } = userToImpersonate;
    const userJson = encodeURIComponent(JSON.stringify(userToReturn));
    redirect(`/login?user=${userJson}`);
}

export async function bulkBanUsers(adminId: string, userIds: string[], isBanned: boolean) {
    const users = await getUsers();
    const targetUsers: string[] = [];
    userIds.forEach(uid => {
        const user = users.find(u => u.id === uid);
        if (user && user.username !== 'gollclock') {
            user.isBanned = isBanned;
            targetUsers.push(user.username);
        }
    });
    await writeUsers(users);
    await logAdminAction(adminId, isBanned ? "Bulk Banned Users" : "Bulk Unbanned Users", { userIds, usernames: targetUsers });
    revalidatePath('/(chat)', 'layout');
}

export async function pruneData(adminId: string, days: number) {
    if (days < 1) throw new Error("Days must be a positive number.");
    
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const allMessages = await getAllMessages();
    let deletedCount = 0;

    for (const chatId in allMessages) {
        const originalCount = allMessages[chatId].length;
        allMessages[chatId] = allMessages[chatId].filter(msg => msg.timestamp >= cutoff);
        deletedCount += originalCount - allMessages[chatId].length;
    }
    
    await writeAllMessages(allMessages);
    await logAdminAction(adminId, "Pruned Data", { olderThanDays: days, deletedCount });
    revalidatePath('/(chat)', 'layout');
}

// --- Wordle Actions ---
export async function isWordValid(word: string): Promise<boolean> {
    if (word.length !== 5) return false;
    
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
        
        // The API returns 404 for words not found
        if (!response.ok) {
            if(response.status === 404) {
                // We can be extra sure by checking the response body as requested
                 const errorData = await response.json();
                 if (errorData.title === "No Definitions Found") {
                    return false;
                 }
            }
            // For other errors (like 500), let's fail open to not block the user.
            return true;
        }

        // If response is ok (status 200), the word is valid.
        return true;

    } catch (e) {
        console.error("Dictionary API fetch error:", e);
        // Fail open - if the API check itself fails, assume the word is valid.
        return true;
    }
}


// --- Code Editor Actions ---

export async function getFileContent(filePath: string) {
    const fullPath = path.join(projectRoot, filePath);
    if (!fullPath.startsWith(projectRoot)) {
        throw new Error("Invalid file path");
    }
    return await fs.readFile(fullPath, 'utf-8');
}

export async function saveFileContent(adminId: string, filePath: string, content: string) {
    const admin = (await getUsers()).find(u => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
        throw new Error("Permission denied.");
    }
    
    const fullPath = path.join(projectRoot, filePath);
    if (!fullPath.startsWith(projectRoot) || fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) {
        throw new Error("Invalid file path");
    }

    await fs.writeFile(fullPath, content, 'utf-8');
    await logAdminAction(adminId, "Edited File", { filePath });
    revalidatePath('/(chat)', 'layout');
    return { success: true };
}

export async function createNewFile(adminId: string, filePath: string) {
    const admin = (await getUsers()).find(u => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
        throw new Error("Permission denied.");
    }

    const fullPath = path.join(projectRoot, filePath);
    if (!fullPath.startsWith(projectRoot) || fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) {
        throw new Error("Invalid file path");
    }
    try {
        await fs.stat(fullPath);
        // If stat succeeds, file exists
        throw new Error("File already exists");
    } catch (e: any) {
        if (e.code !== 'ENOENT') {
            // Re-throw if it's not a "file not found" error
            throw e;
        }
        // If it is ENOENT, we can proceed
    }
    
    await fs.writeFile(fullPath, '', 'utf-8');
    await logAdminAction(adminId, "Created File", { filePath });
    revalidatePath('/(chat)', 'layout');
    return { success: true, path: filePath };
}

export async function uploadFile(adminId: string, formData: FormData) {
    const admin = (await getUsers()).find(u => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
        throw new Error("Permission denied.");
    }

    const file = formData.get('file') as File;
    const filePath = formData.get('path') as string;

    if (!file || !filePath) {
        throw new Error("File and path are required.");
    }

    const fullPath = path.join(projectRoot, filePath, file.name);
     if (!fullPath.startsWith(projectRoot) || fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) {
        throw new Error("Invalid file path");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(fullPath, buffer);

    await logAdminAction(adminId, "Uploaded File", { filePath: path.join(filePath, file.name) });
    revalidatePath('/(chat)', 'layout');
    return { success: true };
}
