import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { socket } from "@/socket/socket";
import { useState, useRef, useEffect } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const ChatInput = ({
  selectedUser,
  currentUser,
  onOptimisticMessage,
  replyMessage,
  setReplyMessage,
}) => {
  const [text, setText] = useState("");
  const { theme } = useTheme();
  const [showEmoji, setShowEmoji] = useState(false);

  const emojiRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = () => {
    if (!text.trim()) return;

    onOptimisticMessage(text);

    socket.emit("send-message", {
      senderId: currentUser.id,
      receiverId: selectedUser._id,
      text,
      replyTo: replyMessage?._id,
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

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const emojiTheme =
    theme === "dark"
      ? Theme.DARK
      : theme === "light"
        ? Theme.LIGHT
        : Theme.AUTO;

  return (
    <div className="relative p-4 border-t bg-background flex gap-2 items-center">
      <button
        onClick={() => setShowEmoji(!showEmoji)}
        className="p-2 hover:bg-muted rounded-md transition"
      >
        <Smile size={22} />
      </button>

      {showEmoji && (
        <div ref={emojiRef} className="absolute bottom-16">
          <EmojiPicker onEmojiClick={handleEmojiClick} theme={emojiTheme} />
        </div>
      )}

      {replyMessage && (
        <div className="absolute bottom-16 left-4 right-4 bg-muted p-2 rounded-md text-xs border-l-4 border-blue-500 flex justify-between">
          <span>Replying to: {replyMessage.text}</span>

          <button
            onClick={() => setReplyMessage(null)}
            className="text-red-400 text-xs"
          >
            cancel
          </button>
        </div>
      )}
      <Input
        value={text}
        onKeyDown={handleKeyDown}
        onChange={handleTyping}
        placeholder="Type a message..."
      />

      <Button onClick={sendMessage}>Send</Button>
    </div>
  );
};

export default ChatInput;
