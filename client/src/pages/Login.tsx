import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { SITE_CONFIG } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, User, Eye, EyeOff, KeyRound, Smartphone, Monitor } from "lucide-react";
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
      // Clear any expired markers
      sessionStorage.removeItem("login_expired");
      sessionStorage.removeItem("dashboard_redirect_attempts");
      // Save session to localStorage
      const sessionData = JSON.stringify({
        credentialId: data.credential.id,
        username: data.credential.username,
        credits: data.credential.credits,
        label: data.credential.label,
        loginCode: data.credential.loginCode,
        deviceFingerprint: data.credential.deviceFingerprint,
        expiresAt: data.credential.expiresAt,
      });
      localStorage.setItem("client_session", sessionData);
      setLoading(false);
      await utils.auth.clientMe.invalidate();
      toast.success(`Bem-vindo, ${data.credential.username}!`);
      setTimeout(() => {
        setLocation("/dashboard");
      }, 300);
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black px-4 py-8">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-red-950/20 to-transparent" />
      
      <div className="relative w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left Side - Info Panel (Desktop Only) */}
        <div className="hidden lg:flex flex-col justify-center space-y-8">
          <div>
            <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
              {SITE_CONFIG.name}
            </h1>
            <p className="text-xl text-red-400 font-semibold mb-2">
              {SITE_CONFIG.shortDescription}
            </p>
            <p className="text-gray-400 text-base leading-relaxed">
              Acesse sua conta com segurança e gerencie seus acessos proxy de forma simples e intuitiva.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Mobile Otimizado</h3>
                <p className="text-gray-400 text-sm">Acesse de qualquer dispositivo com interface responsiva</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Desktop Completo</h3>
                <p className="text-gray-400 text-sm">Experiência desktop com todos os recursos disponíveis</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Segurança Avançada</h3>
                <p className="text-gray-400 text-sm">Proteção de dispositivo e autenticação de múltiplos fatores</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Logo / Header */}
          <div className="text-center mb-8 lg:text-left">
            <div className="inline-flex lg:inline-flex items-center justify-center w-14 h-14 rounded-xl bg-red-600/20 mb-4">
              <Shield className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-3xl lg:text-2xl font-black text-white mb-1 tracking-wide uppercase">
              {SITE_CONFIG.name}
            </h2>
            <p className="text-red-400 text-sm font-medium tracking-wide">
              {SITE_CONFIG.activationText}
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-gray-900/80 rounded-xl p-8 border border-red-900/20 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="client-username" className="text-sm font-semibold text-gray-200">
                  Usuário
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="client-username"
                    type="text"
                    placeholder="Seu nome de usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-12 h-12 bg-black/50 border-gray-700 focus:border-red-500 focus:ring-red-500/20 text-white text-base rounded-lg"
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-password" className="text-sm font-semibold text-gray-200">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="client-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
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

              {/* Código de Acesso */}
              <div className="space-y-2">
                <Label htmlFor="login-code" className="text-sm font-semibold text-gray-200">
                  Código de Acesso
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="login-code"
                    type="text"
                    placeholder="0930 9202 8377"
                    value={loginCode}
                    onChange={(e) => setLoginCode(e.target.value)}
                    className="pl-12 h-12 bg-black/50 border-gray-700 focus:border-red-500 focus:ring-red-500/20 tracking-widest font-mono text-white text-base rounded-lg"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Código fornecido pelo administrador</p>
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
                  "Ativar Acesso"
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-600 mt-6">
            {SITE_CONFIG.protectionText}
          </p>
        </div>
      </div>
    </div>
  );
}
