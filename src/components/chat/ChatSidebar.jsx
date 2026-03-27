import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "../ui/button";
import NewChatModal from "./NewChatModal";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, Laptop } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { socket } from "@/socket/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { formatLastSeen } from "@/utils/format";

const ChatSidebar = ({
  conversations,
  users,
  setActivePage,
  onlineUsers,
  unread,
  setUnread,
  showUsers,
  setShowUsers,
  loading,
  error,
  selectedUser,
  setSelectedUser,
  currentUser,
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    localStorage.clear();

    socket.disconnect();

    queryClient.clear();

    navigate("/");
  };

  const filteredConversations = useMemo(() => {
    return conversations?.filter((conversation) => {
      const user = conversation.participants.find(
        (p) => String(p._id) !== String(currentUser.id),
      );

      if (!user) return false;

      return user.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [conversations, search]);

  return (
    <div className="h-screen border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <span className="font-bold text-lg">VHub</span>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowUsers(true)}>
            + New
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer h-8 w-8">
                <AvatarFallback>{currentUser?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 p-1">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(null);
                  setActivePage("profile");
                }}
              >
                Profile
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Theme</DropdownMenuLabel>

              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Laptop className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1 h-0">
        {loading && (
          <p className="p-4 text-muted-foreground">Loading chats...</p>
        )}

        {error && <p className="p-4 text-red-500">Failed to load chats</p>}

        <div className="p-2 border-b">
          <input
            type="search"
            placeholder="Search..."
            aria-label="Search conversations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1 rounded border bg-background"
          />
        </div>

        {!loading &&
          filteredConversations?.map((conversation) => {
            const user = conversation.participants.find(
              (p) => String(p._id) !== String(currentUser.id),
            );

            if (!user) return null;

            const isOnline = onlineUsers.includes(String(user._id));

            const unreadCount =
              unread[conversation._id] ?? conversation.unreadCount ?? 0;

            return (
              <div
                className={`p-4 cursor-pointer hover:bg-accent flex justify-between items-center ${
                  selectedUser?._id === user._id ? "bg-accent" : ""
                }`}
              >
                <button
                  key={conversation._id}
                  onClick={() => {
                    setSelectedUser(user);
                    setActivePage("chat");

                    setUnread((prev) => ({
                      ...prev,
                      [conversation._id]: 0,
                    }));
                  }}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                        {user.name[0]}
                      </div>
                      <span>{user.name}</span>

                      {isOnline && (
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </div>

                    <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {isOnline ? "Online" : formatLastSeen(user.lastSeen)}
                    </span>
                  </div>

                  {unreadCount > 0 && selectedUser?._id !== user._id && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            );
          })}

        {!loading && search && filteredConversations?.length === 0 && (
          <p className="p-4 text-muted-foreground">No user found</p>
        )}

        {conversations.length === 0 && (
          <p className="p-4 text-muted-foreground">
            No chats yet. Send your first message.
          </p>
        )}
      </ScrollArea>

      <NewChatModal
        open={showUsers}
        onOpenChange={setShowUsers}
        users={users}
        onSelectUser={setSelectedUser}
      />
    </div>
  );
};

export default ChatSidebar;
