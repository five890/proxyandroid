import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<any>(null);

  // Check client session
  const clientMeQuery = trpc.auth.clientMe.useQuery();

  useEffect(() => {
    if (!clientMeQuery.isLoading) {
      if (clientMeQuery.data) {
        setSession(clientMeQuery.data);
      } else {
        setLocation("/login");
      }
    }
  }, [clientMeQuery.data, clientMeQuery.isLoading]);

  // Fetch files
  const filesQuery = trpc.clientFiles.files.useQuery();

  // Logout
  const logoutMutation = trpc.auth.clientLogout.useMutation({
    onSuccess: () => {
      setLocation("/login");
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
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao baixar arquivo");
    },
  });

  const handleDownload = (fileId: number) => {
    if (session.credits <= 0) {
      toast.error("Sem créditos suficientes para download.");
      return;
    }
    downloadMutation.mutate({ fileId });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

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
