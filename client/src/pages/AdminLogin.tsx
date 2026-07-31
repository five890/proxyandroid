import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const loginMutation = trpc.auth.adminLogin.useMutation({
    onSuccess: () => {
      toast.success("Login administrativo realizado!");
      navigate("/admin");
    },
    onError: (error) => {
      toast.error(error.message || "Credenciais administrativas inválidas");
      setLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    loginMutation.mutate({
      username,
      password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
      {/* Netflix-style background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-red-950/20 to-transparent" />
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-red-600/3 rounded-full blur-[120px]" />
      
      <div className="relative w-full max-w-md px-6">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-red-600/20 mb-4">
            <ShieldCheck className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white mb-1 tracking-wide uppercase">
            Shelby Community
          </h1>
          <p className="text-red-400 text-sm font-medium tracking-wide">
            Painel Administrativo
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900/80 rounded-lg p-8 border border-red-900/20">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-username" className="text-sm font-medium text-gray-300">
                Usuário Admin
              </Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="admin-username"
                  type="text"
                  placeholder="Usuário do administrador"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11 bg-black/50 border-gray-700 focus:border-red-500 focus:ring-red-500/20 text-white"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-sm font-medium text-gray-300">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha do administrador"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-black/50 border-gray-700 focus:border-red-500 focus:ring-red-500/20 text-white"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide"
              disabled={loading || !username || !password}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Acessar Painel"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Acesso restrito. Shelby Community — Área do administrador.
        </p>
      </div>
    </div>
  );
}
