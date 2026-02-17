import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { socket } from "@/socket/socket";
import { getMessages } from "../../services/messageApi";

const ChatMessages = ({ selectedUser }) => {
  const [socketMessages, setSocketMessages] = useState([]);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedUser?._id],
    queryFn: () => getMessages(selectedUser._id),
    enabled: !!selectedUser,
  });

  // reset realtime messages when user changes
  useEffect(() => {
    setSocketMessages([]);
  }, [selectedUser?._id]);

  // listen socket only ONCE
  useEffect(() => {
    const handler = (msg) => {
      setSocketMessages((prev) => {
        const exists = prev.some((m) => m._id === msg._id);
        if (exists) return prev;
        return [...prev, msg];
      });
    };

    socket.on("receive-message", handler);

    return () => {
      socket.off("receive-message", handler);
    };
  }, []);

  const allMessages = [...messages, ...socketMessages].filter(
    (msg, index, self) => index === self.findIndex((m) => m._id === msg._id),
  );

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {allMessages.map((msg) => (
        <div key={msg._id || msg.createdAt}>{msg.text}</div>
      ))}
    </div>
  );
};

export default ChatMessages;
