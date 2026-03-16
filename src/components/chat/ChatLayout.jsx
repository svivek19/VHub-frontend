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
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

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
    <div className="h-dvh flex bg-muted overflow-hidden">
      <div
        className={`
  w-full md:w-[320px] lg:w-87.5 shrink-0
  ${selectedUser || activePage == "profile" ? "hidden md:block" : "block"}
`}
      >
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
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {activePage === "profile" && (
          <ProfilePage
            currentUser={currentUser}
            onClose={() => setActivePage("chat")}
          />
        )}

        {activePage === "chat" && (
          <>
            {selectedUser ? (
              <>
                <ChatHeader
                  selectedUser={selectedUser}
                  setSelectedUser={setSelectedUser}
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
              <div className="flex-1 flex items-center justify-center bg-background min-h-full">
                <div className="flex flex-col items-center gap-4 max-w-70 text-center">
                  <div className="w-14 h-14 rounded-xl border border-border bg-muted flex items-center justify-center">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-muted-foreground"
                      />
                      <line
                        x1="9"
                        y1="9"
                        x2="15"
                        y2="9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        className="text-muted-foreground"
                      />
                      <line
                        x1="9"
                        y1="13"
                        x2="13"
                        y2="13"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        className="text-muted-foreground"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-medium text-foreground">
                      No conversation selected
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Choose a conversation from the sidebar.
                    </p>
                  </div>
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
