import { useState, useEffect } from "react";
import { formatBytes } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Switch } from "@/components/ui/switch";
import {
  Users,
  FileUp,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  CreditCard,
  Monitor,
  File,
  Download,
  Upload,
  History,
  ShieldCheck,
  Shield,
  LogOut,
  Loader2,
  Clock,
  RefreshCw,
  Copy,
  Key,
  ClipboardPaste,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import MiniAdminPanel from "@/pages/MiniAdmin";

// ============ CLIENT MANAGEMENT ============
function ClientManagement({ currentAdmin }: { currentAdmin?: { id: number; username: string; role: string } }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showCredits, setShowCredits] = useState<any>(null);
  const [showHistory, setShowHistory] = useState<any>(null);
  const utils = trpc.useUtils();

  const clientsQuery = trpc.admin.listClients.useQuery();
  const createMutation = trpc.admin.createClient.useMutation({
    onSuccess: () => {
      toast.success("Cliente criado com sucesso");
      setShowCreate(false);
      utils.admin.listClients.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.admin.updateClient.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso");
      setEditingClient(null);
      utils.admin.listClients.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = trpc.admin.toggleClientActive.useMutation({
    onSuccess: () => utils.admin.listClients.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });

  const resetDeviceMutation = trpc.admin.resetClientDevice.useMutation({
    onSuccess: () => {
      toast.success("Dispositivo resetado com sucesso");
      utils.admin.listClients.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.admin.deleteClient.useMutation({
    onSuccess: () => {
      toast.success("Cliente removido com sucesso");
      utils.admin.listClients.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addCreditsMutation = trpc.admin.addCredits.useMutation({
    onSuccess: () => {
      toast.success("Créditos atualizados com sucesso");
      setShowCredits(null);
      utils.admin.listClients.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const historyQuery = showHistory
    ? trpc.admin.getCreditHistory.useQuery({ credentialId: showHistory.id })
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gerenciamento de Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie credenciais de acesso
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30">
              <TableHead>Usuário</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Criado por</TableHead>
              <TableHead>Créditos</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gerações</TableHead>
              <TableHead>Dispositivo</TableHead>
              <TableHead>IP Vinculado</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientsQuery.data?.map((client: any) => (
              <TableRow key={client.id} className="hover:bg-secondary/20">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {client.username}
                    {client.username === 'murillo' && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">PROPRIETÁRIO</Badge>
                    )}
                    {client.role === 'admin' && client.username !== 'murillo' && (
                      <Badge variant="secondary" className="text-[10px]">ADMIN</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {client.loginCode ? (
                    <span className="text-xs font-mono tracking-[0.1em] text-primary bg-primary/5 px-2 py-1 rounded border border-primary/20">
                      {client.loginCode}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{client.label || "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      client.accessType === 'proxy_android'
                        ? 'text-[10px] bg-green-500/10 text-green-400 border-green-500/30'
                        : 'text-[10px] bg-red-500/10 text-red-400 border-red-500/30'
                    }
                  >
                    {client.accessType === 'proxy_android' ? 'Android' : 'iOS'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {client.createdByAdmin ? (
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                      {client.createdByAdmin}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3 h-3 text-primary" />
                    <span className="font-medium">{client.credits}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {client.expiresAt ? (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-500">
                        {(() => {
                          const daysLeft = Math.floor((new Date(client.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          if (daysLeft <= 0) return "Expirado";
                          if (daysLeft === 1) return "1 dia";
                          return `${daysLeft} dias`;
                        })()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Ilimitado</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={(() => {
                    const isExpired = client.expiresAt && new Date(client.expiresAt) < new Date();
                    if (isExpired) return "destructive";
                    return client.active ? "default" : "destructive";
                  })()} className="text-xs">
                    {(() => {
                      const isExpired = client.expiresAt && new Date(client.expiresAt) < new Date();
                      if (isExpired) return "Expirado";
                      return client.active ? "Ativo" : "Inativo";
                    })()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono">
                    {client.generationLimit > 0 ? (
                      <span className={client.generationsUsed >= client.generationLimit ? "text-red-500" : "text-amber-500"}>
                        {client.generationsUsed || 0}/{client.generationLimit}
                      </span>
                    ) : (
                      <span className="text-emerald-500">Ilimitado</span>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  {client.deviceFingerprint ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        Vinculado
                      </span>
                      {client.deviceType && (
                        <span className={`text-xs font-medium ${client.deviceType === 'mobile' ? 'text-blue-400' : 'text-purple-400'}`}>
                          {client.deviceType === 'mobile' ? '📱 Celular' : '💻 PC'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Nenhum</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground font-mono">
                    {client.deviceIP || '—'}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {client.lastLoginAt
                      ? new Date(client.lastLoginAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Nunca"}
                  </span>
                </TableCell>
                <TableCell>
                  {client.username === 'murillo' ? (
                    <div className="flex items-center justify-end">
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">PROTEGIDO</Badge>
                    </div>
                  ) : (
                  <div className="flex items-center justify-end gap-1">
                    {true && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingClient(client)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {true && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowCredits(client)}
                        title="Créditos"
                      >
                        <CreditCard className="w-4 h-4" />
                      </Button>
                    )}
                    {true && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowHistory(client)}
                        title="Histórico"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    )}
                    {true && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => resetDeviceMutation.mutate({ id: client.id })}
                        title="Resetar Dispositivo"
                        disabled={!client.deviceFingerprint}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    {true && (
                      <div className="flex items-center mx-1">
                        <Switch
                          checked={client.active}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: client.id, active: checked })
                          }
                        />
                      </div>
                    )}
                    {true && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja remover este cliente?")) {
                            deleteMutation.mutate({ id: client.id });
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!clientsQuery.data?.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Client Dialog */}
      <CreateClientDialog open={showCreate} onClose={() => setShowCreate(false)} mutation={createMutation} />

      {/* Edit Client Dialog */}
      {editingClient && (
        <EditClientDialog
          client={editingClient}
          onClose={() => setEditingClient(null)}
          mutation={updateMutation}
        />
      )}

      {/* Credits Dialog */}
      {showCredits && (
        <CreditsDialog
          client={showCredits}
          currentAdmin={currentAdmin}
          onClose={() => setShowCredits(null)}
          mutation={addCreditsMutation}
        />
      )}

      {/* History Dialog */}
      {showHistory && (
        <HistoryDialog
          client={showHistory}
          transactions={historyQuery?.data || []}
          isLoading={historyQuery?.isLoading || false}
          onClose={() => setShowHistory(null)}
        />
      )}
    </div>
  );
}

// ============ FILE MANAGEMENT ============
function FileManagement() {
  const [showUpload, setShowUpload] = useState(false);
  const utils = trpc.useUtils();

  const filesQuery = trpc.admin.listFiles.useQuery();
  const uploadMutation = trpc.admin.uploadFile.useMutation({
    onSuccess: () => {
      toast.success("Arquivo enviado com sucesso");
      setShowUpload(false);
      utils.admin.listFiles.invalidate();
      utils.clientFiles.files.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.admin.deleteFile.useMutation({
    onSuccess: () => {
      toast.success("Arquivo removido com sucesso");
      utils.admin.listFiles.invalidate();
      utils.clientFiles.files.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        filename: `${Date.now()}_${file.name.replace(/\s/g, "_")}`,
        originalName: file.name,
        data: base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gerenciamento de Arquivos</h2>
          <p className="text-sm text-muted-foreground">
            Faça upload e gerencie arquivos de instalação
          </p>
        </div>
        <Button
          onClick={() => setShowUpload(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Upload className="w-4 h-4" />
          Enviar Arquivo
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30">
              <TableHead>Arquivo</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filesQuery.data?.map((file: any) => (
              <TableRow key={file.id} className="hover:bg-secondary/20">
                <TableCell className="font-medium flex items-center gap-2">
                  <File className="w-4 h-4 text-primary" />
                  {file.originalName}
                </TableCell>
                <TableCell>{formatBytes(file.fileSize || 0)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{file.mimeType}</TableCell>
                <TableCell>
                  {new Date(file.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Remover este arquivo?")) {
                        deleteMutation.mutate({ id: file.id });
                      }
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!filesQuery.data?.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Nenhum arquivo disponível. Clique em "Enviar Arquivo" para começar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enviar Arquivo</DialogTitle>
            <DialogDescription>
              Selecione um arquivo para disponibilizar aos clientes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">
                  Clique para selecionar um arquivo
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Aceita qualquer formato de arquivo
                </p>
              </div>
            </Label>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="*/*"
            />
            {uploadMutation.isPending && (
              <div className="mt-4 text-center">
                <p className="text-sm text-primary animate-pulse">Enviando arquivo...</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUpload(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Generate a unique random numeric login code (e.g., 0930 9202 8377)
 */
function generateLoginCode(): string {
  const groups: string[] = [];
  for (let i = 0; i < 4; i++) {
    const num = Math.floor(Math.random() * 10000);
    groups.push(num.toString().padStart(4, '0'));
  }
  return groups.join(' ');
}

function generateAccessKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const parts: string[] = [];
  for (let p = 0; p < 4; p++) {
    let part = '';
    for (let i = 0; i < 5; i++) {
      part += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    parts.push(part);
  }
  return parts.join('-');
}

// ============ DIALOGS ============
function CreateClientDialog({ open, onClose, mutation }: any) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [label, setLabel] = useState("");
  const [credits, setCredits] = useState("0");
  const [role, setRole] = useState<"client" | "admin">("client");
  const [durationDays, setDurationDays] = useState("1");
  const [generationLimit, setGenerationLimit] = useState("0");
  const [accessType, setAccessType] = useState<"proxy_ios" | "proxy_android">("proxy_ios");
  const [generatedLoginCode, setGeneratedLoginCode] = useState("");
  const [accessKeyInput, setAccessKeyInput] = useState("");
  const [showCreated, setShowCreated] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);

  // Generate login code when dialog opens
  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setGeneratedLoginCode(generateLoginCode());
      setAccessKeyInput("");
      setShowCreated(false);
      setCreatedCredentials(null);
    }
    onClose(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessType === 'proxy_android' && (!accessKeyInput || accessKeyInput.trim().length === 0)) {
      toast.error("Proxy Android exige uma chave de acesso obrigatória.");
      return;
    }
    mutation.mutate(
      {
        username,
        password,
        label: label || undefined,
        credits: parseInt(credits) || 0,
        role: 'client',
        durationDays: parseInt(durationDays) || undefined,
        generationLimit: parseInt(generationLimit) || 0,
        accessType,
        accessKey: accessType === 'proxy_android' ? accessKeyInput : undefined,
      },
      {
        onSuccess: (data) => {
          setCreatedCredentials({
            username,
            password,
            loginCode: generatedLoginCode,
            label: label || undefined,
            durationDays: parseInt(durationDays) || 1,
            accessKey: data?.accessKey || null,
            accessType: data?.accessType || 'proxy_ios',
          });
          setShowCreated(true);
          setUsername("");
          setPassword("");
          setLabel("");
          setCredits("0");
          setRole("client");
          setDurationDays("1");
          setGenerationLimit("0");
          setAccessType("proxy_ios");
          setAccessKeyInput("");
          setGeneratedLoginCode(generateLoginCode());
        },
      }
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // Show created credentials screen
  if (showCreated && createdCredentials) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Credenciais Criadas
            </DialogTitle>
            <DialogDescription>
              Copie as credenciais abaixo e envie para o cliente. Elas não serão mostradas novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Login Code - destaque principal */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-primary">Código de Acesso</span>
              </div>
              <p className="text-xl font-bold tracking-[0.15em] text-primary font-mono">
                {createdCredentials.loginCode}
              </p>
            </div>

            {/* Username */}
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <span className="text-xs text-muted-foreground">Usuário</span>
              <p className="text-sm font-medium text-foreground mt-1">{createdCredentials.username}</p>
            </div>

            {/* Password */}
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <span className="text-xs text-muted-foreground">Senha</span>
              <p className="text-sm font-medium text-foreground mt-1">{createdCredentials.password}</p>
            </div>

            {/* Tipo de Acesso */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs text-blue-400">Tipo de Acesso</span>
              <p className="text-sm font-medium text-blue-300 mt-1">
                {createdCredentials.accessType === 'proxy_android' ? 'Proxy Android' : 'Proxy iOS'}
              </p>
            </div>

            {/* Key - mostrada apenas para Proxy Android */}
            {createdCredentials.accessType === 'proxy_android' && createdCredentials.accessKey && (
              <div className="p-3 rounded-lg bg-gold/10 border border-gold/20">
                <span className="text-xs text-gold">Chave de Acesso</span>
                <p className="text-sm font-mono text-gold font-semibold mt-1">{createdCredentials.accessKey}</p>
              </div>
            )}

            {/* Info */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-500">
                Duração: {createdCredentials.durationDays} dia(s) | Label: {createdCredentials.label || "Sem label"}
              </p>
            </div>

            {/* Single Copy Button - copia usuário + senha + código + key se for Proxy Android */}
            <div className="pt-2 border-t border-border">
              <Button
                className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => {
                  let all = `Usuário: ${createdCredentials.username}\nSenha: ${createdCredentials.password}\nCódigo: ${createdCredentials.loginCode}`;
                  if (createdCredentials.accessType === 'proxy_android' && createdCredentials.accessKey) {
                    all += `\nChave: ${createdCredentials.accessKey}`;
                  }
                  copyToClipboard(all, "Credenciais");
                }}
              >
                <Copy className="w-4 h-4" /> Copiar Login e Senha
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowCreated(false)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Criar Outro Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto sm:max-h-[90vh] max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Cliente</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo acesso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nome do usuário"
              required
              minLength={3}
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
              required
              minLength={6}
              className="bg-background/50"
            />
          </div>
          {/* Login Code Preview */}
          <div className="space-y-2">
            <Label>Código de Acesso (gerado automaticamente)</Label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-lg font-bold tracking-[0.15em] text-primary font-mono flex-1">
                {generatedLoginCode}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newCode = generateLoginCode();
                  setGeneratedLoginCode(newCode);
                }}
                className="text-primary hover:bg-primary/20"
                title="Gerar novo código"
              >
                <Key className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(generatedLoginCode, "Código de acesso")}
                className="text-primary hover:bg-primary/20"
                title="Copiar"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O cliente usará este código para fazer login junto com o usuário e senha.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Label (opcional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="identificação do cliente"
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Créditos Iniciais</Label>
            <Input
              type="number"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              min="0"
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Duração do Acesso (dias)</Label>
            <Input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              min="1"
              placeholder="Ex: 1 para 1 dia, 30 para 30 dias"
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              Após esse período, o login será desativado automaticamente.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Limite de Gerações</Label>
            <Input
              type="number"
              value={generationLimit}
              onChange={(e) => setGenerationLimit(e.target.value)}
              min="0"
              placeholder="0 = sem limite"
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              Número máximo de gerações que o cliente pode fazer. 0 = sem limite.
            </p>
          </div>
          {/* Tipo de Acesso */}
          <div className="space-y-2">
            <Label>Tipo de Acesso</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={accessType === 'proxy_ios' ? 'default' : 'outline'}
                onClick={() => { setAccessType('proxy_ios'); setAccessKeyInput(''); }}
                className={accessType === 'proxy_ios' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Proxy iOS
              </Button>
              <Button
                type="button"
                variant={accessType === 'proxy_android' ? 'default' : 'outline'}
                onClick={() => setAccessType('proxy_android')}
                className={accessType === 'proxy_android' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Proxy Android
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {accessType === 'proxy_ios' 
                ? 'Proxy iOS: Cliente recebe key + link de ativação. Não ativado automaticamente.'
                : 'Proxy Android: Cliente vai direto pro painel de arquivos. Requer chave obrigatória.'
              }
            </p>
          </div>

          {/* Chave de Acesso - obrigatória para Proxy Android */}
          <div className="space-y-2">
            <Label>
              Chave de Acesso {accessType === 'proxy_android' && <span className="text-red-500">*</span>}
            </Label>
            <Input
              value={accessKeyInput}
              onChange={(e) => setAccessKeyInput(e.target.value)}
              onPaste={(e) => {
                e.stopPropagation();
                const pastedText = e.clipboardData.getData('text');
                setAccessKeyInput((prev) => prev + pastedText);
              }}
              placeholder={accessType === 'proxy_android' ? 'Obrigatória para Proxy Android' : 'Opcional'}
              className="bg-background/50"
              autoComplete="off"
            />
            {accessType === 'proxy_android' && !accessKeyInput.trim() && (
              <p className="text-xs text-red-500">A chave de acesso é obrigatória para Proxy Android.</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={mutation.isPending || !username || !password || (accessType === 'proxy_android' && !accessKeyInput.trim())}
            >
              {mutation.isPending ? "Criando..." : "Criar Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditClientDialog({ client, onClose, mutation }: any) {
  const utils = trpc.useUtils();
  const [username, setUsername] = useState(client.username);
  const [label, setLabel] = useState(client.label || "");
  const [active, setActive] = useState(client.active);
  const [newPassword, setNewPassword] = useState("");
  const [durationDays, setDurationDays] = useState(client.durationDays ? String(client.durationDays) : "1");
  const [generationLimit, setGenerationLimit] = useState(String(client.generationLimit || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      id: client.id,
      username,
      label: label || undefined,
      active,
      durationDays: parseInt(durationDays) || undefined,
      generationLimit: parseInt(generationLimit) || 0,
    });
  };

  const updatePasswordMutation = trpc.admin.updateClientPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha atualizada com sucesso");
      setNewPassword("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const generateNewCodeMutation = trpc.admin.regenerateLoginCode.useMutation({
    onSuccess: (data) => {
      toast.success(`Novo código gerado: ${data.loginCode}`);
      if (data.loginCode) {
        navigator.clipboard.writeText(data.loginCode);
        toast.success("Código copiado para a área de transferência!");
      }
      utils.admin.listClients.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const copyLoginCode = (code: string) => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Código copiado!");
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Atualize as informações do cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-background/50"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Nova Senha (deixe vazio para manter)</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                minLength={6}
                className="bg-background/50"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (newPassword.length >= 6) {
                    updatePasswordMutation.mutate({
                      id: client.id,
                      password: newPassword,
                    });
                  }
                }}
                disabled={newPassword.length < 6}
              >
                Atualizar
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Duração do Acesso (dias)</Label>
            <Input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              min="1"
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              {client.expiresAt
                ? `Expira em: ${new Date(client.expiresAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}`
                : "Sem expiração definida"}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Limite de Gerações</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={generationLimit}
                onChange={(e) => setGenerationLimit(e.target.value)}
                min="0"
                className="bg-background/50 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  trpc.admin.resetGenerations.mutate(
                    { id: client.id },
                    {
                      onSuccess: () => {
                        toast.success("Gerações resetadas para 0");
                        utils.admin.listClients.invalidate();
                      },
                      onError: (err: any) => toast.error(err.message),
                    }
                  );
                }}
                className="text-xs"
              >
                Resetar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Atual: {client.generationsUsed || 0} usadas / {client.generationLimit || 0} limite. 0 = sem limite.
            </p>
          </div>
          {/* Login Code Section */}
          <div className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Código de Acesso</Label>
              {client.loginCode && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyLoginCode(client.loginCode)}
                  className="h-5 px-2 text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" /> Copiar
                </Button>
              )}
            </div>
            {client.loginCode ? (
              <p className="text-sm font-mono tracking-[0.1em] text-primary">{client.loginCode}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum código gerado</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => generateNewCodeMutation.mutate({ id: client.id })}
              className="mt-2 w-full gap-2 text-xs"
              disabled={generateNewCodeMutation.isPending}
            >
              <Key className="w-3 h-3" />
              {generateNewCodeMutation.isPending ? "Gerando..." : "Gerar Novo Código"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreditsDialog({ client, currentAdmin, onClose, mutation }: any) {
  const isOwner = currentAdmin?.username === 'murillo';
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount);
    if (isNaN(numAmount)) return;
    mutation.mutate({
      id: client.id,
      amount: numAmount,
      reason: reason || undefined,
    });
    setAmount("");
    setReason("");
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Créditos</DialogTitle>
          <DialogDescription>
            Saldo atual: <span className="font-bold text-primary">{client.credits} créditos</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Quantidade (use negativo para remover)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="ex: 10 ou -5"
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex: Renovação mensal"
              className="bg-background/50"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setAmount("1"); setReason("Adição de crédito"); }}
            >
              +1
            </Button>
            {isOwner && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setAmount("5"); setReason("Adição de créditos"); }}
                >
                  +5
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setAmount("10"); setReason("Adição de créditos"); }}
                >
                  +10
                </Button>
              </>
            )}
            {isOwner && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setAmount((-client.credits).toString()); setReason("Zeramento de créditos"); }}
              >
                Zerar
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={mutation.isPending || !amount}
            >
              {mutation.isPending ? "Aplicando..." : "Aplicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ client, transactions, isLoading, onClose }: any) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Créditos</DialogTitle>
          <DialogDescription>
            {client.username} — Movimentações de crédito
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma movimentação registrada.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {tx.amount > 0 ? (
                        <span className="text-green-500">+{tx.amount}</span>
                      ) : (
                        <span className="text-red-500">{tx.amount}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.reason}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ MINI ADMIN MANAGEMENT ============
function MiniAdminManagement() {
  const [showCreate, setShowCreate] = useState(false);
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const utils = trpc.useUtils();

  const miniAdminsQuery = trpc.admin.listMiniAdmins.useQuery();
  const createMiniAdminMutation = trpc.admin.createMiniAdmin.useMutation({
    onSuccess: () => {
      toast.success("Mini admin criado com sucesso!");
      setShowCreate(false);
      setCreateUsername("");
      setCreatePassword("");
      utils.admin.listMiniAdmins.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = trpc.admin.toggleMiniAdminActive.useMutation({
    onSuccess: () => utils.admin.listMiniAdmins.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.admin.deleteMiniAdmin.useMutation({
    onSuccess: () => {
      toast.success("Mini admin removido");
      utils.admin.listMiniAdmins.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername || !createPassword) return;
    createMiniAdminMutation.mutate({
      username: createUsername,
      password: createPassword,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Mini Administradores</h2>
          <p className="text-sm text-muted-foreground">Gerencie os mini admins que podem gerar acessos de 24h</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-gold hover:bg-gold/90 text-gold-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Mini Admin
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-gold" />
              </div>
              <div>
                <DialogTitle>Criar Mini Admin</DialogTitle>
                <DialogDescription>
                  Mini admins podem gerar acessos de 24 horas para clientes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Input
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value)}
                placeholder="Nome de usuário"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="bg-background/50"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-gold hover:bg-gold/90 text-gold-foreground"
                disabled={createMiniAdminMutation.isPending || !createUsername || !createPassword}
              >
                {createMiniAdminMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando...
                  </span>
                ) : "Criar Mini Admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <Card className="glass overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {miniAdminsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : miniAdminsQuery.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Nenhum mini admin cadastrado</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              miniAdminsQuery.data?.map((ma) => (
                <TableRow key={ma.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-gold" />
                      <span className="font-medium">{ma.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ma.active ? "default" : "destructive"} className="text-xs">
                      {ma.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(ma.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Switch
                        checked={ma.active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: ma.id, active: checked })}
                      />
                      {ma.username !== 'murillo' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Remover mini admin "${ma.username}"?`)) {
                              deleteMutation.mutate({ id: ma.id });
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ============ SETTINGS MANAGEMENT ============
function SettingsManagement() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.admin.getSettings.useQuery();
  const [activationUrl, setActivationUrl] = useState("https://freefireproxy.com.br/ativar/");
  const [globalAccessKey, setGlobalAccessKey] = useState("");
  const updateMutation = trpc.admin.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações atualizadas com sucesso");
      utils.admin.getSettings.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      if (settingsQuery.data.activation_url) {
        setActivationUrl(settingsQuery.data.activation_url);
      }
      if (settingsQuery.data.access_key) {
        setGlobalAccessKey(settingsQuery.data.access_key);
      }
    }
  }, [settingsQuery.data]);

  const handleSaveUrl = () => {
    updateMutation.mutate({ activationUrl });
  };

  const handleSaveAccessKey = () => {
    updateMutation.mutate({ accessKey: globalAccessKey });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Configurações do Portal</h2>
        <p className="text-sm text-muted-foreground">Gerencie as configurações globais do sistema</p>
      </div>

      {/* Activation URL */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          URL de Ativação
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          URL que os clientes acessam para ativar a key com o IP do dispositivo.
          Exibida na tela de ativação e no painel do cliente após a ativação.
        </p>
        <div className="flex gap-3">
          <Input
            value={activationUrl}
            onChange={(e) => setActivationUrl(e.target.value)}
            placeholder="https://freefireproxy.com.br/ativar/"
            className="flex-1"
          />
          <Button
            onClick={handleSaveUrl}
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
        {activationUrl && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground mb-1">Preview do link que será exibido ao cliente:</p>
            <a
              href={activationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline font-medium"
            >
              {activationUrl}
            </a>
          </div>
        )}
      </Card>

      {/* Global Access Key */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-gold" />
          Chave de Acesso Global
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Esta chave será aplicada automaticamente em todos os clientes criados. Quando o cliente ativar a conta, esta chave será exibida para ele usar no serviço.
        </p>
        <div className="flex gap-3">
          <Input
            value={globalAccessKey}
            onChange={(e) => setGlobalAccessKey(e.target.value)}
            onPaste={(e) => {
              e.stopPropagation();
              const pastedText = e.clipboardData.getData('text');
              setGlobalAccessKey(pastedText);
            }}
            placeholder="Ex: SHB-XXXX-XXXX-XXXX"
            className="flex-1 font-mono"
            type="text"
            autoComplete="off"
          />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-gray-400 hover:text-white"
            onClick={() => {
              navigator.clipboard.writeText(globalAccessKey);
              toast.success("Chave copiada!");
            }}
          >
            <Copy className="w-4 h-4" /> Copiar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-gray-400 hover:text-white"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                setGlobalAccessKey(text);
                toast.success("Chave colada!");
              } catch {
                toast.error("Não foi possível acessar a área de transferência. Cole manualmente.");
              }
            }}
          >
            <ClipboardPaste className="w-4 h-4" /> Colar
          </Button>
          <Button
            onClick={handleSaveAccessKey}
            disabled={updateMutation.isPending}
            className="bg-gold hover:bg-gold/90 text-black gap-2 font-semibold"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
        {globalAccessKey && (
          <div className="mt-4 p-3 rounded-lg bg-gold/5 border border-gold/10">
            <p className="text-xs text-muted-foreground mb-1">Chave que será aplicada nos novos clientes:</p>
            <p className="text-sm text-gold font-mono font-semibold">{globalAccessKey}</p>
          </div>
        )}
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-primary/5 border border-primary/10">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Como funciona:</span> O admin configura a URL de ativação e a chave de acesso acima.
          Quando um cliente cria o login, ele recebe 1 crédito. Ao logar, ele precisa usar esse crédito para ativar a conta.
          Após a ativação, a URL e a chave de acesso aparecem no painel do cliente com botões de copiar para facilitar o uso.
        </p>
      </Card>
    </div>
  );
}

// ============ MAIN ADMIN PAGE ============
function Admin() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);

  // Check admin session
  const adminMeQuery = trpc.auth.adminMe.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes - prevent refetch on every mutation
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // Only redirect after query finishes AND data is explicitly null (not just loading)
    if (!adminMeQuery.isLoading && !adminMeQuery.isFetching && adminMeQuery.data === null) {
      // Small delay to allow cookie to be set properly
      const timer = setTimeout(() => {
        if (!adminMeQuery.data) {
          navigate("/admin-login");
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    if (!adminMeQuery.isLoading) {
      setLoading(false);
    }
  }, [adminMeQuery.isLoading, adminMeQuery.isFetching, adminMeQuery.data, navigate]);

  const logoutMutation = trpc.auth.adminLogout.useMutation({
    onSuccess: () => {
      navigate("/admin-login");
    },
  });

  const handleAdminLogout = () => {
    logoutMutation.mutate();
  };

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

  if (!adminMeQuery.data) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="glass sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-gold" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Painel Administrativo</h1>
              <p className="text-xs text-muted-foreground">{adminMeQuery.data.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
              onClick={handleAdminLogout}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="bg-secondary/30">
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              Clientes
            </TabsTrigger>
            {adminMeQuery.data?.username === 'murillo' && (
              <>
                <TabsTrigger value="files" className="gap-2">
                  <FileUp className="w-4 h-4" />
                  Arquivos
                </TabsTrigger>
                <TabsTrigger value="mini-admins" className="gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Admins
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Key className="w-4 h-4" />
                  Configurações
                </TabsTrigger>
              </>
            )}
          </TabsList>
          <TabsContent value="clients">
            <ClientManagement currentAdmin={adminMeQuery.data} />
          </TabsContent>
          {adminMeQuery.data?.username === 'murillo' && (
            <>
              <TabsContent value="files">
                <FileManagement />
              </TabsContent>
              <TabsContent value="mini-admins">
                <MiniAdminManagement />
              </TabsContent>
              <TabsContent value="settings">
                <SettingsManagement />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default Admin;
