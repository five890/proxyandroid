import React, { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  LogOut,
  Download,
  File,
  Calendar,
  CreditCard,
  Monitor,
  AlertTriangle,
  Loader2,
  Clock,
  Key,
  CheckCircle2,
  Server,
  Copy,
  ExternalLink,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Check client session - always fresh from DB
  const clientMeQuery = trpc.auth.clientMe.useQuery(undefined, {
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const clientMeError = clientMeQuery.error as any;
  const isExpiredError = clientMeError?.data?.code === "FORBIDDEN" &&
    (clientMeError?.message?.includes("expirou") || clientMeError?.message?.includes("Expirou"));

  useEffect(() => {
    if (!clientMeQuery.isLoading && !clientMeQuery.isFetching && clientMeQuery.data === null) {
      const timer = setTimeout(() => {
        if (!clientMeQuery.data) {
          const isExpired = sessionStorage.getItem("login_expired") === "true" || isExpiredError;
          if (isExpired) {
            setLocation("/expired");
          } else {
            setLocation("/login");
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [clientMeQuery.data, clientMeQuery.isLoading, clientMeQuery.isFetching, isExpiredError, setLocation]);

  // Fetch files - only when account is activated
  const filesQuery = trpc.clientFiles.files.useQuery(undefined, {
    enabled: clientMeQuery.data?.activated === true,
  });

  const filesError = filesQuery.error as any;
  useEffect(() => {
    if (filesError?.data?.code === "FORBIDDEN" &&
        (filesError?.message?.includes("expirou") || filesError?.message?.includes("Expirou"))) {
      sessionStorage.setItem("login_expired", "true");
      setLocation("/expired");
    }
  }, [filesError]);

  // Logout
  const logoutMutation = trpc.auth.clientLogout.useMutation({
    onSuccess: () => {
      setLocation("/login");
    },
  });

  // Activate account mutation
  const [activatedAccessKey, setActivatedAccessKey] = React.useState<string | null>(null);
  const [activatedAccessUrl, setActivatedAccessUrl] = React.useState<string | null>(null);
  const [showAccessKey, setShowAccessKey] = React.useState(false);

  const activateMutation = trpc.auth.activateAccount.useMutation({
    onSuccess: (data) => {
      if (session?.accessType === 'proxy_android') {
        toast.success("Proxy gerado com sucesso!");
        if (data.accessKey) {
          setActivatedAccessKey(data.accessKey);
          setActivatedAccessUrl(null);
          setShowAccessKey(true);
        }
      } else {
        toast.success("Conta ativada com sucesso!");
        if (data.accessKey) {
          setActivatedAccessKey(data.accessKey);
          setActivatedAccessUrl(data.activationUrl || null);
          setShowAccessKey(true);
        }
      }
      utils.auth.clientMe.invalidate();
      utils.clientFiles.files.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao ativar conta");
    },
  });

  // Download handler
  const downloadMutation = trpc.clientFiles.downloadFile.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.originalName;
      link.click();
      toast.success(`Download iniciado: ${data.originalName}`);
      utils.auth.clientMe.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao baixar arquivo");
    },
  });

  const handleDownload = (fileId: number) => {
    downloadMutation.mutate({ fileId });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleActivate = () => {
    activateMutation.mutate();
  };

  const session = clientMeQuery.data;

  if (clientMeQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-gray-400 text-sm">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // ============ ACTIVATION SCREEN ============
  if (!session.activated) {
    if (session.accessType === 'proxy_android') {
      return (
        <div className="min-h-screen bg-black">
          {/* Header - mobile optimized */}
          <header className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-green-900/20">
            <div className="px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-600/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <h1 className="text-xs font-bold text-green-500 tracking-wide uppercase">Shelby Community</h1>
                  <p className="text-[10px] text-gray-500">{session.username}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-400 hover:text-white gap-1 text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </header>

          <main className="px-4 py-6 max-w-lg mx-auto">
            <Card className="p-6 text-center bg-gray-900/80 border-green-900/20">
              <div className="w-14 h-14 rounded-xl bg-green-600/20 flex items-center justify-center mx-auto mb-5">
                <Smartphone className="w-7 h-7 text-green-500" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">
                Proxy Android
              </h2>
              <p className="text-gray-400 text-sm mb-5">
                Você possui <span className="font-semibold text-green-500">{session.credits} crédito(s)</span> disponível(is). 
                Use seu crédito para gerar o proxy e liberar sua chave de acesso.
              </p>

              {/* Warning */}
              <div className="mb-5 flex items-start gap-3 p-3 rounded-lg bg-green-900/20 border border-green-600/30 text-left">
                <AlertTriangle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-green-400">COMO FUNCIONA</p>
                  <p className="text-[11px] text-gray-400">
                    Ao ativar, você receberá sua chave de acesso para usar no aplicativo Proxy Android.
                  </p>
                </div>
              </div>

              {/* Credits */}
              <div className="flex items-center justify-center gap-2 mb-5 px-3 py-2.5 rounded-lg bg-green-900/10 border border-green-600/20">
                <CreditCard className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-400">Créditos disponíveis:</span>
                <Badge variant="default" className="bg-green-600 text-white text-xs">{session.credits}</Badge>
              </div>

              {/* Activate Button - mobile optimized */}
              <Button
                size="lg"
                onClick={handleActivate}
                disabled={activateMutation.isPending || session.credits < 1}
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white font-bold tracking-wide h-12 text-base"
              >
                {activateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando Proxy...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Ativar Proxy Android (1 crédito)
                  </>
                )}
              </Button>

              {session.credits < 1 && (
                <p className="text-xs text-red-400 mt-3">
                  Você não possui créditos suficientes. Entre em contato com o administrador.
                </p>
              )}
            </Card>
          </main>
        </div>
      );
    }

    // Proxy iOS não ativado
    return (
      <div className="min-h-screen bg-black">
        <header className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-red-900/20">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-600/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h1 className="text-xs font-bold text-red-500 tracking-wide uppercase">Shelby Community</h1>
                <p className="text-[10px] text-gray-500">{session.username}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white gap-1 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        <main className="px-4 py-6 max-w-lg mx-auto">
          <Card className="p-6 text-center bg-gray-900/80 border-red-900/20">
            <div className="w-14 h-14 rounded-xl bg-red-600/20 flex items-center justify-center mx-auto mb-5">
              <Key className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">
              Ativar Acesso Proxy Shelby's
            </h2>
            <p className="text-gray-400 text-sm mb-5">
              Você possui <span className="font-semibold text-red-500">{session.credits} crédito(s)</span> disponível(is). 
              Use seu crédito para ativar o acesso.
            </p>

            <div className="mb-5 flex items-start gap-3 p-3 rounded-lg bg-red-900/20 border border-red-600/30 text-left">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-400">AVISO IMPORTANTE</p>
                <p className="text-[11px] text-gray-400">
                  Caso compartilhe tua key com outras pessoas, sua conta será banida no Free Fire.
                </p>
              </div>
            </div>

            <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-amber-900/20 border border-amber-600/30 text-left">
              <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-400">EXPIRAÇÃO ANTECIPADA</p>
                <p className="text-[11px] text-gray-400">
                  As keys podem expirar entre <span className="font-semibold text-white">1 a 6 horas antes</span> do prazo final.
                </p>
              </div>
            </div>

            {session.accessKey && (
              <Card className="p-4 mb-5 bg-black/50 border border-red-600/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300 flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    Sua Chave de Acesso
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-gray-400 hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(session.accessKey!);
                      toast.success("Chave copiada!");
                    }}
                  >
                    <Copy className="w-3 h-3" />
                    Copiar
                  </Button>
                </div>
                <p className="text-sm font-mono font-bold text-red-500 bg-black/50 px-3 py-2 rounded-lg select-all">
                  {session.accessKey}
                </p>
              </Card>
            )}

            <Card className="p-4 mb-5 bg-black/50 border border-red-600/20 text-left">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-white">Servidores</span>
              </div>
              <div className="space-y-1 text-xs font-mono text-gray-400">
                <p>IP: <span className="text-white font-semibold">2.24.121.175</span></p>
                <p>Porta: <span className="text-white font-semibold">9999</span> - Hs Pecoço</p>
                <p>Porta: <span className="text-white font-semibold">9997</span> - Hs Peito</p>
                <p>Porta: <span className="text-white font-semibold">9998</span> - Hs Alto</p>
              </div>
            </Card>

            <div className="flex items-center justify-center gap-2 mb-5 px-3 py-2.5 rounded-lg bg-red-900/10 border border-red-600/20">
              <CreditCard className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-400">Créditos disponíveis:</span>
              <Badge variant="default" className="bg-red-600 text-white text-xs">{session.credits}</Badge>
            </div>

            <Button
              size="lg"
              onClick={handleActivate}
              disabled={activateMutation.isPending || session.credits < 1}
              className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide h-12 text-base"
            >
              {activateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ativando...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Ativar Acesso Proxy Shelby's (1 crédito)
                </>
              )}
            </Button>

            {session.credits < 1 && (
              <p className="text-xs text-red-400 mt-3">
                Você não possui créditos suficientes.
              </p>
            )}
          </Card>
        </main>
      </div>
    );
  }

  // ============ ACTIVATED - FILES DASHBOARD ============
  const isAndroid = session.accessType === 'proxy_android';
  const themeColor = isAndroid ? 'green' : 'red';

  return (
    <div className="min-h-screen bg-black">
      {/* Header - mobile optimized */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-red-900/20">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-600/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h1 className="text-xs font-bold text-red-500 tracking-wide uppercase">Shelby Community</h1>
              <p className="text-[10px] text-gray-500">{session.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-900/20 border border-emerald-600/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] text-emerald-500 font-medium hidden sm:inline">Ativado</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-900/10">
              <CreditCard className="w-3 h-3 text-red-500" />
              <span className="text-xs font-medium text-red-500">{session.credits}</span>
            </div>
            {session.expiresAt && new Date(session.expiresAt) < new Date(Date.now() + 24 * 60 * 60 * 1000) && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-900/20 border border-amber-600/30">
                <Clock className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] text-amber-500 font-medium hidden sm:inline">
                  {Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))}h
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white gap-1 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - mobile optimized */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-lg font-black text-white mb-1">
            Olá, <span className="text-red-500">{session.username}</span>
          </h2>
          <p className="text-gray-400 text-xs">
            {isAndroid ? 'Seu proxy está disponível abaixo.' : 'Seus arquivos de instalação estão disponíveis abaixo.'}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-900/20 border border-green-500/30">
            <Smartphone className="w-3 h-3 text-green-400" />
            <span className="text-[11px] text-green-400">
              Tipo: <strong>{isAndroid ? 'Proxy Android' : 'Proxy iOS'}</strong>
            </span>
          </div>
        </div>

        {/* ============ PROXY ANDROID PANEL ============ */}
        {isAndroid && (
          <>
            {/* APK Download Card */}
            <Card className="p-4 mb-4 bg-gray-900/80 border-green-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-4 h-4 text-green-500" />
                <span className="text-xs font-bold text-white">Download do App</span>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">
                Baixe o aplicativo Proxy Android. Use a chave de acesso no app para configurar o proxy.
              </p>
              <a
                href="https://www.mediafire.com/file/5f5mxtjp739rp9z/Proxy+Android.5.0.apk/file"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full p-3.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-all duration-200 group"
              >
                <Download className="w-4 h-4 group-hover:animate-bounce" />
                Baixar Proxy Android APK
              </a>
            </Card>

            {/* Access Key Card */}
            {session.accessKey && (
              <Card className="p-4 mb-4 bg-gray-900/80 border-green-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-white">Chave de Acesso</span>
                </div>
                <p className="text-[11px] text-gray-400 mb-2">Use esta chave no app:</p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-sm font-mono font-bold text-green-400 bg-black/50 px-3 py-2 rounded-lg select-all overflow-hidden text-ellipsis">
                    {session.accessKey}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 flex-shrink-0 text-gray-400 hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(session.accessKey!);
                      toast.success("Chave copiada!");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Generate Proxy Section */}
            <Card className="p-4 mb-4 bg-gray-900/80 border-green-900/20">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-green-500" />
                <span className="text-xs font-medium text-white">Gerar Proxy</span>
                <Badge variant="outline" className="ml-auto text-[10px] bg-green-500/10 text-green-400 border-green-500/30">
                  {session.credits} créditos
                </Badge>
              </div>
              {session.credits > 0 ? (
                <Button
                  onClick={handleActivate}
                  disabled={activateMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold gap-2 h-11"
                >
                  {activateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                  ) : (
                    <><Key className="w-4 h-4" /> Usar 1 Crédito e Gerar Proxy</>
                  )}
                </Button>
              ) : (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-600/30 text-center">
                  <p className="text-[11px] text-red-400">Sem créditos. Contate o administrador.</p>
                </div>
              )}
            </Card>

            {/* Tutorial */}
            <Card className="p-4 mb-4 bg-gray-900/80 border-green-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-green-500" />
                <span className="text-xs font-bold text-white">📱 Como Configurar</span>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">
                Clique no botão abaixo para baixar o tutorial.
              </p>
              <a
                href="https://www.mediafire.com/file/n53tty5h2lgm30a/6dff2a17-d9ff-4a07-ba31-0f0c582255f1.mov/file"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full p-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all duration-200 group"
              >
                <Download className="w-4 h-4 group-hover:animate-bounce" />
                Baixar Tutorial
              </a>
            </Card>
          </>
        )}

        {/* Server Info + Activation URL + Access Key Card - Proxy iOS */}
        {!isAndroid && (
          <Card className="p-4 mb-4 bg-gray-900/80 border-red-900/20">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-white">Informações do Servidor</span>
            </div>
            <div className="space-y-1 text-xs font-mono text-gray-400 mb-3">
              <p>IP: <span className="text-white font-semibold">2.24.121.175</span></p>
              <p>Porta: <span className="text-white font-semibold">9999</span> - Hs Pecoço</p>
              <p>Porta: <span className="text-white font-semibold">9997</span> - Hs Peito</p>
              <p>Porta: <span className="text-white font-semibold">9998</span> - Hs Alto</p>
            </div>

            {session.activationUrl && (
              <div className="pt-3 border-t border-red-900/30 mb-3">
                <p className="text-[11px] text-gray-400 mb-1">Link de ativação:</p>
                <div className="flex items-center gap-2">
                  <a
                    href={session.activationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-xs text-red-400 hover:underline font-medium truncate"
                  >
                    <ExternalLink className="w-3 h-3 inline mr-1" />
                    {session.activationUrl}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 flex-shrink-0 text-gray-400 hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(session.activationUrl!);
                      toast.success("Link copiado!");
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {session.accessKey && (
              <div className="pt-3 border-t border-red-900/30">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] text-gray-400">Chave de acesso:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 text-gray-400 hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(session.accessKey!);
                      toast.success("Chave copiada!");
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm font-mono font-bold text-red-500 bg-black/50 px-3 py-2 rounded-lg select-all">
                  {session.accessKey}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Key Expiration Warning - Proxy iOS */}
        {!isAndroid && (
          <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-amber-900/20 border border-amber-600/30">
            <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-400">EXPIRAÇÃO DE KEYS</p>
              <p className="text-[11px] text-gray-400">
                As keys podem expirar entre <span className="font-semibold text-white">1 a 6 horas antes</span> do prazo final.
              </p>
            </div>
          </div>
        )}

        {/* Expiration Warning */}
        {session.expiresAt && new Date(session.expiresAt) < new Date(Date.now() + 24 * 60 * 60 * 1000) && (
          <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-amber-900/20 border border-amber-600/30">
            <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-400">Acesso próximo de expirar</p>
              <p className="text-[11px] text-gray-400">
                Seu acesso expira em {new Date(session.expiresAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}. Contate o administrador.
              </p>
            </div>
          </div>
        )}

        {/* No credits warning */}
        {session.credits === 0 && !isAndroid && (
          <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-red-900/20 border border-red-600/30">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-400">Sem créditos</p>
              <p className="text-[11px] text-gray-400">
                Entre em contato com o administrador para renovar.
              </p>
            </div>
          </div>
        )}

        {/* Files Grid - only for Proxy iOS */}
        {!isAndroid && (
          filesQuery.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            </div>
          ) : filesQuery.data?.length === 0 ? (
            <Card className="p-8 text-center bg-gray-900/80 border-red-900/20">
              <File className="w-10 h-10 text-gray-600 mx-auto mb-3 opacity-50" />
              <h3 className="text-sm font-medium text-white mb-1">
                Nenhum arquivo disponível
              </h3>
              <p className="text-xs text-gray-400">
                Aguarde o administrador disponibilizar os arquivos.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filesQuery.data?.map((file: any) => (
                <Card
                  key={file.id}
                  className="p-4 bg-gray-900/80 border-red-900/20 hover:border-red-600/40 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center">
                        <File className="w-4 h-4 text-red-500" />
                      </div>
                      <h3 className="text-xs font-medium text-white truncate max-w-[200px]">
                        {file.originalName}
                      </h3>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-gray-800 text-gray-300">
                      {formatBytes(file.fileSize || 0)}
                    </Badge>
                  </div>
                  {file.description && (
                    <p className="text-[11px] text-gray-400 mb-3 line-clamp-2">
                      {file.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(file.id)}
                      disabled={downloadMutation.isPending || session.credits <= 0}
                      className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs h-9"
                    >
                      <Download className="w-3 h-3" />
                      Baixar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </main>

      {/* Access Key Dialog after activation */}
      <Dialog open={showAccessKey} onOpenChange={setShowAccessKey}>
        <DialogContent className="bg-gray-950 border-gray-800 max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-red-500" />
              Chave de Acesso Ativada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <p className="text-xs text-gray-400 mb-2">Use esta chave para acessar o serviço:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-red-400 font-mono break-all">{activatedAccessKey}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(activatedAccessKey || '');
                    toast.success("Chave copiada!");
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {activatedAccessUrl && session?.accessType !== 'proxy_android' && (
              <div className="bg-gray-900 rounded-lg p-4 border border-red-900/30">
                <p className="text-xs text-gray-400 mb-2">Link de ativação:</p>
                <div className="flex items-center gap-2">
                  <a
                    href={activatedAccessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-red-400 hover:underline font-medium"
                  >
                    {activatedAccessUrl}
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(activatedAccessUrl || '');
                      toast.success("Link copiado!");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white h-11"
              onClick={() => setShowAccessKey(false)}
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="px-4 py-4 text-center border-t border-red-900/20">
        <p className="text-[10px] text-gray-600">
          Shelby Community — Proteção ativa.
        </p>
      </footer>
    </div>
  );
}
