import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import ChatSidebar from "./ChatSidebar";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

import { getConversations } from "../../services/conversationApi";

const ChatLayout = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });

  return (
    <div className="h-screen flex bg-muted">
      <ChatSidebar
        conversations={conversations}
        loading={isLoading}
        error={error}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        currentUser={currentUser}
      />

      <div className="flex-1 flex flex-col">
        <ChatHeader selectedUser={selectedUser} />

        <ChatMessages selectedUser={selectedUser} />

        {selectedUser && (
          <ChatInput selectedUser={selectedUser} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
};

export default ChatLayout;
