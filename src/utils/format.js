export const formatLastSeen = (date) => {
  if (!date) return "";

  const last = new Date(date);
  const now = new Date();

  const isToday = last.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isYesterday = last.toDateString() === yesterday.toDateString();

  if (isToday) {
    return `Last seen ${last.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  if (isYesterday) {
    return "Last seen yesterday";
  }

  return `Last seen ${last.toLocaleDateString("en-GB")}`;
};
