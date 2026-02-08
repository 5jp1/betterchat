import { MessagesView } from '@/components/chat/messages-view';
import { MessageInput } from '@/components/chat/message-input';
import { getRooms, getUsers } from '@/lib/data';
import { notFound } from 'next/navigation';

export default async function RoomPage({ params }: { params: { id: string } }) {
  const rooms = await getRooms();
  const allUsers = await getUsers();
  const room = rooms.find(r => r.id === params.id);
  
  if (!room) {
    notFound();
  }

  // The chat ID is the room ID. Messages will be stored under this key.
  const chatId = room.id;

  return (
    <div className="flex h-full flex-col">
      <MessagesView chatId={chatId} allUsers={allUsers} />
      <MessageInput chatId={chatId} room={room} />
    </div>
  );
}
