import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { socket } from "@/socket/socket";
import { getMessages } from "../../services/messageApi";

const ChatMessages = ({ selectedUser, currentUser }) => {
  const [socketMessages, setSocketMessages] = useState([]);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedUser?._id],
    queryFn: () => getMessages(selectedUser._id),
    enabled: !!selectedUser,
  });

  useEffect(() => {
    setSocketMessages([]);
  }, [selectedUser?._id]);

  useEffect(() => {
    const handler = (msg) => {
      setSocketMessages((prev) => [...prev, msg]);
    };

    socket.on("receive-message", handler);

    return () => socket.off("receive-message", handler);
  }, []);

  const allMessages = [...messages, ...socketMessages];

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {allMessages.map((msg) => (
        <div key={msg._id}>{msg.text}</div>
      ))}
    </div>
  );
};

export default ChatMessages;
