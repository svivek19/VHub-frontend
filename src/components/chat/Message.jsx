import React, { useEffect, useState } from "react";
import { socket } from "@/socket/socket";
import { EllipsisVertical } from "lucide-react";

const Message = React.memo(({ msg, currentUser, onReply }) => {
  const emojis = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

  const isMe = String(msg.sender) === String(currentUser?.id);

  const [menu, setMenu] = useState(false);

  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const deleteForMe = () => {
    socket.emit("delete-message", {
      messageId: msg._id,
      type: "me",
      userId: currentUser.id,
    });

    setMenu(false);
  };

  const deleteForEveryone = () => {
    socket.emit("delete-message", {
      messageId: msg._id,
      type: "everyone",
      userId: currentUser.id,
    });

    setMenu(false);
  };

  const reactToMessage = (emoji) => {
    socket.emit("react-message", {
      messageId: msg._id,
      userId: currentUser.id,
      emoji,
    });
  };

  useEffect(() => {
    const close = () => setMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <div
      className={`flex w-full mb-3 ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div className="relative group max-w-[65%]">
        {/* message bubble */}
        <div
          id={msg._id}
          className={`
        px-4 py-2 rounded-2xl text-sm shadow-sm
        ${
          isMe
            ? "bg-linear-to-r from-blue-500 to-blue-600 text-white"
            : "bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-100"
        }
      `}
        >
          {msg.replyTo && (
            <div
              onClick={() => {
                document
                  .getElementById(msg.replyTo._id)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="bg-black/5 dark:bg-white/10 border-l-4 border-blue-500 pl-2 py-1 mb-1 rounded-sm text-xs cursor-pointer hover:bg-black/10 dark:hover:bg-white/20 transition"
            >
              <span className="block font-medium text-blue-500">
                {msg.replyTo.sender === currentUser.id
                  ? "You"
                  : selectedUser?.name}
              </span>

              <span className="block opacity-80 ">{msg.replyTo.text}</span>
            </div>
          )}
          <div className={msg.isDeletedForEveryone ? "italic opacity-70" : ""}>
            {msg.isDeletedForEveryone ? "This message was deleted" : msg.text}
          </div>

          <div className="flex items-center justify-end gap-1 mt-1 text-[11px] opacity-70">
            <span>{time}</span>

            {isMe && !msg.isDeletedForEveryone && (
              <span className={msg.seen ? "text-blue-300" : "text-gray-200"}>
                {!msg.seen ? "✓" : "✓✓"}
              </span>
            )}
          </div>
        </div>

        {/* three dots button */}
        {!msg.isDeletedForEveryone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenu(!menu);
            }}
            className={`
    absolute top-4
    ${isMe ? "-left-6" : "-right-6"}
    text-gray-500 hover:text-gray-700
  `}
          >
            <EllipsisVertical size={18} />
          </button>
        )}

        {/* popup menu */}
        {menu && (
          <div
            className={`
          absolute z-50 mt-2
          ${isMe ? "right-0" : "left-0"}
          bg-white dark:bg-[#202c33]
          border border-gray-200 dark:border-gray-700
          rounded-xl shadow-xl p-2 w-44
        `}
          >
            {/* reactions */}
            <div className="flex justify-between mb-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => reactToMessage(emoji)}
                  className="text-lg hover:scale-125 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

            {/* delete options */}
            <button
              onClick={deleteForMe}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-[#2a3942]"
            >
              Delete for me
            </button>

            <button
              onClick={() => onReply(msg)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Reply
            </button>

            {isMe && !msg.isDeletedForEveryone && (
              <button
                onClick={deleteForEveryone}
                className="block w-full text-left px-2 py-1 text-red-500 hover:bg-gray-100 dark:hover:bg-[#2a3942]"
              >
                Delete for everyone
              </button>
            )}
          </div>
        )}

        {/* reactions display */}
        {msg.reactions?.length > 0 && (
          <div className="flex gap-1 mt-1">
            {msg.reactions.map((r, i) => (
              <span
                key={i}
                className="text-xs bg-gray-200 dark:bg-[#2a3942] px-2 py-0.5 rounded-full"
              >
                {r.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default Message;
