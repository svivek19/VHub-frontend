import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ChatInput = () => {
  return (
    <div className="p-4 border-t bg-background flex gap-2">
      <Input placeholder="Type a message..." />
      <Button>Send</Button>
    </div>
  );
};

export default ChatInput;
