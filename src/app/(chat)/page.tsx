import { MessageSquareDashed } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <MessageSquareDashed className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-2xl font-bold">Welcome to BetterChat</h2>
      <p className="text-muted-foreground">Select a channel or a friend to start a conversation.</p>
    </div>
  );
}
