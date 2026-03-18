import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { socket } from "@/socket/socket";
import { getMessages } from "../../services/messageApi";
import Message from "./Message";

const ChatMessages = ({
  selectedUser,
  currentUser,
  setReplyMessage,
  search,
}) => {
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const containerRef = useRef(null);

  const activeUserIdRef = useRef(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [matchedIds, setMatchedIds] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [chatMessages, setChatMessages] = useState([]);
  const [searchMessages, setSearchMessages] = useState([]);

  const [isTyping, setIsTyping] = useState(false);

  const isSearchMode = !!search;

  const { data: chatData, isFetching: chatFetching } = useQuery({
    queryKey: ["chat-messages", selectedUser?._id, page],
    queryFn: () => getMessages(selectedUser._id, page, ""),
    enabled: !!selectedUser && !isSearchMode,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: searchData, isFetching: searchFetching } = useQuery({
    queryKey: ["search-messages", selectedUser?._id, search],
    queryFn: () => getMessages(selectedUser._id, 1, search),
    enabled: !!selectedUser && isSearchMode && search.trim().length > 0,
    staleTime: 0,
    keepPreviousData: false,
  });

  const isFetching = isSearchMode ? searchFetching : chatFetching;

  useEffect(() => {
    if (!selectedUser) return;

    activeUserIdRef.current = selectedUser._id;

    setChatMessages([]);
    setSearchMessages([]);
    setMatchedIds([]);
    setActiveIndex(0);
    setPage(1);
    setHasMore(true);
    setIsTyping(false);
  }, [selectedUser?._id]);

  useEffect(() => {
    if (!chatData || isSearchMode) return;
    if (!selectedUser) return;

    if (String(activeUserIdRef.current) !== String(selectedUser._id)) return;

    const LIMIT = 20;
    const container = containerRef.current;
    const prevHeight = container?.scrollHeight || 0;

    setHasMore(chatData.length >= LIMIT);

    setChatMessages((prev) => {
      if (page === 1) return chatData;
      const existingIds = new Set(prev.map((m) => m._id));
      const newMsgs = chatData.filter((m) => !existingIds.has(m._id));
      return [...newMsgs, ...prev];
    });

    if (page > 1) {
      setTimeout(() => {
        const newHeight = container?.scrollHeight;
        if (container && prevHeight) {
          container.scrollTop = newHeight - prevHeight;
        }
      }, 0);
    }
  }, [chatData, selectedUser?._id]);

  useEffect(() => {
    if (!isSearchMode) {
      setSearchMessages([]);
      setMatchedIds([]);
      setActiveIndex(0);
      return;
    }
    if (searchData !== undefined) {
      setSearchMessages(searchData);
    }
  }, [searchData, isSearchMode]);

  useEffect(() => {
    const handler = (msg) => {
      if (String(msg.conversation) !== String(selectedUser?.conversationId))
        return;
      setChatMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };
    socket.on("receive-message", handler);
    return () => socket.off("receive-message", handler);
  }, [selectedUser]);

  useEffect(() => {
    const typingHandler = ({ senderId }) => {
      if (!selectedUser) return;
      if (String(senderId) !== String(selectedUser._id)) return;
      setIsTyping(true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setIsTyping(false), 1500);
    };
    socket.on("typing", typingHandler);
    return () => {
      socket.off("typing", typingHandler);
      clearTimeout(typingTimeout.current);
    };
  }, [selectedUser]);

  useEffect(() => {
    const seenHandler = ({ conversationId }) => {
      setChatMessages((prev) =>
        prev.map((msg) =>
          String(msg.conversation) === String(conversationId)
            ? { ...msg, seen: true }
            : msg,
        ),
      );
    };
    socket.on("messages-seen", seenHandler);
    return () => socket.off("messages-seen", seenHandler);
  }, []);

  useEffect(() => {
    if (!selectedUser || !chatMessages.length) return;
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (String(lastMessage.sender) === String(currentUser.id)) return;
    const conversationId = lastMessage.conversation;
    if (!conversationId) return;
    socket.emit("mark-seen", { conversationId: String(conversationId) });
  }, [selectedUser?._id, chatMessages.length]);

  useEffect(() => {
    if (!isSearchMode && page === 1) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages.length, isSearchMode]);

  useEffect(() => {
    const handler = ({ messageId, type, userId }) => {
      const updater = (prev) =>
        prev
          .map((msg) => {
            if (msg._id !== messageId) return msg;
            if (type === "everyone") {
              return {
                ...msg,
                text: "This message was deleted",
                isDeletedForEveryone: true,
              };
            }
            if (type === "me" && userId === currentUser.id) return null;
            return msg;
          })
          .filter(Boolean);
      setChatMessages(updater);
      setSearchMessages(updater);
    };
    socket.on("message-deleted", handler);
    return () => socket.off("message-deleted", handler);
  }, [currentUser.id]);

  // ─── REALTIME: reactions ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = ({ messageId, reactions }) => {
      const updater = (prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg,
        );
      setChatMessages(updater);
      setSearchMessages(updater);
    };
    socket.on("message-reacted", handler);
    return () => socket.off("message-reacted", handler);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (
        !isSearchMode &&
        container.scrollTop <= 20 &&
        hasMore &&
        !isFetching
      ) {
        setPage((prev) => prev + 1);
      }
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, isFetching, isSearchMode]);

  useEffect(() => {
    if (!isSearchMode) return;
    const ids = searchMessages
      .filter(
        (msg) =>
          !msg.isDeletedForEveryone &&
          msg.text?.toLowerCase().includes(search.toLowerCase()),
      )
      .map((msg) => msg._id);
    setMatchedIds(ids);
    setActiveIndex(0);
  }, [search, searchMessages, isSearchMode]);

  useEffect(() => {
    if (!matchedIds.length) return;
    const id = matchedIds[activeIndex];
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex, matchedIds]);

  const goNext = () =>
    setActiveIndex((prev) => (prev < matchedIds.length - 1 ? prev + 1 : prev));

  const goPrev = () => setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));

  const getDateLabel = (dateStr) => {
    const msgDate = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const isSameDay = (a, b) =>
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear();
    if (isSameDay(msgDate, today)) return "Today";
    if (isSameDay(msgDate, yesterday)) return "Yesterday";
    return msgDate.toLocaleDateString([], {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const activeMessages = isSearchMode ? searchMessages : chatMessages;

  const sortedMessages = useMemo(
    () =>
      [...activeMessages].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      ),
    [activeMessages],
  );

  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastLabel = null;
    sortedMessages.forEach((msg) => {
      const label = getDateLabel(msg.createdAt);
      if (label !== lastLabel) {
        groups.push({ label, messages: [] });
        lastLabel = label;
      }
      groups[groups.length - 1].messages.push(msg);
    });
    return groups;
  }, [sortedMessages]);

  const showNoResults =
    isSearchMode &&
    !searchFetching &&
    searchMessages.length === 0 &&
    search.trim().length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isSearchMode && (
        <div className="bg-background border-b px-4 py-2 flex items-center justify-between shrink-0 min-h-[38px]">
          {searchFetching ? (
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin inline-block" />
              Searching...
            </span>
          ) : matchedIds.length > 0 ? (
            <>
              <span className="text-xs text-muted-foreground">
                {activeIndex + 1} of {matchedIds.length} result
                {matchedIds.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={goPrev}
                  disabled={activeIndex === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 transition"
                  title="Previous result"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  onClick={goNext}
                  disabled={activeIndex === matchedIds.length - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 transition"
                  title="Next result"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-yellow-500 shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              No results for &quot;{search}&quot;
            </span>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 min-h-0 p-4 overflow-y-auto bg-[#efeae2] dark:bg-[#0b141a]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {!isSearchMode && chatFetching && page > 1 && (
          <div className="text-center text-gray-400 text-xs py-2">
            Loading older messages...
          </div>
        )}

        {!isSearchMode && chatFetching && page === 1 && (
          <div className="flex items-center justify-center py-10">
            <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
          </div>
        )}

        {showNoResults && (
          <div className="flex flex-col items-center justify-center gap-3 mt-20 text-center select-none">
            <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="text-yellow-500"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="11" />
                <line x1="11" y1="14" x2="11.01" y2="14" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                No messages found
              </p>
              <p className="text-xs text-gray-400 mt-1">
                No results for &ldquo;
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {search}
                </span>
                &rdquo;
              </p>
            </div>
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.label}>
            <div className="flex items-center justify-center my-3">
              <span className="bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                {group.label}
              </span>
            </div>

            <div className="space-y-2">
              {group.messages.map((msg) => (
                <Message
                  key={msg._id}
                  msg={msg}
                  currentUser={currentUser}
                  selectedUser={selectedUser}
                  onReply={setReplyMessage}
                  search={search}
                  isMatch={matchedIds.includes(msg._id)}
                  isActive={matchedIds[activeIndex] === msg._id}
                />
              ))}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="text-sm text-gray-500 italic px-2 mt-2">
            {selectedUser?.name} is typing...
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ChatMessages;
