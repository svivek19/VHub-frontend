import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { socket } from "@/socket/socket";
import { getMessages } from "../../services/messageApi";
import Message from "./Message";

const ChatMessages = forwardRef(
  ({ selectedUser, currentUser, setReplyMessage, search }, ref) => {
    const scrollRef = useRef(null);
    const activeUserIdRef = useRef(null);
    const isSendingRef = useRef(false);
    const isPaginatingRef = useRef(false);
    const isAtBottomRef = useRef(true);
    const prevScrollHeightRef = useRef(0);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [chatMessages, setChatMessages] = useState([]);
    const [searchMessages, setSearchMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [matchedIds, setMatchedIds] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);

    const isSearchMode = !!search;
    const isInitialLoadRef = useRef(true);

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const scrollToBottom = useCallback((behavior = "auto") => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    }, []);

    const isNearBottom = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return true;
      return el.scrollHeight - el.scrollTop - el.clientHeight < 300;
    }, []);

    // ─── Imperative handle for ChatInput ─────────────────────────────────────
    useImperativeHandle(ref, () => ({
      addOptimistic: (msg) => {
        isSendingRef.current = true;
        setChatMessages((prev) => [...prev, msg]);
      },
      replaceMessage: (tempId, realMsg) => {
        setChatMessages((prev) =>
          prev.map((m) => (m._id === tempId ? { ...m, ...realMsg } : m)),
        );
      },
      markShouldScroll: () => {},
    }));

    // ─── Queries ──────────────────────────────────────────────────────────────
    const { data: chatData, isFetching: chatFetching } = useQuery({
      queryKey: ["chat-messages", selectedUser?._id, page],
      queryFn: () => getMessages(selectedUser._id, page, ""),
      enabled: !!selectedUser && !isSearchMode,
      staleTime: 1000 * 60 * 5,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    });

    const { data: searchData, isFetching: searchFetching } = useQuery({
      queryKey: ["search-messages", selectedUser?._id, search],
      queryFn: () => getMessages(selectedUser._id, 1, search),
      enabled: !!selectedUser && isSearchMode && search.trim().length > 0,
      staleTime: 0,
      keepPreviousData: false,
    });

    // ─── Reset on user change ─────────────────────────────────────────────────
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
      isAtBottomRef.current = true;
      setShowScrollBtn(false);
      isInitialLoadRef.current = true;
      isPaginatingRef.current = false;
    }, [selectedUser?._id]);

    // ─── Populate chat messages from query ───────────────────────────────────
    useEffect(() => {
      if (!chatData || isSearchMode) return;
      if (!selectedUser) return;
      if (String(activeUserIdRef.current) !== String(selectedUser._id)) return;

      const LIMIT = 20;
      setHasMore(chatData.length >= LIMIT);

      if (page === 1) {
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 500);

        setChatMessages((prev) => {
          const isFirstLoad = prev.length === 0;
          const serverIds = new Set(chatData.map((m) => m._id));

          // Preserve realtime + optimistic messages on query refetch
          // (ChatLayout invalidates on every receive-message)
          const lastServerTime = chatData[chatData.length - 1]?.createdAt ?? 0;
          const extra = prev.filter((m) => {
            if (serverIds.has(m._id)) return false;
            if (typeof m._id === "string" && m._id.startsWith("temp-"))
              return true;
            return new Date(m.createdAt) > new Date(lastServerTime);
          });

          if (isFirstLoad) {
            setTimeout(() => scrollToBottom("auto"), 50);
          }

          return [...chatData, ...extra];
        });
      } else {
        // Pagination: save scroll height before prepend so we can restore position
        const el = scrollRef.current;
        prevScrollHeightRef.current = el ? el.scrollHeight : 0;

        setChatMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const older = chatData.filter((m) => !existingIds.has(m._id));
          isPaginatingRef.current = false;
          return [...older, ...prev];
        });
      }
    }, [chatData, selectedUser?._id]);

    // ─── Restore scroll position after pagination prepend ────────────────────
    // After older messages are prepended, the browser would normally jump to top.
    // We restore it by adding the height difference back.
    useEffect(() => {
      if (page === 1) return;
      const el = scrollRef.current;
      if (!el || !prevScrollHeightRef.current) return;
      // Use requestAnimationFrame to run after DOM paint
      requestAnimationFrame(() => {
        const newScrollHeight = el.scrollHeight;
        const diff = newScrollHeight - prevScrollHeightRef.current;
        if (diff > 0) {
          el.scrollTop = diff;
        }
        prevScrollHeightRef.current = 0;
      });
    }, [chatMessages, page]);

    // ─── Populate search messages ─────────────────────────────────────────────
    useEffect(() => {
      if (!isSearchMode) {
        setSearchMessages([]);
        setMatchedIds([]);
        setActiveIndex(0);
        return;
      }
      if (searchData !== undefined) setSearchMessages(searchData);
    }, [searchData, isSearchMode]);

    // ─── REALTIME: new messages ───────────────────────────────────────────────
    useEffect(() => {
      const handler = (msg) => {
        const conversationMatches =
          selectedUser?.conversationId &&
          String(msg.conversation) === String(selectedUser.conversationId);
        const senderIsOtherUser =
          String(msg.sender) === String(selectedUser?._id);
        if (!conversationMatches && !senderIsOtherUser) return;

        setChatMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(msg._id))) return prev;

          const tempIndex = prev.findIndex(
            (m) =>
              typeof m._id === "string" &&
              m._id.startsWith("temp-") &&
              String(m.sender) === String(msg.sender) &&
              (m.text === msg.text || !m.text),
          );

          if (tempIndex !== -1) {
            const optimistic = prev[tempIndex];
            const merged = {
              ...msg,
              image: optimistic.image || msg.image || null,
            };
            const next = [...prev];
            next[tempIndex] = merged;
            return next;
          }

          return [...prev, msg];
        });
      };

      socket.on("receive-message", handler);
      return () => socket.off("receive-message", handler);
    }, [selectedUser, currentUser]);

    // ─── REALTIME: image patch ────────────────────────────────────────────────
    useEffect(() => {
      const handler = ({ tempId, messageId, image }) => {
        const patch = (prev) =>
          prev.map((msg) =>
            String(msg._id) === String(messageId) || msg._id === tempId
              ? { ...msg, image, status: "sent" }
              : msg,
          );
        setChatMessages(patch);
        setSearchMessages(patch);
      };
      socket.on("message-image-updated", handler);
      return () => socket.off("message-image-updated", handler);
    }, []);

    // ─── REALTIME: typing ─────────────────────────────────────────────────────
    useEffect(() => {
      const onTyping = ({ senderId }) => {
        if (String(senderId) !== String(selectedUser?._id)) return;
        setIsTyping(true);
      };
      const onStop = ({ senderId }) => {
        if (String(senderId) !== String(selectedUser?._id)) return;
        setIsTyping(false);
      };
      socket.on("typing", onTyping);
      socket.on("stop-typing", onStop);
      return () => {
        socket.off("typing", onTyping);
        socket.off("stop-typing", onStop);
      };
    }, [selectedUser]);

    // ─── REALTIME: seen receipts ─────────────────────────────────────────────
    useEffect(() => {
      const handler = ({ conversationId }) => {
        setChatMessages((prev) =>
          prev.map((msg) =>
            String(msg.conversation) === String(conversationId)
              ? { ...msg, seen: true }
              : msg,
          ),
        );
      };
      socket.on("messages-seen", handler);
      return () => socket.off("messages-seen", handler);
    }, []);

    // ─── REALTIME: deletions ─────────────────────────────────────────────────
    useEffect(() => {
      const handler = ({ messageId, type, userId }) => {
        const updater = (prev) =>
          prev
            .map((msg) => {
              if (msg._id !== messageId) return msg;
              if (type === "everyone")
                return {
                  ...msg,
                  text: "This message was deleted",
                  isDeletedForEveryone: true,
                };
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

    // ─── REALTIME: reactions ─────────────────────────────────────────────────
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

    // ─── Mark messages as seen ───────────────────────────────────────────────
    useEffect(() => {
      if (!selectedUser || !chatMessages.length) return;
      const last = chatMessages[chatMessages.length - 1];
      if (String(last.sender) === String(currentUser.id)) return;
      if (!last.conversation) return;
      socket.emit("mark-seen", { conversationId: String(last.conversation) });
    }, [selectedUser?._id, chatMessages.length]);

    // ─── Auto-scroll on new messages ─────────────────────────────────────────
    useEffect(() => {
      if (isInitialLoadRef.current) return;
      if (isPaginatingRef.current) return;
      if (isSendingRef.current) {
        isSendingRef.current = false;
        scrollToBottom("smooth");
        return;
      }
      if (isAtBottomRef.current) {
        scrollToBottom("smooth");
      }
    }, [chatMessages.length]);

    // ─── Scroll event: track position + infinite scroll trigger ─────────────
    const handleScroll = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;

      const atBottom = isNearBottom();
      isAtBottomRef.current = atBottom;
      setShowScrollBtn(!atBottom);

      // Trigger pagination when near top
      if (
        el.scrollTop < 100 &&
        !isInitialLoadRef.current &&
        !isSearchMode &&
        hasMore &&
        !chatFetching &&
        !isPaginatingRef.current
      ) {
        isPaginatingRef.current = true;
        setPage((prev) => prev + 1);
      }
    }, [isSearchMode, hasMore, chatFetching, isNearBottom]);

    // ─── Search highlighting ──────────────────────────────────────────────────
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
      setActiveIndex((prev) =>
        prev < matchedIds.length - 1 ? prev + 1 : prev,
      );
    const goPrev = () => setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));

    // ─── Date label helper ────────────────────────────────────────────────────
    const getDateLabel = (dateStr) => {
      const msgDate = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const same = (a, b) =>
        a.getDate() === b.getDate() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear();
      if (same(msgDate, today)) return "Today";
      if (same(msgDate, yesterday)) return "Yesterday";
      return msgDate.toLocaleDateString([], {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    // ─── Build flat item list (date separators + messages) ───────────────────
    const activeMessages = isSearchMode ? searchMessages : chatMessages;

    const sortedMessages = useMemo(() => {
      return activeMessages.slice().sort((a, b) => {
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
    }, [activeMessages]);

    const flatItems = useMemo(() => {
      const items = [];
      let lastLabel = null;
      sortedMessages.forEach((msg) => {
        const label = getDateLabel(msg.createdAt);
        if (label !== lastLabel) {
          items.push({ type: "date", label, id: `date-${label}` });
          lastLabel = label;
        }
        items.push({ type: "msg", msg, id: msg._id });
      });
      return items;
    }, [sortedMessages]);

    const showNoResults =
      isSearchMode &&
      !searchFetching &&
      searchMessages.length === 0 &&
      search.trim().length > 0;

    const bgStyle = {
      backgroundImage:
        "radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
    };

    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Search results bar */}
        {isSearchMode && (
          <div className="bg-background border-b px-4 py-2 flex items-center justify-between shrink-0 min-h-9.5">
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

        {/* Chat scroll container */}
        <div
          className="flex-1 min-h-0 bg-[#efeae2] dark:bg-[#0b141a] relative"
          style={bgStyle}
        >
          {/* Initial load spinner */}
          {!isSearchMode &&
            chatFetching &&
            page === 1 &&
            chatMessages.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
              </div>
            )}

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto"
          >
            {/* Pagination loading indicator */}
            {!isSearchMode && chatFetching && page > 1 && (
              <div className="text-center text-gray-400 text-xs py-2">
                Loading older messages...
              </div>
            )}

            {showNoResults && (
              <div className="flex flex-col items-center justify-center gap-3 mt-20 text-center select-none px-4">
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

            {/* Message list — plain DOM, no virtualizer */}
            <div className="py-2">
              {flatItems.map((item) => {
                if (item.type === "date") {
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-center my-3 px-4"
                    >
                      <span className="bg-white/70 dark:bg-[#202c33]/80 text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full shadow-sm">
                        {item.label}
                      </span>
                    </div>
                  );
                }
                const { msg } = item;
                return (
                  <div key={item.id} className="px-6">
                    <Message
                      msg={msg}
                      currentUser={currentUser}
                      selectedUser={selectedUser}
                      onReply={setReplyMessage}
                      search={search}
                      isMatch={matchedIds.includes(msg._id)}
                      isActive={matchedIds[activeIndex] === msg._id}
                    />
                  </div>
                );
              })}
            </div>

            {/* Typing indicator */}
            {isTyping && (
              <div className="text-sm text-gray-500 italic px-6 py-2">
                {selectedUser?.name} is typing...
              </div>
            )}
          </div>
        </div>

        {/* Scroll-to-bottom button */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom("smooth")}
            className="fixed bottom-24 right-6 bg-blue-500 text-white px-3 py-2 rounded-full shadow-lg hover:bg-blue-600 transition z-50"
          >
            ↓ New
          </button>
        )}
      </div>
    );
  },
);

export default ChatMessages;
