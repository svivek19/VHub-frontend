import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginUser, registerUser } from "../services/authApi";
import { socket } from "../socket/socket";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getErrorMessage } from "../utils/errorHandler";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, MessageSquare, Zap, Shield, Users } from "lucide-react";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

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
      localStorage.setItem("user", JSON.stringify(data.user));
      socket.connect();
      socket.emit("user-connected", data.user.id);
      setForm({ name: "", email: "", password: "" });
      toast.success("Login successful ");
      navigate("/chat");
    },
    onError: (error) => {
      const msg = getErrorMessage(error);
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      setIsLogin(true);
      setErrorMsg("");
      toast.success("Signup successful ");
    },
    onError: (error) => {
      const msg = getErrorMessage(error);
      setErrorMsg(msg);
      toast.error(msg);
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
    setForm({ name: "", email: "", password: "" });
  };

  const loading = loginMutation.isPending || registerMutation.isPending;

  const features = [
    {
      icon: Zap,
      label: "Real-time messaging",
      desc: "Instant delivery, zero lag",
    },
    {
      icon: Users,
      label: "User presence",
      desc: "See who is online instantly",
    },
    {
      icon: Shield,
      label: "Secure & private",
      desc: "Protected user communication",
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#0f0f13]">
      <div className="hidden md:flex flex-col justify-between w-1/2 px-16 py-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-violet-600/20 via-transparent to-cyan-500/10 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              VHub
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-5xl font-bold text-white leading-[1.15] tracking-tight">
              Connect with
              <br />
              <span className="bg-linear-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                everyone
              </span>
              , instantly.
            </h1>
            <p className="mt-5 text-[#8b8b9e] text-base leading-relaxed max-w-xs">
              A next-gen real-time chat platform built for speed, clarity, and
              seamless collaboration.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-violet-500/20 group-hover:border-violet-500/30 transition-all duration-300">
                  <Icon className="w-4 h-4 text-[#8b8b9e] group-hover:text-violet-400 transition-colors duration-300" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-[#5c5c72] text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {[
              "bg-violet-500",
              "bg-cyan-500",
              "bg-pink-500",
              "bg-amber-500",
            ].map((color, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-full ${color} border-2 border-[#0f0f13]`}
              />
            ))}
          </div>
          <p className="text-[#5c5c72] text-xs">
            <span className="text-white font-semibold">2,400+</span> users
            chatting now
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#0f0f13]">
        <div className="w-full max-w-100">
          <div className="flex md:hidden items-center gap-2 justify-center mb-8">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg">VHub</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">
              {isLogin ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-[#5c5c72] text-sm mt-1">
              {isLogin
                ? "Sign in to continue to VHub"
                : "Join thousands of users on VHub"}
            </p>
          </div>

          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-8">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isLogin
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-[#5c5c72] hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                !isLogin
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-[#5c5c72] hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm text-center">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label className="text-[#8b8b9e] text-xs font-medium uppercase tracking-wider">
                  Full Name
                </Label>
                <Input
                  name="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-[#3a3a4e] focus:border-violet-500/50 focus:ring-violet-500/20 h-11 rounded-xl"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[#8b8b9e] text-xs font-medium uppercase tracking-wider">
                Email Address
              </Label>
              <Input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-[#3a3a4e] focus:border-violet-500/50 focus:ring-violet-500/20 h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#8b8b9e] text-xs font-medium uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-[#3a3a4e] focus:border-violet-500/50 focus:ring-violet-500/20 h-11 rounded-xl pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a3a4e] hover:text-[#8b8b9e] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 rounded-xl font-semibold text-sm text-white bg-linear-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Please wait...
                </span>
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-[#5c5c72] text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              type="button"
              className="ml-2 text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
