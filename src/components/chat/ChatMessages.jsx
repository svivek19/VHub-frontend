const ChatMessages = ({ selectedUser }) => {
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {selectedUser ? (
        <p className="text-muted-foreground">Messages will appear here...</p>
      ) : (
        <p className="text-center mt-10 text-muted-foreground">
          Select a user to start chatting
        </p>
      )}
    </div>
  );
};

export default ChatMessages;
