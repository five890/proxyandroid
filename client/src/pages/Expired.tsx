import { Button } from "@/components/ui/button";
import { Shield, Lock, Clock, ExternalLink } from "lucide-react";

export default function Expired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full" />
          
          <div className="relative card p-8 text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Lock className="w-10 h-10 text-red-500" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Acesso Expirado
            </h1>

            {/* Message */}
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Seu login expirou. O período de acesso configurado pelo administrador acabou.
              Para continuar acessando os arquivos, você precisa <span className="text-foreground font-medium">comprar um novo acesso</span>.
            </p>

            {/* Details box */}
            <div className="p-4 rounded-xl bg-secondary/50 border border-border mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-foreground">O que aconteceu?</span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                Cada acesso possui um prazo de validade definido no momento da criação. Quando esse prazo termina, 
                o login é automaticamente bloqueado para sua segurança. O compartilhamento de tela e gravação também permanecem bloqueados.
              </p>
            </div>

            {/* How to renew */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Como renovar</span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                Entre em contato com o administrador para adquirir um novo acesso ou renovar o período de validade.
                Você receberá novas credenciais de login após a confirmação do pagamento.
              </p>
            </div>

            {/* Action button */}
            <Button
              onClick={() => window.location.href = "/login"}
              variant="outline"
              className="w-full gap-2 border-primary/30 hover:bg-primary/10"
            >
              <ExternalLink className="w-4 h-4" />
              Voltar para o Login
            </Button>

            {/* Footer note */}
            <p className="text-xs text-muted-foreground mt-6">
              Portal de Acesso — Sistema seguro de distribuição de arquivos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
