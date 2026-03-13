import React from "react";

const Message = React.memo(({ msg, currentUser }) => {
  const isMe = String(msg.sender) === String(currentUser?.id);

  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
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

          {isMe && (
            <span className={`${msg.seen ? "text-blue-300" : "text-gray-200"}`}>
              {!msg.seen ? "✓" : "✓✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default Message;
