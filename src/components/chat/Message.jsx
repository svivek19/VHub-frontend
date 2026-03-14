import React, { useEffect, useState } from "react";
import { socket } from "@/socket/socket";

const Message = React.memo(({ msg, currentUser }) => {
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

  useEffect(() => {
    const close = () => setMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <div
      className={`flex w-full ${isMe ? "justify-end" : "justify-start"} relative`}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu(true);
      }}
    >
      <div
        className={`
          max-w-[65%] px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm
          ${
            isMe
              ? "bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
              : "bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-100 rounded-bl-md"
          }
        `}
      >
        <div className="wrap-break-word">{msg.text}</div>

        <div className="flex items-center justify-end gap-1 mt-1 text-[11px] opacity-70">
          <span>{time}</span>

          {isMe && !msg.isDeletedForEveryone && (
            <span className={`${msg.seen ? "text-blue-300" : "text-gray-200"}`}>
              {!msg.seen ? "✓" : "✓✓"}
            </span>
          )}
        </div>
      </div>

      {menu && (
        <div
          className={`
    absolute z-50
    ${isMe ? "right-16" : "left-16"} top-0
    rounded-xl
    bg-white dark:bg-[#202c33]
    border border-gray-200 dark:border-gray-700
    shadow-xl
    overflow-hidden
    min-w-40
  `}
        >
          <button
            onClick={deleteForMe}
            className="px-4 py-2 w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a3942]"
          >
            Delete for me
          </button>

          {isMe && !msg.isDeletedForEveryone && (
            <button
              onClick={deleteForEveryone}
              className="
      block w-full px-4 py-2 text-left
      text-red-500
      hover:bg-gray-100 dark:hover:bg-[#2a3942]
      transition
    "
            >
              Delete for everyone
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default Message;
