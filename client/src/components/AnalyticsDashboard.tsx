import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  CreditCard, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  RefreshCw,
  BarChart3,
  ShieldAlert,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

interface AnalyticsDashboardProps {
  isOwner: boolean;
}

export function AnalyticsDashboard({ isOwner }: AnalyticsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<30 | 7 | 90>("30");

  const statsQuery = trpc.analytics.getSystemStats.useQuery(undefined, {
    enabled: isOwner,
    refetchInterval: 60000, // Refetch every minute
  });

  const auditLogsQuery = trpc.analytics.getAuditLogs.useQuery(
    { limit: 10, offset: 0 },
    { enabled: isOwner }
  );

  const securityEventsQuery = trpc.analytics.getUnresolvedSecurityEvents.useQuery(
    undefined,
    { enabled: isOwner }
  );

  const handleRefresh = () => {
    statsQuery.refetch();
    auditLogsQuery.refetch();
    securityEventsQuery.refetch();
    toast.success("Dados atualizados!");
  };

  if (!isOwner) {
    return null;
  }

  const stats = statsQuery.data;
  const auditLogs = auditLogsQuery.data || [];
  const securityEvents = securityEventsQuery.data || [];

  // Mock data for charts - in production, this would come from the API
  const usageData = [
    { name: "Seg", logins: 120, downloads: 80 },
    { name: "Ter", logins: 150, downloads: 95 },
    { name: "Qua", logins: 130, downloads: 75 },
    { name: "Qui", logins: 180, downloads: 120 },
    { name: "Sex", logins: 200, downloads: 140 },
    { name: "Sab", logins: 90, downloads: 50 },
    { name: "Dom", logins: 110, downloads: 65 },
  ];

  const creditsData = [
    { name: "Usados", value: 450, color: "#ef4444" },
    { name: "Disponíveis", value: 550, color: "#10b981" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard de Análise</h2>
          <p className="text-sm text-muted-foreground">Visão geral do sistema e atividades recentes</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={statsQuery.isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${statsQuery.isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clients */}
        <Card className="p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total de Clientes</p>
              <p className="text-3xl font-bold text-foreground">
                {statsQuery.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.totalClients || 0}
              </p>
            </div>
            <Users className="w-10 h-10 text-blue-500/20" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <span className="text-green-500 font-semibold">{stats?.activeClients || 0}</span> ativos
          </p>
        </Card>

        {/* Active Sessions */}
        <Card className="p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Sessões Ativas</p>
              <p className="text-3xl font-bold text-foreground">
                {statsQuery.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.totalActiveSessions || 0}
              </p>
            </div>
            <Activity className="w-10 h-10 text-green-500/20" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Usuários conectados agora
          </p>
        </Card>

        {/* Total Credits */}
        <Card className="p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Créditos Totais</p>
              <p className="text-3xl font-bold text-foreground">
                {statsQuery.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.totalCredits || 0}
              </p>
            </div>
            <CreditCard className="w-10 h-10 text-amber-500/20" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Distribuídos entre clientes
          </p>
        </Card>

        {/* Security Events */}
        <Card className="p-6 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Alertas de Segurança</p>
              <p className="text-3xl font-bold text-foreground">
                {statsQuery.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : securityEvents.length}
              </p>
            </div>
            <ShieldAlert className="w-10 h-10 text-red-500/20" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Não resolvidos
          </p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Chart */}
        <Card className="col-span-1 lg:col-span-2 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Atividade da Semana
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#fff" }}
              />
              <Legend />
              <Bar dataKey="logins" fill="#ef4444" name="Logins" />
              <Bar dataKey="downloads" fill="#10b981" name="Downloads" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Credits Distribution */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Distribuição de Créditos
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={creditsData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {creditsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#fff" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2 text-sm">
            {creditsData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audit Logs */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Atividades Recentes</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {auditLogs.length > 0 ? (
              auditLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mt-0.5">
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {log.adminUsername} - {log.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.targetName && `${log.targetName} • `}
                      {new Date(log.createdAt).toLocaleDateString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
            )}
          </div>
        </Card>

        {/* Security Events */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Alertas de Segurança</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {securityEvents.length > 0 ? (
              securityEvents.map((event: any) => (
                <div key={event.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {event.eventType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.username && `${event.username} • `}
                      {event.ipAddress}
                    </p>
                    <Badge 
                      variant="outline" 
                      className={`mt-1 text-[10px] ${
                        event.severity === "critical" ? "bg-red-500/10 text-red-500 border-red-500/30" :
                        event.severity === "high" ? "bg-orange-500/10 text-orange-500 border-orange-500/30" :
                        event.severity === "medium" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" :
                        "bg-blue-500/10 text-blue-500 border-blue-500/30"
                      }`}
                    >
                      {event.severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta de segurança</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
