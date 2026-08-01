import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Smartphone,
  Monitor,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface AccessHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialId: number;
  username: string;
}

export function AccessHistoryModal({
  open,
  onOpenChange,
  credentialId,
  username,
}: AccessHistoryModalProps) {
  const [activeTab, setActiveTab] = useState("all");

  const accessLogsQuery = trpc.admin.getClientAccessLogs.useQuery(
    { credentialId },
    { enabled: open && !!credentialId }
  );

  const logs = accessLogsQuery.data || [];
  const successLogs = logs.filter((log: any) => log.loginStatus === "success");
  const failedLogs = logs.filter((log: any) => log.loginStatus === "failed");

  const getDeviceIcon = (deviceType: string) => {
    return deviceType === "mobile" ? (
      <Smartphone className="w-4 h-4 text-blue-400" />
    ) : (
      <Monitor className="w-4 h-4 text-purple-400" />
    );
  };

  const getDeviceLabel = (deviceType: string) => {
    return deviceType === "mobile" ? "📱 Celular" : "💻 PC";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderLogCard = (log: any) => (
    <Card key={log.id} className="p-4 bg-gray-800/50 border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {log.loginStatus === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <Badge
            className={
              log.loginStatus === "success"
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-red-500/20 text-red-400 border-red-500/30"
            }
          >
            {log.loginStatus === "success" ? "Sucesso" : "Falha"}
          </Badge>
        </div>
        <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          {getDeviceIcon(log.deviceType)}
          <span className="text-gray-300">{getDeviceLabel(log.deviceType)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-amber-400" />
          <span className="text-gray-300 font-mono text-xs">{log.ipAddress}</span>
        </div>

        {log.failureReason && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300">
            {log.failureReason}
          </div>
        )}

        {log.userAgent && (
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
              User Agent
            </summary>
            <div className="mt-1 p-2 bg-gray-900/50 rounded text-xs text-gray-400 break-all">
              {log.userAgent}
            </div>
          </details>
        )}
      </div>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Histórico de Acessos</DialogTitle>
          <DialogDescription className="text-gray-400">
            {username} — {logs.length} acessos registrados
          </DialogDescription>
        </DialogHeader>

        {accessLogsQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="p-8 bg-gray-800/50 border-gray-700 text-center">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum acesso registrado</p>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="all">
                Todos ({logs.length})
              </TabsTrigger>
              <TabsTrigger value="success" className="text-green-400">
                Sucesso ({successLogs.length})
              </TabsTrigger>
              <TabsTrigger value="failed" className="text-red-400">
                Falhas ({failedLogs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {logs.map(renderLogCard)}
            </TabsContent>

            <TabsContent value="success" className="space-y-3 mt-4">
              {successLogs.length > 0 ? (
                successLogs.map(renderLogCard)
              ) : (
                <Card className="p-8 bg-gray-800/50 border-gray-700 text-center">
                  <p className="text-gray-400">Nenhum acesso bem-sucedido</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="failed" className="space-y-3 mt-4">
              {failedLogs.length > 0 ? (
                failedLogs.map(renderLogCard)
              ) : (
                <Card className="p-8 bg-gray-800/50 border-gray-700 text-center">
                  <p className="text-gray-400">Nenhuma falha de acesso</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
