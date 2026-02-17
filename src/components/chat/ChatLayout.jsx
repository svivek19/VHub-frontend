import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import ChatSidebar from "./ChatSidebar";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

import { getConversations } from "../../services/conversationApi";
import { getUsers } from "../../services/userApi";
import { socket } from "@/socket/socket";

const ChatLayout = () => {
  const [showUsers, setShowUsers] = useState(false);
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

  const { data: users = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: getUsers,
  });

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      console.log("SOCKET CONNECTED:", socket.id);

      if (currentUser) {
        socket.emit("user-connected", String(currentUser._id));
      }
    };

    socket.on("connect", onConnect);

    return () => {
      socket.off("connect", onConnect);
    };
  }, [currentUser]);

  return (
    <div className="h-screen flex bg-muted">
      <ChatSidebar
        conversations={conversations}
        users={users}
        showUsers={showUsers}
        setShowUsers={setShowUsers}
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
