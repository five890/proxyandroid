import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Clock,
  Copy,
  Key,
  LogOut,
  Loader2,
  Shield,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ============ CREATE CLIENT DIALOG ============
function CreateClientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [label, setLabel] = useState("");
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{
    username: string;
    password: string;
    loginCode: string;
    expiresAt: string;
  } | null>(null);
  const utils = trpc.useUtils();

  const createMutation = trpc.miniAdmin.createClient.useMutation({
    onSuccess: (data) => {
      setCreated(data);
      setLoading(false);
      utils.miniAdmin.listMyClients.invalidate();
    },
    onError: (err: any) => {
      toast.error(err.message);
      setLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    createMutation.mutate({ username, password, label: label || undefined, credits });
  };

  const handleClose = () => {
    if (created) {
      setCreated(null);
    } else {
      onClose();
    }
    setUsername("");
    setPassword("");
    setLabel("");
    setCredits(0);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (created) {
    return (
      <Dialog open={true} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <DialogTitle>Acesso Criado com Sucesso!</DialogTitle>
                <DialogDescription>
                  Salve as credenciais abaixo. Este acesso é válido por 24 horas.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div className="glass rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Usuário</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-background/50 px-2 py-0.5 rounded">{created.username}</code>
                  <button
                    onClick={() => copyToClipboard(created.username, "Usuário")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Senha</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-background/50 px-2 py-0.5 rounded">{created.password}</code>
                  <button
                    onClick={() => copyToClipboard(created.password, "Senha")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Código de Acesso</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-background/50 px-2 py-0.5 rounded">{created.loginCode}</code>
                  <button
                    onClick={() => copyToClipboard(created.loginCode, "Código")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Validade</span>
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  24 horas
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full">Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-gold" />
            </div>
            <div>
              <DialogTitle>Criar Novo Acesso</DialogTitle>
              <DialogDescription>
                Gere um acesso de 24 horas para seu cliente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Nome de Usuário</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: joao.silva"
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Label (opcional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Identificação do cliente"
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Créditos</Label>
            <Input
              type="number"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
              min={0}
              className="bg-background/50"
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="w-full bg-gold hover:bg-gold/90 text-gold-foreground"
              disabled={loading || !username || !password}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </span>
              ) : (
                "Gerar Acesso (24h)"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ MINI ADMIN MAIN PAGE ============
export default function MiniAdmin() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Check admin session (works for both admin and mini_admin)
  const meQuery = trpc.auth.adminMe.useQuery();
  const clientsQuery = trpc.miniAdmin.listMyClients.useQuery(undefined, {
    enabled: !!meQuery.data,
  });

  useEffect(() => {
    if (!meQuery.isLoading) {
      setLoading(false);
      // If not authenticated or role is 'client' (not admin/mini_admin)
      if (!meQuery.data || meQuery.data.role === 'client') {
        navigate("/admin-login");
      }
    }
  }, [meQuery.isLoading, meQuery.data, navigate]);

  const logoutMutation = trpc.auth.adminLogout.useMutation({
    onSuccess: () => {
      navigate("/admin-login");
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!meQuery.data) return null;

  const isAdmin = meQuery.data.role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-gold" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">
                {isAdmin ? "Painel Administrativo" : "Painel Mini Admin"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {meQuery.data.username}
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {isAdmin ? "Admin" : "Mini Admin"}
                </Badge>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="text-muted-foreground hover:text-foreground"
              >
                Painel Principal
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              Início
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{clientsQuery.data?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Acessos Gerados</p>
              </div>
            </div>
          </Card>
          <Card className="glass p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">24h</p>
                <p className="text-xs text-muted-foreground">Duração Fixa</p>
              </div>
            </div>
          </Card>
          <Card className="glass p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {clientsQuery.data?.filter(c => c.active).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Create Button + Table */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Acessos Gerados</h2>
            <p className="text-sm text-muted-foreground">Gerencie os acessos de 24 horas</p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-gold hover:bg-gold/90 text-gold-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Acesso
          </Button>
        </div>

        {/* Table */}
        <Card className="glass overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : clientsQuery.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Key className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-muted-foreground">Nenhum acesso gerado ainda</p>
                      <p className="text-xs text-muted-foreground/60">Clique em "Novo Acesso" para criar</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                clientsQuery.data?.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono text-sm">{client.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.loginCode ? (
                        <code className="text-xs bg-background/50 px-2 py-0.5 rounded font-mono">
                          {client.loginCode}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{client.label || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Clock className="w-3 h-3" />
                        {client.expiresAt ? new Date(client.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={client.active ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {client.active ? "Ativo" : "Expirado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      {/* Create Dialog */}
      <CreateClientDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
