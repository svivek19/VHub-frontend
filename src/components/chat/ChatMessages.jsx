import { useQuery } from "@tanstack/react-query";
import { getMessages } from "../../services/messageApi";

const ChatMessages = ({ selectedUser }) => {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", selectedUser?._id],
    queryFn: () => getMessages(selectedUser._id),
    enabled: !!selectedUser,
  });

  if (!selectedUser) return null;

  if (isLoading) return <p>Loading messages...</p>;

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {messages.map((msg) => (
        <div key={msg._id} className="mb-2">
          {msg.text}
        </div>
      ))}
    </div>
  );
};

export default ChatMessages;
