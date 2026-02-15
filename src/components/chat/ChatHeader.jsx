const ChatHeader = ({ selectedUser }) => {
  return (
    <div className="h-16 border-b flex items-center px-4 bg-background font-semibold">
      {selectedUser ? selectedUser.name : "Select a chat"}
    </div>
  );
};

export default ChatHeader;
