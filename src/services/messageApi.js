import api from "./api";

export const getMessages = async (userId) => {
  const res = await api.get(`/messages/${userId}`);
  return res.data;
};
