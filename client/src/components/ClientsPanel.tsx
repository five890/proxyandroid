import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Filter, 
  CreditCard, 
  Clock, 
  Monitor,
  Pencil,
  Trash2,
  History,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Client {
  id: number;
  username: string;
  label?: string;
  credits: number;
  active: boolean;
  expiresAt?: string;
  accessType: string;
  createdByAdmin?: string;
  activeSessionCount: number;
  lastLoginAt?: string;
  loginCode?: string;
  role: string;
}

interface ClientsPanelProps {
  clients: Client[];
  isLoading?: boolean;
  onCreateClick: () => void;
  onEditClick: (client: Client) => void;
  onDeleteClick: (client: Client) => void;
  onCreditsClick: (client: Client) => void;
  onHistoryClick: (client: Client) => void;
}

export function ClientsPanel({
  clients,
  isLoading,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onCreditsClick,
  onHistoryClick,
}: ClientsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterType, setFilterType] = useState<"all" | "proxy_android" | "proxy_ios">("all");

  // Filter and search clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Search filter
      const matchesSearch = client.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.label?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const isExpired = client.expiresAt && new Date(client.expiresAt) < new Date();
      const matchesStatus = filterStatus === "all" ||
        (filterStatus === "active" && client.active && !isExpired) ||
        (filterStatus === "inactive" && (!client.active || isExpired));

      // Type filter
      const matchesType = filterType === "all" || client.accessType === filterType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [clients, searchTerm, filterStatus, filterType]);

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            {filteredClients.length} de {clients.length} clientes
          </p>
        </div>
        <Button
          onClick={onCreateClick}
          className="bg-red-600 hover:bg-red-700 text-white gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Buscar por usuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-gray-800 border-gray-700 focus:border-red-500"
          />
        </div>

        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="h-10 bg-gray-800 border-gray-700">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
          <SelectTrigger className="h-10 bg-gray-800 border-gray-700">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="proxy_android">Android</SelectItem>
            <SelectItem value="proxy_ios">iOS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="px-4 py-3 text-left font-semibold">Usuário</th>
                <th className="px-4 py-3 text-left font-semibold">Label</th>
                <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold">Créditos</th>
                <th className="px-4 py-3 text-left font-semibold">Validade</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Online</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const isExpired = client.expiresAt && new Date(client.expiresAt) < new Date();
                const timeLeft = client.expiresAt ? new Date(client.expiresAt).getTime() - Date.now() : null;

                return (
                  <tr key={client.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{client.username}</span>
                        {client.username === "murillo" && (
                          <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                            PROPRIETÁRIO
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{client.label || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          client.accessType === "proxy_android"
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {client.accessType === "proxy_android" ? "Android" : "iOS"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4 text-red-500" />
                        <span className="font-semibold">{client.credits}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {client.expiresAt ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span
                            className={
                              isExpired
                                ? "text-red-500 font-bold"
                                : timeLeft && timeLeft < 24 * 60 * 60 * 1000
                                  ? "text-amber-500"
                                  : "text-green-500"
                            }
                          >
                            {isExpired
                              ? "Expirado"
                              : timeLeft
                                ? timeLeft > 24 * 60 * 60 * 1000
                                  ? `${Math.floor(timeLeft / (24 * 60 * 60 * 1000))}d`
                                  : `${Math.floor(timeLeft / (60 * 60 * 1000))}h`
                                : "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Ilimitado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={isExpired ? "destructive" : client.active ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {isExpired ? "Expirado" : client.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {client.activeSessionCount > 0 ? (
                        <span className="text-green-500 font-semibold">{client.activeSessionCount} online</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-500/20"
                          onClick={() => onEditClick(client)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-amber-500/20"
                          onClick={() => onCreditsClick(client)}
                          title="Créditos"
                        >
                          <CreditCard className="w-4 h-4 text-amber-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-purple-500/20"
                          onClick={() => onHistoryClick(client)}
                          title="Histórico"
                        >
                          <History className="w-4 h-4 text-purple-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-500/20"
                          onClick={() => onDeleteClick(client)}
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {filteredClients.map((client) => {
          const isExpired = client.expiresAt && new Date(client.expiresAt) < new Date();
          const timeLeft = client.expiresAt ? new Date(client.expiresAt).getTime() - Date.now() : null;

          return (
            <Card key={client.id} className="p-4 bg-gray-800/50 border-gray-700">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-white text-base">{client.username}</h3>
                  {client.label && <p className="text-xs text-gray-400 mt-1">{client.label}</p>}
                </div>
                <Badge
                  variant={isExpired ? "destructive" : client.active ? "default" : "destructive"}
                  className="text-xs"
                >
                  {isExpired ? "Expirado" : client.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded">
                  <Badge className={client.accessType === "proxy_android" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                    {client.accessType === "proxy_android" ? "Android" : "iOS"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded">
                  <CreditCard className="w-3 h-3 text-red-500" />
                  <span className="font-semibold">{client.credits}</span>
                </div>

                {client.expiresAt && (
                  <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded">
                    <Clock className="w-3 h-3" />
                    <span className={isExpired ? "text-red-500" : "text-amber-500"}>
                      {isExpired ? "Expirado" : timeLeft ? `${Math.floor(timeLeft / (24 * 60 * 60 * 1000))}d` : "—"}
                    </span>
                  </div>
                )}

                {client.activeSessionCount > 0 && (
                  <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded">
                    <Monitor className="w-3 h-3 text-green-500" />
                    <span className="text-green-500">{client.activeSessionCount} online</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs border-gray-600 hover:bg-blue-500/20"
                  onClick={() => onEditClick(client)}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs border-gray-600 hover:bg-amber-500/20"
                  onClick={() => onCreditsClick(client)}
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Créditos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-gray-600 hover:bg-red-500/20"
                  onClick={() => onDeleteClick(client)}
                  title="Deletar"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <Card className="p-12 text-center">
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhum cliente encontrado</p>
          <p className="text-sm text-gray-500 mt-1">Tente ajustar seus filtros</p>
        </Card>
      )}
    </div>
  );
}
