import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, User, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

/**
 * Generate a device fingerprint from browser properties
 */
function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    navigator.hardwareConcurrency?.toString() || "0",
    ((navigator as any).deviceMemory)?.toString() || "0",
    new Date().getTimezoneOffset().toString(),
    window.screen.colorDepth.toString(),
    navigator.platform,
    Array.from(navigator.plugins).map(p => p.name).join(","),
  ];
  return components.join("|");
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Client login
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.clientLogin.useMutation({
    onSuccess: async (data) => {
      await utils.auth.clientMe.invalidate();
      await utils.auth.clientMe.refetch();
      toast.success(`Bem-vindo, ${data.credential.username}!`);
      setLocation("/dashboard");
    },
    onError: (error) => {
      const errorMsg = error.message || "Erro ao fazer login";
      if (errorMsg.includes("expirou") || errorMsg.includes("Expirou")) {
        sessionStorage.setItem("login_expired", "true");
        setLocation("/expired");
      } else {
        toast.error(errorMsg);
      }
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
      deviceFingerprint: generateDeviceFingerprint(),
      loginCode: loginCode || undefined,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-red-950/20 to-transparent" />
      
      <div className="relative w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-red-600/20 mb-3">
            <Shield className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-0.5 tracking-wide uppercase">
            Shelby Community
          </h1>
          <p className="text-red-400 text-xs font-medium tracking-wide">
            Ativar Acesso Proxy Shelby's
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900/80 rounded-lg p-6 border border-red-900/20">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="client-username" className="text-xs font-medium text-gray-300">
                Usuário
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="client-username"
                  type="text"
                  placeholder="Seu nome de usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11 bg-black/50 border-gray-700 focus:border-red-500 focus:ring-red-500/20 text-white text-sm"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client-password" className="text-xs font-medium text-gray-300">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="client-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-black/50 border-gray-700 focus:border-red-500 focus:ring-red-500/20 text-white text-sm"
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

            {/* Código de Acesso */}
            <div className="space-y-1.5">
              <Label htmlFor="login-code" className="text-xs font-medium text-gray-300">
                Código de Acesso
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="login-code"
                  type="text"
                  placeholder="0930 9202 8377"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  className="pl-10 h-11 bg-black/50 border-gray-700 focus:border-red-500 focus:ring-red-500/20 tracking-wider font-mono text-white text-sm"
                  disabled={loading}
                />
              </div>
              <p className="text-[10px] text-gray-500">Código fornecido pelo administrador</p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide text-sm"
              disabled={loading || !username || !password}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Ativar Acesso"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-600 mt-4">
          Proteção de dispositivo ativa. Shelby Community.
        </p>
      </div>
    </div>
  );
}
