import React, { useEffect, useState } from "react";
import { socket } from "@/socket/socket";
import { EllipsisVertical } from "lucide-react";

const highlightText = (text, search) => {
  if (!search) return text;

  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return parts.map((part, i) =>
    part.toLowerCase() === search.toLowerCase() ? (
      <span key={i} className="bg-yellow-300 text-black px-0.5 rounded">
        {part}
      </span>
    ) : (
      part
    ),
  );
};

const Message = React.memo(
  ({ msg, currentUser, onReply, selectedUser, search, isActive }) => {
    const emojis = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

    const isMe = String(msg.sender) === String(currentUser?.id);

    const [menu, setMenu] = useState(false);

    const time = React.useMemo(() => {
      return new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }, [msg.createdAt]);

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
        <div className="relative group max-w-[65%] md:max-w-[65%]">
          {/* Message bubble */}
          <div
            id={msg._id}
            className={`
              px-4 py-2 rounded-2xl text-sm shadow-sm transition-all duration-200
              ${isActive ? "ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20" : ""}
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
                className="bg-black/5 dark:bg-white/10 border-l-4 border-blue-400 pl-2 py-1 mb-2 rounded-sm text-xs cursor-pointer hover:bg-black/10 dark:hover:bg-white/20 transition"
              >
                <span className="block font-semibold text-blue-400 mb-0.5">
                  {msg.replyTo.sender === currentUser.id
                    ? "You"
                    : selectedUser?.name}
                </span>
                <span className="block opacity-75 ">{msg.replyTo.text}</span>
              </div>
            )}

            {/* Image — rendered inside the bubble */}
            {msg.image && (
              <img
                src={msg.image}
                alt="attachment"
                className="w-48 rounded-lg mb-1 cursor-pointer hover:scale-105 transition"
                onClick={() => window.open(msg.image, "_blank")}
              />
            )}

            {/* Text — only render when there is actual content */}
            {!msg.isDeletedForEveryone && msg.text && msg.text.trim() && (
              <div>{highlightText(msg.text, search)}</div>
            )}

            {msg.isDeletedForEveryone && (
              <div className="italic opacity-60">This message was deleted</div>
            )}

            <div className="flex items-center justify-end gap-1 mt-1 text-[11px] opacity-60">
              <span>{time}</span>
              {isMe && !msg.isDeletedForEveryone && (
                <span className={msg.seen ? "text-blue-200" : "text-gray-200"}>
                  {msg.seen ? "✓✓" : "✓"}
                </span>
              )}
            </div>
          </div>

          {/* Three-dot button */}
          {!msg.isDeletedForEveryone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenu(!menu);
              }}
              className={`
                absolute top-2
                ${isMe ? "-left-6" : "-right-6"}
                opacity-0 group-hover:opacity-100
                text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                transition-opacity
              `}
            >
              <EllipsisVertical size={16} />
            </button>
          )}

          {/* Popup menu */}
          {menu && (
            <div
              className={`
                absolute z-50 mt-1
                ${isMe ? "right-0" : "left-0"}
                bg-white dark:bg-[#202c33]
                border border-gray-200 dark:border-gray-700
                rounded-xl shadow-xl p-2 w-48
              `}
            >
              {/* Emoji reactions */}
              <div className="flex justify-between px-1 mb-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => reactToMessage(emoji)}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 mb-1" />

              {/* Reply */}
              <button
                onClick={() => {
                  onReply(msg);
                  setMenu(false);
                }}
                className="block w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-[#2a3942] text-gray-700 dark:text-gray-200 transition-colors"
              >
                Reply
              </button>

              {/* Delete for me */}
              <button
                onClick={deleteForMe}
                className="block w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-[#2a3942] text-gray-700 dark:text-gray-200 transition-colors"
              >
                Delete for me
              </button>

              {/* Delete for everyone — only sender */}
              {isMe && !msg.isDeletedForEveryone && (
                <button
                  onClick={deleteForEveryone}
                  className="block w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-[#2a3942] text-red-500 transition-colors"
                >
                  Delete for everyone
                </button>
              )}
            </div>
          )}

          {/* Reactions display */}
          {msg.reactions?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
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
  },
);

export default React.memo(Message, (prev, next) => {
  return (
    prev.msg._id === next.msg._id &&
    prev.msg.text === next.msg.text &&
    prev.msg.seen === next.msg.seen &&
    prev.msg.image === next.msg.image &&
    // JSON.stringify(prev.msg.reactions) === JSON.stringify(next.msg.reactions) &&
    prev.isActive === next.isActive
  );
});
