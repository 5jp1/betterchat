import { getRooms, getUsers, getFriends, getAnnouncements, getSystemState, getAllMessages, getAuditLogs, getProjectStructure } from '@/lib/data';
import { ChatLayout } from '@/components/chat/chat-layout';

export default async function LayoutForChat({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch initial data on the server
  const [rooms, allUsers, friendsData, announcements, systemState, allMessages, auditLogs, projectStructure] = await Promise.all([
    getRooms(),
    getUsers(),
    getFriends(),
    getAnnouncements(),
    getSystemState(),
    getAllMessages(),
    getAuditLogs(),
    getProjectStructure(),
  ]);
  const allChatIds = Object.keys(allMessages);

  return (
    <ChatLayout 
      rooms={rooms} 
      allUsers={allUsers} 
      friendsData={friendsData} 
      announcements={announcements}
      systemState={systemState}
      allChatIds={allChatIds}
      auditLogs={auditLogs}
      projectStructure={projectStructure}
    >
      {children}
    </ChatLayout>
  );
}
