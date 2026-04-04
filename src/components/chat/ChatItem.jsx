import React from "react";
import { formatLastSeen } from "@/utils/format";

const ChatItem = React.memo(
  ({ user, isOnline, unreadCount, isSelected, onClick }) => {
    return (
      <button
        className={`w-full p-4 flex justify-between ${
          isSelected
            ? "bg-blue-500/15 border-l-[3px] border-blue-500"
            : "hover:bg-accent border-l-[3px] border-transparent"
        }`}
        onClick={onClick}
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm">
              {user.name[0]}
            </div>

            <span>{user.name}</span>

            {isOnline && (
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            )}
          </div>

          <span className="text-xs mt-1">
            {isOnline ? "Online" : formatLastSeen(user.lastSeen)}
          </span>
        </div>

        {unreadCount > 0 && (
          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    );
  },
);

export default ChatItem;
