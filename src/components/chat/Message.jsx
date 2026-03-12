import React from "react";

const Message = React.memo(({ msg, currentUser }) => {
  const isMe = String(msg.sender) === String(currentUser?.id);

  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow ${
          isMe
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-200 text-black rounded-bl-sm"
        }`}
      >
        {msg.text}

        <div className="text-[10px] opacity-70 mt-1 text-right">{time}</div>

        {isMe && (
          <div className="text-[10px] text-right mt-1 opacity-80">
            {!msg.seen ? "✓" : "✓✓"}
          </div>
        )}
      </div>
    </div>
  );
});

export default Message;
