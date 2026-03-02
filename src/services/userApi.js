import api from "./api";

export const getUsers = async () => {
  const res = await api.get("/users");
  return res.data;
};

export const updateUser = async (userId, data) => {
  const res = await api.put(`/users/${userId}`, data);
  return res.data;
};
