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
  DropdownMenuSubTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { socket } from "@/socket/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
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

  const filteredConversations = conversations?.filter((conversation) => {
    const user = conversation.participants.find(
      (p) => String(p._id) !== String(currentUser.id),
    );

    if (!user) return false;

    return user.name.toLowerCase().includes(search.toLowerCase());
  });

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
              <DropdownMenuSub>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedUser(null);
                    setActivePage("profile");
                  }}
                >
                  Profile
                </DropdownMenuItem>

                <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>

                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Sun className="mr-2 h-4 w-4" />
                      Light
                    </div>
                    {theme === "light" && <span className="text-xs">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Moon className="mr-2 h-4 w-4" />
                      Dark
                    </div>
                    {theme === "dark" && <span className="text-xs">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setTheme("system")}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Laptop className="mr-2 h-4 w-4" />
                      System
                    </div>
                    {theme === "system" && <span className="text-xs">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

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
                key={conversation._id}
                onClick={() => {
                  setSelectedUser(user);
                  setActivePage("chat");

                  setUnread((prev) => ({
                    ...prev,
                    [conversation._id]: 0,
                  }));
                }}
                className={`p-4 cursor-pointer hover:bg-accent flex justify-between items-center ${
                  selectedUser?._id === user._id ? "bg-accent" : ""
                }`}
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

                  <span className="text-xs text-gray-500 mt-1">
                    {isOnline ? "Online" : formatLastSeen(user.lastSeen)}
                  </span>
                </div>

                {unreadCount > 0 && selectedUser?._id !== user._id && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
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
