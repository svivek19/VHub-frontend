import { ScrollArea } from "@/components/ui/scroll-area";

const ChatSidebar = ({
  conversations,
  loading,
  error,
  selectedUser,
  setSelectedUser,
}) => {
  return (
    <div className="w-72 border-r bg-background">
      <div className="p-4 font-bold text-lg border-b">VHub </div>

      <ScrollArea className="h-[calc(100vh-64px)]">
        {loading && (
          <p className="p-4 text-muted-foreground">Loading users...</p>
        )}

        {error && <p className="p-4 text-red-500">Failed to load users</p>}

        {!loading &&
          conversations &&
          conversations.map((conversation) => (
            <div
              key={conversation._id}
              onClick={() => setSelectedUser(conversation.user)}
              className={`p-4 cursor-pointer hover:bg-accent ${
                selectedUser?._id === conversation.user._id ? "bg-accent" : ""
              }`}
            >
              {conversation.user.name}
            </div>
          ))}

        {conversations.length === 0 && (
          <p className="p-4 text-muted-foreground">
            No chats yet. <br /> Send your first message.
          </p>
        )}
      </ScrollArea>
    </div>
  );
};

export default ChatSidebar;
