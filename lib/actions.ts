"use server";

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { Message, User, Room, FriendsData, Announcement, AllAnnouncements, SystemState } from './definitions';
import {
  getUsers, writeUsers, getRooms, writeRooms, getAllMessages, writeAllMessages,
  getFriends, writeFriends, getAnnouncements, writeAnnouncements, getSystemState, writeSystemState
} from './data';

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

  const newUser: User = {
    id: `user_${Date.now()}`,
    username,
    password, // In a real app, hash this!
    avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${username}`,
    role: 'user',
    isBanned: false,
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
});

export async function sendMessage(formData: FormData) {
    const parsed = messageSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
        console.error("Invalid message data", parsed.error);
        throw new Error("Invalid message data");
    }

    const { content, chatId, userId, attachment } = parsed.data;
    
    let messageContent = content || '';
    let messageType: Message['type'] = 'text';

    if (attachment && attachment.size > 0) {
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
        return; // No content and no attachment
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

export async function deleteRoom(roomId: string) {
    const rooms = await getRooms();
    const updatedRooms = rooms.filter(r => r.id !== roomId);
    await writeRooms(updatedRooms);

    // Also delete messages for that room
    const allMessages = await getAllMessages();
    if (allMessages[roomId]) {
        delete allMessages[roomId];
        await writeAllMessages(allMessages);
    }
    revalidatePath('/(chat)', 'layout');
    revalidatePath(`/room/${roomId}`);
    revalidatePath('/api/messages');
    redirect('/');
}

export async function deleteMessages(chatId: string) {
    const allMessages = await getAllMessages();
    if (allMessages[chatId]) {
        allMessages[chatId] = [];
        await writeAllMessages(allMessages);
    }
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

export async function setUserRole(targetUserId: string, role: 'admin' | 'user') {
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === targetUserId);

    if (userIndex === -1) {
        throw new Error("User not found");
    }
    if (users[userIndex].username === 'gollclock') {
        throw new Error("Cannot change the primary admin's role.");
    }

    users[userIndex].role = role;
    await writeUsers(users);
    revalidatePath('/(chat)', 'layout');
}

export async function setUserBanStatus(targetUserId: string, isBanned: boolean) {
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === targetUserId);

    if (userIndex === -1) {
        throw new Error("User not found");
    }
    if (users[userIndex].username === 'gollclock') {
        throw new Error("Cannot ban the primary admin.");
    }

    users[userIndex].isBanned = isBanned;
    await writeUsers(users);
    revalidatePath('/(chat)', 'layout');
}

export async function sendAnnouncement(message: string, adminName: string) {
    if (!message) {
        throw new Error("Announcement message cannot be empty.");
    }

    const newAnnouncement: Announcement = {
        id: `announcement_${Date.now()}`,
        adminName,
        message,
        timestamp: Date.now(),
    };

    const announcements = await getAnnouncements();
    announcements.unshift(newAnnouncement); // Add to the beginning

    // Keep only the latest 20 announcements
    const trimmedAnnouncements = announcements.slice(0, 20);

    await writeAnnouncements(trimmedAnnouncements);
    revalidatePath('/(chat)', 'layout');
}

export async function setSystemShutdown(isShutdown: boolean) {
    await writeSystemState({ isShutdown });
    revalidatePath('/(chat)', 'layout');
}
