const ChatHeader = ({ selectedUser, onlineUsers }) => {
  if (!selectedUser) {
    return (
      <div className="h-16 border-b flex items-center px-4 bg-background font-semibold">
        Select a chat
      </div>
    );
  }

  const isOnline = onlineUsers?.includes(selectedUser._id);

  return (
    <div className="h-16 border-b flex flex-col justify-center px-4 bg-background">
      <span className="font-semibold">{selectedUser.name}</span>

      <span className="text-xs text-gray-500">
        {isOnline
          ? "Online"
          : selectedUser.lastSeen
            ? `Last seen ${new Date(
                selectedUser.lastSeen,
              ).toLocaleTimeString()}`
            : "Offline"}
      </span>
    </div>
  );
};

export default ChatHeader;
