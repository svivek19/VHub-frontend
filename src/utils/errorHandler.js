export const getErrorMessage = (error) => {
  if (!error.response) {
    return "Network error. Please try again.";
  }

  if (error.response.status === 429) {
    return "Too many attempts. Please wait and try again.";
  }

  return error.response.data?.message || "Something went wrong";
};
