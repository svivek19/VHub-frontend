import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { socket } from "@/socket/socket";
import { getMessages } from "../../services/messageApi";

const ChatMessages = ({ selectedUser, currentUser }) => {
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  const [localMessages, setLocalMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const { data } = useQuery({
    queryKey: ["messages", selectedUser?._id],
    queryFn: () => getMessages(selectedUser._id),
    enabled: !!selectedUser,
  });

  const messages = data ?? [];

  // sync api messages
  useEffect(() => {
    if (data) setLocalMessages(messages);
  }, [data]);

  // receive realtime message
  useEffect(() => {
    const handler = (msg) => {
      setLocalMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on("receive-message", handler);
    return () => socket.off("receive-message", handler);
  }, []);

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages.length]);

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-2">
      {localMessages.map((msg) => {
        const isMe = String(msg.sender) === String(currentUser?.id);

        const time = new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={msg._id}
            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow ${
                isMe
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-200 text-black rounded-bl-sm"
              }`}
            >
              {msg.text}

              <div className="text-[10px] opacity-70 mt-1 text-right">
                {time}
              </div>

              {isMe && (
                <div className="text-[10px] text-right mt-1 opacity-80">
                  {!msg.seen ? "✓" : "✓✓"}
                </div>
              )}
            </div>
          </div>
        );
      })}

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
