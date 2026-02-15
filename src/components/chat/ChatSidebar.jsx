import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "../ui/button";
import NewChatModal from "./NewChatModal";

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
  return (
    <div className="w-72 border-r bg-background">
      <div className="p-4 border-b flex justify-between items-center">
        <span className="font-bold">VHub Chats</span>

        <Button size="sm" onClick={() => setShowUsers(true)}>
          + New
        </Button>
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
