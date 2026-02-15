import { useState } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

const ChatLayout = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  const users = [
    { id: 1, name: "Arun" },
    { id: 2, name: "Rahul" },
    { id: 3, name: "Kavi" },
  ];

  return (
    <div className="h-screen flex bg-muted">
      <ChatSidebar
        users={users}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
      />

      <div className="flex-1 flex flex-col">
        <ChatHeader selectedUser={selectedUser} />
        <ChatMessages selectedUser={selectedUser} />
        {selectedUser && <ChatInput />}
      </div>
    </div>
  );
};

export default ChatLayout;
