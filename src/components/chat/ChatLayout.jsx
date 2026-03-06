import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import ChatSidebar from "./ChatSidebar";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

import { getConversations } from "../../services/conversationApi";
import { getUsers } from "../../services/userApi";
import { socket } from "@/socket/socket";
import ProfilePage from "../profile/ProfilePage";

const ChatLayout = () => {
  const queryClient = useQueryClient();
  const [activePage, setActivePage] = useState("chat");
  const [showUsers, setShowUsers] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unread, setUnread] = useState({});
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
    socket.on("online-users", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("online-users");
    };
  }, []);

  useEffect(() => {
    socket.on("unread-message", ({ senderId, conversationId }) => {
      if (selectedUser?._id === senderId) return;
      setUnread((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || 0) + 1,
      }));
    });

    return () => {
      socket.off("unread-message");
    };
  }, [selectedUser]);

  useEffect(() => {
    socket.on("receive-message", () => {
      queryClient.invalidateQueries(["conversations"]);
    });

    return () => {
      socket.off("receive-message");
    };
  }, [queryClient]);

  // useEffect(() => {
  //   if (!selectedUser) return;

  //   const conversation = conversations.find((c) =>
  //     c.participants.some((p) => String(p._id) === String(selectedUser._id)),
  //   );

  //   if (!conversation) return;

  //   socket.emit("open-chat", {
  //     userId: currentUser.id,
  //     conversationId: conversation._id,
  //   });
  // }, [selectedUser, conversations, currentUser]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (activePage === "profile") {
          setActivePage("chat");
          return;
        }

        if (selectedUser) {
          setSelectedUser(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePage, selectedUser]);

  const selectedConversation = conversations.find((c) =>
    c.participants.some((p) => String(p._id) === String(selectedUser?._id)),
  );

  return (
    <div className="h-screen flex bg-muted overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        users={users}
        setActivePage={setActivePage}
        onlineUsers={onlineUsers}
        unread={unread}
        setUnread={setUnread}
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
        {activePage === "profile" && <ProfilePage currentUser={currentUser} />}

        {activePage === "chat" && (
          <>
            {selectedUser ? (
              <>
                <ChatHeader
                  selectedUser={selectedUser}
                  onlineUsers={onlineUsers}
                />

                <ChatMessages
                  selectedUser={selectedUser}
                  currentUser={currentUser}
                  conversationId={selectedConversation?._id}
                />

                <ChatInput
                  selectedUser={selectedUser}
                  currentUser={currentUser}
                  onOptimisticMessage={addTempMessage}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-background">
                <div className="text-center max-w-sm space-y-4">
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

                  <h2 className="text-lg font-semibold">
                    No conversation selected
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Choose a conversation from the sidebar
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatLayout;
