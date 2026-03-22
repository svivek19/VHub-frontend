import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { socket } from "@/socket/socket";
import { useState, useRef, useEffect } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useUpload } from "@/hooks/useUpload";

const ChatInput = ({
  selectedUser,
  currentUser,
  messagesRef,
  replyMessage,
  setReplyMessage,
}) => {
  const [text, setText] = useState("");
  const { theme } = useTheme();
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const { upload, progress, uploading } = useUpload();
  const emojiRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (!text.trim() && !image) return;

    const tempId = "temp-" + Date.now();
    const capturedText = text;
    const capturedImage = image;
    const capturedPreview = preview;

    messagesRef?.current?.markShouldScroll();

    // 1. Show optimistic message immediately
    messagesRef?.current?.addOptimistic({
      _id: tempId,
      sender: currentUser.id,
      text: capturedText,
      image: capturedPreview, // blob URL shown while uploading
      createdAt: new Date(),
      status: capturedImage ? "uploading" : "sent",
    });

    // Clear inputs right away so the user can type next message
    setText("");
    setImage(null);
    setPreview(null);
    setReplyMessage?.(null);

    if (capturedImage) {
      // ── Image flow ──────────────────────────────────────────────────────
      // Run Cloudinary upload and socket send-message in PARALLEL.
      // We also set up a one-shot listener to catch the server echo (_id).
      // Only after BOTH are done do we emit update-message-image.

      let resolveEcho;
      const echoPromise = new Promise((res) => {
        resolveEcho = res;
      });

      const echoHandler = (msg) => {
        socket.off("receive-message", echoHandler);
        resolveEcho(String(msg._id));
      };
      // Register BEFORE emitting so we never miss the echo
      socket.on("receive-message", echoHandler);

      // Emit the text-only message now
      socket.emit("send-message", {
        senderId: currentUser.id,
        receiverId: selectedUser._id,
        text: capturedText,
        replyTo: replyMessage?._id,
      });

      try {
        // Wait for both upload and server echo simultaneously
        const [imageUrl, messageId] = await Promise.all([
          upload(capturedImage),
          echoPromise,
        ]);

        // Replace the optimistic entry with confirmed server data + real URL
        messagesRef?.current?.replaceMessage(tempId, {
          _id: messageId,
          sender: currentUser.id,
          text: capturedText,
          image: imageUrl,
          createdAt: new Date(),
          status: "sent",
        });

        // Persist the image URL on the DB document
        socket.emit("update-message-image", {
          tempId,
          messageId,
          image: imageUrl,
        });
      } catch (err) {
        console.error("Image upload failed:", err);
        socket.off("receive-message", echoHandler); // clean up if upload fails
      }
    } else {
      // ── Text-only flow ───────────────────────────────────────────────────
      socket.emit("send-message", {
        senderId: currentUser.id,
        receiverId: selectedUser._id,
        text: capturedText,
        replyTo: replyMessage?._id,
      });
    }
  };

  let lastTypingTime = 0;

  const handleTyping = (e) => {
    setText(e.target.value);

    const now = Date.now();

    if (now - lastTypingTime > 500) {
      socket.emit("typing", {
        senderId: currentUser.id,
        receiverId: selectedUser._id,
      });
      lastTypingTime = now;
    }

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", {
        senderId: currentUser.id,
        receiverId: selectedUser._id,
      });
    }, 1500);
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        <div ref={emojiRef} className="absolute bottom-16 z-50">
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

      <input
        type="file"
        accept="image/*"
        hidden
        id="imageInput"
        onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;
          setImage(file);
          setPreview(URL.createObjectURL(file));
          e.target.value = "";
        }}
      />

      <button
        onClick={() => document.getElementById("imageInput").click()}
        className="p-2 hover:bg-muted rounded-md"
      >
        📎
      </button>

      {preview && (
        <div className="absolute bottom-20 left-4 bg-background p-2 rounded-lg shadow-md z-10">
          <img src={preview} className="w-24 h-24 object-cover rounded-md" />

          {uploading && (
            <div className="w-full bg-gray-200 h-1 mt-2 rounded">
              <div
                className="bg-blue-500 h-1 rounded transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <button
            onClick={() => {
              setImage(null);
              setPreview(null);
            }}
            className="text-red-400 text-xs mt-1"
          >
            cancel
          </button>
        </div>
      )}

      <Button onClick={sendMessage} disabled={uploading}>
        {uploading ? `${progress}%` : "Send"}
      </Button>
    </div>
  );
};

export default ChatInput;
