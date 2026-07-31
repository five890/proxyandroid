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
    // Only redirect after query finishes AND data is explicitly null (not just loading)
    if (!clientMeQuery.isLoading && !clientMeQuery.isFetching && clientMeQuery.data === null) {
      // Small delay to allow cookie to be set properly
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
  const [showAccessKey, setShowAccessKey] = React.useState(false);

  const activateMutation = trpc.auth.activateAccount.useMutation({
    onSuccess: (data) => {
      toast.success("Conta ativada com sucesso! Seus arquivos agora estão disponíveis.");
      if (data.accessKey) {
        setActivatedAccessKey(data.accessKey);
        setShowAccessKey(true);
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-gray-400">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // ============ ACTIVATION SCREEN ============
  if (!session.activated) {
    return (
      <div className="min-h-screen bg-black">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-red-900/20">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-red-500 tracking-wide uppercase">Shelby Community</h1>
                <p className="text-xs text-gray-500">{session.username}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-12">
          {/* Activation Card */}
          <Card className="p-8 text-center bg-gray-900/80 border-red-900/20">
            <div className="w-16 h-16 rounded-xl bg-red-600/20 flex items-center justify-center mx-auto mb-6">
              <Key className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              Ativar Acesso Proxy Shelby's
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Você possui <span className="font-semibold text-red-500">{session.credits} crédito(s)</span> disponível(is). 
              Use seu crédito para ativar o acesso e liberar os arquivos de download.
            </p>

            {/* Warning */}
            <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-red-900/20 border border-red-600/30 text-left">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">AVISO IMPORTANTE</p>
                <p className="text-xs text-gray-400">
                  Caso compartilhe tua key com outras pessoas, sua conta será banida no Free Fire.
                  Autorize o IP com a key em: {session.activationUrl ? (
                    <a href={session.activationUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline font-medium">{session.activationUrl}</a>
                  ) : (
                    <span className="text-white font-medium">https://freefireproxy.com.br/ativar/</span>
                  )}
                </p>
              </div>
            </div>

            {/* Expiration Warning for Keys */}
            <div className="mb-4 flex items-start gap-3 p-4 rounded-lg bg-amber-900/20 border border-amber-600/30 text-left">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">EXPIRAÇÃO ANTECIPADA</p>
                <p className="text-xs text-gray-400">
                  As keys podem expirar entre <span className="font-semibold text-white">1 a 6 horas antes</span> do prazo final. Sempre ative uma nova key com antecedência para evitar banimentos no Free Fire.
                </p>
              </div>
            </div>

            {/* Access Key */}
            {session.accessKey && (
              <Card className="p-4 mb-6 bg-black/50 border border-red-600/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300 flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    Sua Chave de Acesso
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 text-xs text-gray-400 hover:text-white"
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

            {/* Server Info */}
            <Card className="p-4 mb-6 bg-black/50 border border-red-600/20 text-left">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-white">Servidores</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono text-gray-400">
                <p>IP: <span className="text-white font-semibold">2.24.121.175</span></p>
                <p>Porta: <span className="text-white font-semibold">9999</span> - Hs Pecoço</p>
                <p>Porta: <span className="text-white font-semibold">9997</span> - Hs Peito</p>
                <p>Porta: <span className="text-white font-semibold">9998</span> - Hs Alto</p>
              </div>
              {session.activationUrl && (
                <div className="mt-3 pt-3 border-t border-red-900/30 flex items-center justify-between">
                  <a
                    href={session.activationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-400 hover:underline font-medium flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ativar agora
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 text-xs text-gray-400 hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(session.activationUrl!);
                      toast.success("Link copiado!");
                    }}
                  >
                    <Copy className="w-3 h-3" />
                    Copiar link
                  </Button>
                </div>
              )}
            </Card>

            {/* Credits */}
            <div className="flex items-center justify-center gap-2 mb-6 px-4 py-3 rounded-lg bg-red-900/10 border border-red-600/20">
              <CreditCard className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-400">Créditos disponíveis:</span>
              <Badge variant="default" className="bg-red-600 text-white">{session.credits}</Badge>
            </div>

            {/* Activate Button */}
            <Button
              size="lg"
              onClick={handleActivate}
              disabled={activateMutation.isPending || session.credits < 1}
              className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide"
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
                Você não possui créditos suficientes. Entre em contato com o administrador.
              </p>
            )}
          </Card>
        </main>
      </div>
    );
  }

  // ============ ACTIVATED - FILES DASHBOARD ============
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-red-900/20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-red-500 tracking-wide uppercase">Shelby Community</h1>
              <p className="text-xs text-gray-500">{session.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-900/20 border border-emerald-600/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-500 font-medium">Ativado</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-900/10">
              <CreditCard className="w-3 h-3 text-red-500" />
              <span className="text-sm font-medium text-red-500">{session.credits}</span>
              <span className="text-xs text-gray-500">créditos</span>
            </div>
            {session.expiresAt && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-900/20 border border-amber-600/30">
                <Clock className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-500 font-medium">
                  Expira em {Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white mb-1">
            Bem-vindo, <span className="text-red-500">{session.username}</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Seus arquivos de instalação estão disponíveis abaixo.
          </p>
        </div>

        {/* Server Info + Activation URL + Access Key Card */}
        <Card className="p-5 mb-6 bg-gray-900/80 border-red-900/20">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-white">Informações do Servidor</span>
          </div>
          <div className="space-y-1 text-xs font-mono text-gray-400 mb-4">
            <p>IP: <span className="text-white font-semibold">2.24.121.175</span></p>
            <p>Porta: <span className="text-white font-semibold">9999</span> - Hs Pecoço</p>
            <p>Porta: <span className="text-white font-semibold">9997</span> - Hs Peito</p>
            <p>Porta: <span className="text-white font-semibold">9998</span> - Hs Alto</p>
          </div>

          {/* Activation URL */}
          {session.activationUrl && (
            <div className="pt-4 border-t border-red-900/30 mb-3">
              <p className="text-xs text-gray-400 mb-1">Link de ativação:</p>
              <div className="flex items-center justify-between">
                <a
                  href={session.activationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-red-400 hover:underline font-medium flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  {session.activationUrl}
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-gray-400 hover:text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(session.activationUrl!);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="w-3 h-3" />
                  Copiar
                </Button>
              </div>
            </div>
          )}

          {/* Access Key */}
          {session.accessKey && (
            <div className="pt-4 border-t border-red-900/30">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-400">Chave de acesso:</p>
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
            </div>
          )}
        </Card>

        {/* Key Expiration Warning */}
        <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-amber-900/20 border border-amber-600/30">
          <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">EXPIRAÇÃO ANTECIPADA DE KEYS</p>
            <p className="text-xs text-gray-400">
              As keys podem expirar entre <span className="font-semibold text-white">1 a 6 horas antes</span> do prazo final. Sempre ative uma nova key com antecedência para evitar banimentos no Free Fire.
            </p>
          </div>
        </div>

        {/* Expiration Warning */}
        {session.expiresAt && new Date(session.expiresAt) < new Date(Date.now() + 24 * 60 * 60 * 1000) && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-amber-900/20 border border-amber-600/30">
            <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Acesso próximo de expirar</p>
              <p className="text-xs text-gray-400">
                Seu acesso expira em {new Date(session.expiresAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}. Entre em contato com o administrador para renovar.
              </p>
            </div>
          </div>
        )}

        {/* Device Warning */}
        <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-red-900/10 border border-red-600/20">
          <Monitor className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">Dispositivo protegido</p>
            <p className="text-xs text-gray-400">
              Este login está vinculado ao seu dispositivo atual. Compartilhamento de tela e gravação estão bloqueados.
            </p>
          </div>
        </div>

        {/* No credits warning */}
        {session.credits === 0 && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-red-900/20 border border-red-600/30">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Sem créditos</p>
              <p className="text-xs text-gray-400">
                Entre em contato com o administrador para renovar seus créditos.
              </p>
            </div>
          </div>
        )}

        {/* Files Grid */}
        {filesQuery.isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : filesQuery.data?.length === 0 ? (
          <Card className="p-12 text-center bg-gray-900/80 border-red-900/20">
            <File className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-white mb-2">
              Nenhum arquivo disponível
            </h3>
            <p className="text-sm text-gray-400">
              Aguarde o administrador disponibilizar os arquivos de instalação.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filesQuery.data?.map((file: any) => (
              <Card
                key={file.id}
                className="p-6 bg-gray-900/80 border-red-900/20 hover:border-red-600/40 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-600/10 flex items-center justify-center group-hover:bg-red-600/20 transition-colors">
                    <File className="w-5 h-5 text-red-500" />
                  </div>
                  <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-300">
                    {formatBytes(file.fileSize || 0)}
                  </Badge>
                </div>
                <h3 className="font-medium text-white mb-1 truncate">
                  {file.originalName}
                </h3>
                {file.description && (
                  <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                    {file.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(file.id)}
                    disabled={downloadMutation.isPending || session.credits <= 0}
                    className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Baixar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
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
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setShowAccessKey(false)}
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-6 text-center border-t border-red-900/20">
        <p className="text-xs text-gray-600">
          Shelby Community — Proteção ativa. Acesso vinculado ao seu dispositivo.
        </p>
      </footer>
    </div>
  );
}
