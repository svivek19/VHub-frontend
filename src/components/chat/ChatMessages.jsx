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
import { Virtuoso } from "react-virtuoso";
import { socket } from "@/socket/socket";
import { getMessages } from "../../services/messageApi";
import Message from "./Message";

const ChatMessages = forwardRef(
  ({ selectedUser, currentUser, setReplyMessage, search }, ref) => {
    const virtuosoRef = useRef(null);
    const activeUserIdRef = useRef(null);
    const isSendingRef = useRef(false);
    const isAtBottomRef = useRef(true);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [chatMessages, setChatMessages] = useState([]);
    const [searchMessages, setSearchMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [matchedIds, setMatchedIds] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);

    // firstItemIndex: Virtuoso uses this to maintain scroll position when
    // prepending older messages. Start high so we have room to prepend.
    const PREPEND_OFFSET = 100_000;
    const [firstItemIndex, setFirstItemIndex] = useState(PREPEND_OFFSET);

    const isSearchMode = !!search;
    // Prevents startReached from firing before the first page finishes loading
    const isInitialLoadRef = useRef(true);

    // ─── Imperative handle for ChatInput ─────────────────────────────────────
    useImperativeHandle(ref, () => ({
      addOptimistic: (msg) => {
        isSendingRef.current = true;
        setChatMessages((prev) => [...prev, msg]);
        // Virtuoso's followOutput will handle the scroll via isSendingRef
      },
      replaceMessage: (tempId, realMsg) => {
        setChatMessages((prev) =>
          prev.map((m) => (m._id === tempId ? { ...m, ...realMsg } : m)),
        );
      },
      markShouldScroll: () => {
        // Kept for API compatibility — isSendingRef handles it now
      },
    }));

    // ─── Queries ──────────────────────────────────────────────────────────────
    const { data: chatData, isFetching: chatFetching } = useQuery({
      queryKey: ["chat-messages", selectedUser?._id, page],
      queryFn: () => getMessages(selectedUser._id, page, ""),
      enabled: !!selectedUser && !isSearchMode,
      staleTime: 1000 * 60 * 5,
      refetchOnMount: false,
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
      setFirstItemIndex(PREPEND_OFFSET);
    }, [selectedUser?._id]);

    // ─── Populate chat messages from query ───────────────────────────────────
    useEffect(() => {
      if (!chatData || isSearchMode) return;
      if (!selectedUser) return;
      if (String(activeUserIdRef.current) !== String(selectedUser._id)) return;

      const LIMIT = 20;
      setHasMore(chatData.length >= LIMIT);

      setChatMessages((prev) => {
        if (page === 1) {
          // Mark initial load done so startReached doesn't fire immediately
          setTimeout(() => {
            isInitialLoadRef.current = false;
          }, 500);
          // Scroll to bottom after first load
          setTimeout(() => {
            virtuosoRef.current?.scrollToIndex({
              index: "LAST",
              behavior: "auto",
            });
          }, 50);
          // Preserve any pending optimistic messages
          const pending = prev.filter(
            (m) => typeof m._id === "string" && m._id.startsWith("temp-"),
          );
          if (pending.length > 0) {
            const serverIds = new Set(chatData.map((m) => m._id));
            return [
              ...chatData,
              ...pending.filter((m) => !serverIds.has(m._id)),
            ];
          }
          return chatData;
        }
        // Pagination: prepend older messages, deduplicate
        const existingIds = new Set(prev.map((m) => m._id));
        const older = chatData.filter((m) => !existingIds.has(m._id));
        if (older.length > 0) {
          // Shift firstItemIndex down by the number of prepended items so
          // Virtuoso keeps the viewport anchored at the current position.
          setFirstItemIndex((idx) => idx - older.length);
        }
        return [...older, ...prev];
      });
    }, [chatData, selectedUser?._id]);

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
        // Only accept messages that belong to the active conversation:
        // - conversation ID matches (reliable), OR
        // - the other user sent it to us (incoming)
        // We do NOT use `msg.sender === currentUser.id` alone because
        // that would match our own messages from other conversations.
        const conversationMatches =
          selectedUser?.conversationId &&
          String(msg.conversation) === String(selectedUser.conversationId);

        const senderIsOtherUser =
          String(msg.sender) === String(selectedUser?._id);

        if (!conversationMatches && !senderIsOtherUser) return;

        setChatMessages((prev) => {
          // Already have this message — skip
          if (prev.some((m) => String(m._id) === String(msg._id))) return prev;

          // Replace matching optimistic entry (our own echo back from server).
          // Match on sender + text so we don't wrongly swap an unrelated pending msg.
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

    // ─── Infinite scroll: fires when user scrolls to the top ────────────────
    // We use atTopStateChange instead of startReached because startReached
    // re-fires every time items are prepended (causing infinite loop).
    const handleAtTopChange = useCallback(
      (atTop) => {
        if (!atTop) return;
        if (isInitialLoadRef.current) return;
        if (isSearchMode || !hasMore || chatFetching) return;
        setPage((prev) => prev + 1);
      },
      [isSearchMode, hasMore, chatFetching],
    );

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

    // ─── Build flat item list for Virtuoso (date separators + messages) ───────
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
          items.push({ type: "date", label });
          lastLabel = label;
        }
        items.push({ type: "msg", msg });
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

        {/*
          KEY FIX: Virtuoso IS the scroller. No overflow-y-auto wrapper div.
          The outer div is just for background styling + positioning context.
        */}
        {/* Virtuoso MUST live in a flex child with a real measured height.
             flex-1 + min-h-0 gives it the flex space; Virtuoso uses 100% of that. */}
        <div
          className="flex-1 min-h-0 bg-[#efeae2] dark:bg-[#0b141a] relative flex flex-col"
          style={bgStyle}
        >
          {/* Initial load spinner — shown only on first page load */}
          {!isSearchMode &&
            chatFetching &&
            page === 1 &&
            chatMessages.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
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

          <Virtuoso
            ref={virtuosoRef}
            style={{ flex: 1 }}
            data={flatItems}
            /*
              followOutput: Virtuoso calls this whenever new items are appended.
              - Return "smooth" to scroll, false to stay put.
              - We always scroll when WE just sent (isSendingRef),
                and follow when already at the bottom for incoming messages.
            */
            followOutput={() => {
              if (isSendingRef.current) return "smooth";
              return isAtBottomRef.current ? "smooth" : false;
            }}
            atBottomThreshold={300}
            atBottomStateChange={(atBottom) => {
              isAtBottomRef.current = atBottom;
              setShowScrollBtn(!atBottom);
            }}
            // Pull-to-load-more at the top
            atTopStateChange={handleAtTopChange}
            firstItemIndex={firstItemIndex}
            components={{
              Header: () =>
                !isSearchMode && chatFetching && page > 1 ? (
                  <div className="text-center text-gray-400 text-xs py-2">
                    Loading older messages...
                  </div>
                ) : null,
              Footer: () =>
                isTyping ? (
                  <div className="text-sm text-gray-500 italic px-6 py-2">
                    {selectedUser?.name} is typing...
                  </div>
                ) : null,
            }}
            itemContent={(_index, item) => {
              if (item.type === "date") {
                return (
                  <div className="flex items-center justify-center my-3 px-4">
                    <span className="bg-white/70 dark:bg-[#202c33]/80 text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full shadow-sm">
                      {item.label}
                    </span>
                  </div>
                );
              }
              const { msg } = item;
              return (
                <div className="px-4">
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
            }}
          />
        </div>

        {/* Scroll-to-bottom button */}
        {showScrollBtn && (
          <button
            onClick={() =>
              virtuosoRef.current?.scrollToIndex({
                index: "LAST",
                behavior: "smooth",
              })
            }
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
