import api from "./api";

export const getConversations = async ({ pageParam = 1 }) => {
  const res = await api.get(`/conversations?page=${pageParam}`);
  return res.data;
};
