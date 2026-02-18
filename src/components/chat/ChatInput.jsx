import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { socket } from "@/socket/socket";
import { useState } from "react";

const ChatInput = ({ selectedUser, currentUser, onOptimisticMessage }) => {
  const [text, setText] = useState("");

  const sendMessage = () => {
    if (!text.trim()) return;

    onOptimisticMessage(text);

    socket.emit("send-message", {
      senderId: currentUser.id,
      receiverId: selectedUser._id,
      text,
    });

    setText("");
  };

  const handleTyping = (e) => {
    setText(e.target.value);

    socket.emit("typing", {
      senderId: currentUser.id,
      receiverId: selectedUser._id,
    });
  };

  return (
    <div className="p-4 border-t bg-background flex gap-2">
      <Input
        value={text}
        onChange={handleTyping}
        placeholder="Type a message..."
      />
      <Button onClick={sendMessage}>Send</Button>
    </div>
  );
};

export default ChatInput;
