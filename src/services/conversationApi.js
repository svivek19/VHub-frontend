import api from "./api";

export const getConversations = async () => {
  const res = await api.get("/conversations");
  return res.data;
};
