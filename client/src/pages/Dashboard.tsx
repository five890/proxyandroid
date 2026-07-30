import { useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Check client session - always fresh from DB
  const clientMeQuery = trpc.auth.clientMe.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30s to catch credit changes
    refetchOnWindowFocus: true,
  });

  // Check for expired session from tRPC error
  const clientMeError = clientMeQuery.error as any;
  const isExpiredError = clientMeError?.data?.code === "FORBIDDEN" && 
    (clientMeError?.message?.includes("expirou") || clientMeError?.message?.includes("Expirou"));

  useEffect(() => {
    if (!clientMeQuery.isLoading) {
      if (!clientMeQuery.data) {
        const isExpired = sessionStorage.getItem("login_expired") === "true" || isExpiredError;
        if (isExpired) {
          setLocation("/expired");
        } else {
          setLocation("/login");
        }
      }
    }
  }, [clientMeQuery.data, clientMeQuery.isLoading, isExpiredError]);

  // Fetch files
  const filesQuery = trpc.clientFiles.files.useQuery();

  // Check for expired error from files query
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

  // Download handler - always validates credits from server
  const downloadMutation = trpc.clientFiles.downloadFile.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.originalName;
      link.click();
      toast.success(`Download iniciado: ${data.originalName}`);
      // Refresh session data after download
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

  const session = clientMeQuery.data;

  if (clientMeQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Portal de Acesso</h1>
              <p className="text-xs text-muted-foreground">{session.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10">
              <CreditCard className="w-3 h-3 text-primary" />
              <span className="text-sm font-medium text-primary">{session.credits}</span>
              <span className="text-xs text-muted-foreground">créditos</span>
            </div>
            {session.expiresAt && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
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
              className="text-muted-foreground hover:text-foreground gap-2"
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
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Bem-vindo, <span className="gradient-text">{session.username}</span>
          </h2>
          <p className="text-muted-foreground text-sm">
            Seus arquivos de instalação estão disponíveis abaixo.
          </p>
        </div>

        {/* Expiration Warning */}
        {session.expiresAt && new Date(session.expiresAt) < new Date(Date.now() + 24 * 60 * 60 * 1000) && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-500">Acesso próximo de expirar</p>
              <p className="text-xs text-muted-foreground">
                Seu acesso expira em {new Date(session.expiresAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}. Entre em contato com o administrador para renovar.
              </p>
            </div>
          </div>
        )}

        {/* Device Warning */}
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <Monitor className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Dispositivo protegido</p>
            <p className="text-xs text-muted-foreground">
              Este login está vinculado ao seu dispositivo atual. Compartilhamento de tela e gravação estão bloqueados.
            </p>
          </div>
        </div>

        {/* No credits warning */}
        {session.credits === 0 && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Sem créditos</p>
              <p className="text-xs text-muted-foreground">
                Entre em contato com o administrador para renovar seus créditos.
              </p>
            </div>
          </div>
        )}

        {/* Files Grid */}
        {filesQuery.isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filesQuery.data?.length === 0 ? (
          <Card className="p-12 text-center">
            <File className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum arquivo disponível
            </h3>
            <p className="text-sm text-muted-foreground">
              Aguarde o administrador disponibilizar os arquivos de instalação.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filesQuery.data?.map((file: any) => (
              <Card
                key={file.id}
                className="p-6 hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <File className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {formatBytes(file.fileSize || 0)}
                  </Badge>
                </div>
                <h3 className="font-medium text-foreground mb-1 truncate">
                  {file.originalName}
                </h3>
                {file.description && (
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                    {file.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(file.id)}
                    disabled={downloadMutation.isPending || session.credits <= 0}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
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

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-6 text-center border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          Proteção ativa: este acesso está vinculado ao seu dispositivo e não pode ser compartilhado.
        </p>
      </footer>
    </div>
  );
}
