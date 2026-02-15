import { ScrollArea } from "@/components/ui/scroll-area";

const ChatSidebar = ({ users, selectedUser, setSelectedUser }) => {
  return (
    <div className="w-72 border-r bg-background">
      <div className="p-4 font-bold text-lg border-b">VHub 👽</div>

      <ScrollArea className="h-[calc(100vh-64px)]">
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => setSelectedUser(user)}
            className={`p-4 cursor-pointer hover:bg-accent ${
              selectedUser?.id === user.id ? "bg-accent" : ""
            }`}
          >
            {user.name}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
};

export default ChatSidebar;
