import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "../ui/button";
import NewChatModal from "./NewChatModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { socket } from "@/socket/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const ChatSidebar = ({
  conversations,
  users,
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

  const handleLogout = () => {
    localStorage.clear();

    socket.disconnect();

    queryClient.clear();

    navigate("/");
  };

  return (
    <div className="w-72 border-r bg-background">
      <div className="p-4 border-b flex justify-between items-center">
        <span className="font-bold text-lg">VHub</span>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowUsers(true)}>
            + New
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer h-8 w-8">
                <AvatarFallback>{currentUser?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Notifications</DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem>Help</DropdownMenuItem>
              <DropdownMenuItem className="text-red-500" onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-64px)]">
        {loading && (
          <p className="p-4 text-muted-foreground">Loading chats...</p>
        )}

        {error && <p className="p-4 text-red-500">Failed to load chats</p>}

        {!loading &&
          conversations?.map((conversation) => {
            const user = conversation.participants.find(
              (p) => p._id !== currentUser.id,
            );

            if (!user) return null;

            return (
              <div
                key={conversation._id}
                onClick={() => setSelectedUser(user)}
                className={`p-4 cursor-pointer hover:bg-accent ${
                  selectedUser?._id === user._id ? "bg-accent" : ""
                }`}
              >
                {user.name}
              </div>
            );
          })}

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
