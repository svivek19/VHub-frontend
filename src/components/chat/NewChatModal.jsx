import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";

const NewChatModal = ({ open, onOpenChange, users, onSelectUser }) => {
  const [search, setSearch] = useState("");

  const recentUsers = useMemo(() => {
    return users.slice(0, 5);
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return [];

    return users.filter((user) =>
      user.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [users, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
        </DialogHeader>

        <Command>
          <CommandInput
            placeholder="Search users..."
            value={search}
            onValueChange={setSearch}
          />

          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>

            {!search &&
              recentUsers.map((user) => (
                <CommandItem
                  key={user._id}
                  onSelect={() => {
                    onSelectUser(user);
                    onOpenChange(false);
                  }}
                >
                  {user.name}
                </CommandItem>
              ))}

            {search &&
              filteredUsers.map((user) => (
                <CommandItem
                  key={user._id}
                  onSelect={() => {
                    onSelectUser(user);
                    onOpenChange(false);
                  }}
                >
                  {user.name}
                </CommandItem>
              ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatModal;
