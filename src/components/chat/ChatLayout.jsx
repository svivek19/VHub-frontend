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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedUser(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="h-screen flex bg-muted overflow-hidden">
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
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center max-w-sm space-y-4">
              {/* Icon Circle */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 10h8M8 14h5m-9 6 3-3h11a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v11z"
                  />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-lg font-semibold">
                No conversation selected
              </h2>

              {/* Subtitle */}
              <p className="text-sm text-muted-foreground">
                Choose a conversation from the sidebar or start a new chat.
              </p>
            </div>
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
