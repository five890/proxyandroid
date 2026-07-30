import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, User, Eye, EyeOff, Monitor, KeyRound } from "lucide-react";
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
  const loginMutation = trpc.auth.clientLogin.useMutation({
    onSuccess: (data) => {
      toast.success(`Bem-vindo, ${data.credential.username}!`);
      setLocation("/dashboard");
    },
    onError: (error) => {
      const errorMsg = error.message || "Erro ao fazer login";
      if (errorMsg.includes("expirou") || errorMsg.includes("Expirou")) {
        // Set flag and redirect to expired page
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/50" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
      
      <div className="relative w-full max-w-md px-6">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 glow-primary">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Portal de Acesso</h1>
          <p className="text-muted-foreground text-sm">
            Acesse sua área exclusiva
          </p>
        </div>

        {/* Login Form */}
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="client-username" className="text-sm font-medium text-foreground/80">
                Usuário
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="client-username"
                  type="text"
                  placeholder="Seu nome de usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-password" className="text-sm font-medium text-foreground/80">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="client-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Código de Acesso */}
            <div className="space-y-2">
              <Label htmlFor="login-code" className="text-sm font-medium text-foreground/80">
                Código de Acesso (opcional)
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-code"
                  type="text"
                  placeholder="0930 9202 8377"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 tracking-wider font-mono"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={loading || !username || !password}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Acessar Portal"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
          <Monitor className="w-3 h-3" />
          Proteção de dispositivo ativa. Cada login funciona em apenas um dispositivo.
        </p>
      </div>
    </div>
  );
}
