import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginUser, registerUser } from "../services/authApi";
import { socket } from "../socket/socket";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);

      socket.connect();
      socket.emit("user-connected", data.user.id);
    },
    onError: (error) => {
      console.log(error);

      setErrorMsg(error.response?.data?.message || "Login failed");
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      setIsLogin(true);
      setErrorMsg("");
      alert("Signup successful ");
    },
    onError: (error) => {
      setErrorMsg(error.response?.data?.message || "Signup failed");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (isLogin) {
      loginMutation.mutate({
        email: form.email,
        password: form.password,
      });
    } else {
      registerMutation.mutate(form);
    }
  };

  const loading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          {isLogin ? "Login to VHub" : "Create Account"}
        </h1>

        {errorMsg && (
          <p className="text-red-500 text-sm mb-4 text-center">{errorMsg}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded-lg p-3"
              required
            />
          )}

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
            required
          />

          <button
            className="w-full bg-black text-white py-3 rounded-lg"
            disabled={loading}
          >
            {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <p className="text-sm text-center mt-4">
          {isLogin ? "No account?" : "Already have an account?"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 underline"
          >
            {isLogin ? "Signup" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
