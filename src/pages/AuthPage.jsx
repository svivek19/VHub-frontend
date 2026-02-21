import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginUser, registerUser } from "../services/authApi";
import { socket } from "../socket/socket";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getErrorMessage } from "../utils/errorHandler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

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

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background">
      {/* LEFT HERO SECTION */}
      <div className="hidden md:flex flex-col justify-center px-12 bg-linear-to-br from-primary/10 via-background to-background">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to <span className="text-primary">VHub</span>
        </h1>

        <p className="mt-6 text-muted-foreground text-lg max-w-md">
          A modern real-time chat platform built for seamless conversations.
          Fast. Clean. Professional.
        </p>

        <div className="mt-10 space-y-4 text-sm text-muted-foreground">
          <p>• Real-time messaging</p>
          <p>• Clean modern UI</p>
          <p>• Secure authentication</p>
        </div>
      </div>

      {/* RIGHT AUTH SECTION */}
      <div className="flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {isLogin ? "Login to VHub" : "Create Account"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {errorMsg && (
              <p className="text-destructive text-sm mb-4 text-center">
                {errorMsg}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    name="name"
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
              </Button>
            </form>

            <p className="text-sm text-center mt-6 text-muted-foreground">
              {isLogin ? "No account?" : "Already have an account?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary hover:underline"
                type="button"
              >
                {isLogin ? "Signup" : "Login"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
