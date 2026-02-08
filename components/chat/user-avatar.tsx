import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/lib/definitions";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user?: User;
  className?: string;
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  const fallback = user?.username?.charAt(0).toUpperCase() ?? "U";

  return (
    <Avatar className={cn("h-8 w-8", className)}>
      <AvatarImage src={user?.avatarUrl} alt={user?.username} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
