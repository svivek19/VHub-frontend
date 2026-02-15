import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { socket } from "@/socket/socket";
import { useState } from "react";

const ChatInput = ({ selectedUser, currentUser }) => {
  const [text, setText] = useState("");

  const sendMessage = () => {
    if (!text.trim()) return;

    console.log({
      senderId: currentUser?.id,
      receiverId: selectedUser?._id,
      text,
      connected: socket.connected,
    });

    socket.emit("send-message", {
      senderId: currentUser.id,
      receiverId: selectedUser._id,
      text,
    });

    setText("");
  };

  return (
    <div className="p-4 border-t bg-background flex gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
      />
      <Button onClick={sendMessage}>Send</Button>
    </div>
  );
};

export default ChatInput;
