import { Navigate } from "react-router-dom";

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (token) {
    return <Navigate to="/chat" replace={true} />;
  }

  return children;
};

export default PublicRoute;
