import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Eye, EyeOff, BarChart3, Users, Settings } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.adminLogin.useMutation({
    onSuccess: async () => {
      // Invalidate adminMe cache before navigating so Admin page sees fresh session
      await utils.auth.adminMe.invalidate();
      await utils.auth.adminMe.refetch();
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black px-4 py-8">
      {/* Netflix-style background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-red-950/20 to-transparent" />
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-red-600/3 rounded-full blur-[120px]" />
      
      <div className="relative w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left Side - Info Panel (Desktop Only) */}
        <div className="hidden lg:flex flex-col justify-center space-y-8">
          <div>
            <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
              Painel Administrativo
            </h1>
            <p className="text-xl text-red-400 font-semibold mb-2">
              Shelby Community
            </p>
            <p className="text-gray-400 text-base leading-relaxed">
              Gerencie clientes, monitore atividades, controle créditos e mantenha a segurança do seu sistema.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Gerenciamento de Clientes</h3>
                <p className="text-gray-400 text-sm">Crie, edite e gerencie credenciais de acesso com facilidade</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Análise e Relatórios</h3>
                <p className="text-gray-400 text-sm">Visualize estatísticas de uso e histórico de atividades</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
                <Settings className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Controle Total</h3>
                <p className="text-gray-400 text-sm">Configure permissões, créditos e limites de acesso</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Logo / Header */}
          <div className="text-center mb-8 lg:text-left">
            <div className="inline-flex lg:inline-flex items-center justify-center w-16 h-16 rounded-xl bg-red-600/20 mb-4">
              <ShieldCheck className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-3xl lg:text-2xl font-black text-white mb-1 tracking-wide uppercase">
              Shelby Community
            </h2>
            <p className="text-red-400 text-sm font-medium tracking-wide">
              Painel Administrativo
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-gray-900/80 rounded-xl p-8 border border-red-900/20 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin-username" className="text-sm font-semibold text-gray-200">
                  Usuário Admin
                </Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="admin-username"
                    type="text"
                    placeholder="Usuário do administrador"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-12 h-12 bg-black/50 border-gray-700 focus:border-red-500 focus:ring-red-500/20 text-white text-base rounded-lg"
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-sm font-semibold text-gray-200">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha do administrador"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-12 bg-black/50 border-gray-700 focus:border-red-500 focus:ring-red-500/20 text-white text-base rounded-lg"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide text-base rounded-lg mt-6 transition-all"
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
    </div>
  );
}
