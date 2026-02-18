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
  const [optimisticMessages, setOptimisticMessages] = useState([]);
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

  const addTempMessage = (text) => {
    const tempMsg = {
      _id: "temp-" + Date.now(),
      sender: currentUser.id,
      text,
      createdAt: new Date(),
      status: "sending",
    };

    setOptimisticMessages((prev) => [...prev, tempMsg]);
  };

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      console.log("SOCKET CONNECTED:", socket.id);

      if (currentUser) {
        socket.emit("user-connected", String(currentUser.id));
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
        optimisticMessages={optimisticMessages}
      />

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <ChatHeader selectedUser={selectedUser} />

            <ChatMessages
              selectedUser={selectedUser}
              currentUser={currentUser}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat
          </div>
        )}

        {selectedUser && (
          <ChatInput
            selectedUser={selectedUser}
            currentUser={currentUser}
            onOptimisticMessage={addTempMessage}
          />
        )}
      </div>
    </div>
  );
};

export default ChatLayout;
