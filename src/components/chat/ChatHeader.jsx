import { formatLastSeen } from "@/utils/format";

const ChatHeader = ({
  selectedUser,
  onlineUsers,
  setSelectedUser,
  setSearch,
}) => {
  if (!selectedUser) {
    return (
      <div className="h-16 border-b flex items-center px-4 bg-background font-semibold">
        Select a chat
      </div>
    );
  }

  const isOnline = onlineUsers?.includes(selectedUser._id);

  return (
    <div className="h-16 border-b flex items-center px-4 gap-3 bg-background">
      <button
        className="md:hidden text-lg"
        onClick={() => setSelectedUser(null)}
      >
        ←
      </button>

      <div className="flex flex-col">
        <span className="font-semibold">{selectedUser.name}</span>

        <span className="text-xs text-gray-500">
          {isOnline
            ? "Online"
            : selectedUser.lastSeen
              ? `${formatLastSeen(selectedUser.lastSeen)}`
              : "Offline"}
        </span>
      </div>
      <div className="flex-1 flex justify-end">
        <input
          type="search"
          placeholder="Search..."
          onChange={(e) => setSearch(e.target.value)}
          className="w-32 md:w-48 px-2 py-1 text-sm border rounded-md bg-muted outline-none"
        />
      </div>
    </div>
  );
};

export default ChatHeader;
