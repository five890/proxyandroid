import { Button } from "@/components/ui/button";
import { Shield, Lock, Clock, ExternalLink } from "lucide-react";

export default function Expired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <div className="w-full max-w-md">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full" />
          
          <div className="relative bg-gray-900/80 border border-red-900/20 rounded-lg p-8 text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center">
              <Lock className="w-10 h-10 text-red-500" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">
              Acesso Expirado
            </h1>

            {/* Message */}
            <p className="text-gray-400 mb-6 leading-relaxed">
              Seu login expirou. O período de acesso configurado pelo administrador acabou.
              Para continuar acessando os arquivos, você precisa <span className="text-white font-medium">comprar um novo acesso</span>.
            </p>

            {/* Details box */}
            <div className="p-4 rounded-lg bg-gray-800/80 border border-gray-700 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-white">O que aconteceu?</span>
              </div>
              <p className="text-xs text-gray-400 text-left">
                Cada acesso possui um prazo de validade definido no momento da criação. Quando esse prazo termina, 
                o login é automaticamente bloqueado para sua segurança.
              </p>
            </div>

            {/* How to renew */}
            <div className="p-4 rounded-lg bg-red-900/10 border border-red-600/20 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-white">Como renovar</span>
              </div>
              <p className="text-xs text-gray-400 text-left">
                Entre em contato com o administrador para adquirir um novo acesso ou renovar o período de validade.
                Você receberá novas credenciais de login após a confirmação do pagamento.
              </p>
            </div>

            {/* Action button */}
            <Button
              onClick={() => window.location.href = "/login"}
              variant="outline"
              className="w-full gap-2 border-red-600/30 hover:bg-red-600/10 text-red-400"
            >
              <ExternalLink className="w-4 h-4" />
              Voltar para o Login
            </Button>

            {/* Footer note */}
            <p className="text-xs text-gray-600 mt-6">
              Shelby Community — Plataforma de acesso premium
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
