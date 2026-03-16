import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { socket } from "@/socket/socket";
import { getMessages } from "../../services/messageApi";
import Message from "./Message";

const ChatMessages = ({ selectedUser, currentUser, setReplyMessage }) => {
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const containerRef = useRef(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [localMessages, setLocalMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ["messages", selectedUser?._id, page],
    queryFn: () => getMessages(selectedUser._id, page),
    enabled: !!selectedUser,
    keepPreviousData: false,
  });

  // sync api messages
  useEffect(() => {
    if (!data) return;

    const container = containerRef.current;
    const prevHeight = container?.scrollHeight || 0;

    if (data.length === 0) {
      setHasMore(false);
      return;
    }

    setLocalMessages((prev) => {
      if (page === 1) return data;
      return [...data, ...prev];
    });

    setTimeout(() => {
      const newHeight = container?.scrollHeight;
      if (container && prevHeight) {
        container.scrollTop = newHeight - prevHeight;
      }
    }, 0);
  }, [data, page]);

  // receive realtime message
  useEffect(() => {
    const handler = (msg) => {
      // Ensure the message belongs to the selected conversation
      if (String(msg.conversation) !== String(selectedUser?.conversationId))
        return;

      setLocalMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on("receive-message", handler);
    return () => socket.off("receive-message", handler);
  }, [selectedUser]);

  // typing indicator
  useEffect(() => {
    const typingHandler = ({ senderId }) => {
      if (!selectedUser) return;
      if (String(senderId) !== String(selectedUser._id)) return;

      setIsTyping(true);

      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        setIsTyping(false);
      }, 1500);
    };

    socket.on("typing", typingHandler);

    return () => {
      socket.off("typing", typingHandler);
      clearTimeout(typingTimeout.current);
    };
  }, [selectedUser]);

  // seen event from server
  useEffect(() => {
    const seenHandler = ({ conversationId }) => {
      setLocalMessages((prev) =>
        prev.map((msg) =>
          String(msg.conversation) === String(conversationId)
            ? { ...msg, seen: true }
            : msg,
        ),
      );
    };

    socket.on("messages-seen", seenHandler);
    return () => socket.off("messages-seen", seenHandler);
  }, []);

  // mark messages as seen when chat is open
  useEffect(() => {
    if (!selectedUser) return;
    if (!localMessages.length) return;

    const lastMessage = localMessages[localMessages.length - 1];

    // only mark seen if message is from other user
    if (String(lastMessage.sender) === String(currentUser.id)) return;

    const conversationId = lastMessage.conversation;
    if (!conversationId) return;

    socket.emit("mark-seen", {
      conversationId: String(conversationId),
    });
  }, [selectedUser?._id, localMessages.length]);

  // auto scroll
  useEffect(() => {
    if (page === 1) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages.length]);

  useEffect(() => {
    if (!selectedUser) return;

    setPage(1);
    setHasMore(true);
    setLocalMessages([]);
  }, [selectedUser?._id]);

  // --- date grouping helper ---
  const getDateLabel = (dateStr) => {
    const msgDate = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a, b) =>
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear();

    if (isSameDay(msgDate, today)) return "Today";
    if (isSameDay(msgDate, yesterday)) return "Yesterday";

    return msgDate.toLocaleDateString([], {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  useEffect(() => {
    const handler = ({ messageId, type, userId }) => {
      setLocalMessages((prev) =>
        prev
          .map((msg) => {
            if (msg._id !== messageId) return msg;

            if (type === "everyone") {
              return {
                ...msg,
                text: "This message was deleted",
                isDeletedForEveryone: true,
              };
            }

            if (type === "me" && userId === currentUser.id) {
              return null;
            }

            return msg;
          })
          .filter(Boolean),
      );
    };

    socket.on("message-deleted", handler);

    return () => socket.off("message-deleted", handler);
  }, [currentUser.id]);

  useEffect(() => {
    const handler = ({ messageId, reactions }) => {
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg,
        ),
      );
    };

    socket.on("message-reacted", handler);

    return () => socket.off("message-reacted", handler);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop <= 20 && hasMore && !isFetching) {
        setPage((prev) => prev + 1);
      }
    };

    container.addEventListener("scroll", handleScroll);

    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, isFetching]);

  const sortedMessages = useMemo(() => {
    return [...localMessages].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
  }, [localMessages]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastLabel = null;

    sortedMessages.forEach((msg) => {
      const label = getDateLabel(msg.createdAt);

      if (label !== lastLabel) {
        groups.push({
          label,
          messages: [],
        });
        lastLabel = label;
      }

      groups[groups.length - 1].messages.push(msg);
    });

    return groups;
  }, [sortedMessages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 p-4 overflow-y-auto  bg-[#efeae2] dark:bg-[#0b141a]"
      style={{
        backgroundImage:
          "radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {groupedMessages.map((group) => (
        <div key={group.label}>
          {/* Date separator */}
          <div className="flex items-center justify-center my-3">
            <span className="bg-gray-200 text-gray-500 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
              {group.label}
            </span>
          </div>

          {/* Messages for this date */}
          <div className="space-y-2">
            {group.messages.map((msg) => (
              <Message
                key={msg._id}
                msg={msg}
                currentUser={currentUser}
                onReply={setReplyMessage}
              />
            ))}
          </div>
        </div>
      ))}

      {isTyping && (
        <div className="text-sm text-gray-500 italic px-2">
          {selectedUser?.name} is typing...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessages;
