import api from "./api";

export const getMessages = async (userId, page) => {
  const res = await api.get(`/messages/${userId}?page=${page}`);
  return res.data;
};
