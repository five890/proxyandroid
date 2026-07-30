import { Button } from "@/components/ui/button";
import { Shield, Lock, Download, Monitor, CreditCard } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gold/3 rounded-full blur-3xl translate-y-1/3" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center glow-primary">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold gradient-text">Portal de Acesso</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/login")}
            className="text-muted-foreground hover:text-foreground"
          >
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-6">
            <Lock className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary">Acesso Exclusivo e Seguro</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Distribuição segura de
            <span className="gradient-text"> arquivos</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Plataforma exclusiva para distribuição de arquivos de instalação com controle total de acessos e proteção por dispositivo.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => setLocation("/login")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 glow-primary"
            >
              Acessar Portal
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="glass rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Bloqueio por Dispositivo</h3>
            <p className="text-sm text-muted-foreground">
              Cada login funciona exclusivamente em um único dispositivo, impedindo compartilhamento.
            </p>
          </div>

          <div className="glass rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
              <Download className="w-6 h-6 text-gold" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Downloads Exclusivos</h3>
            <p className="text-sm text-muted-foreground">
              Acesse e baixe arquivos de instalação disponibilizados exclusivamente para você.
            </p>
          </div>

          <div className="glass rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Sistema de Créditos</h3>
            <p className="text-sm text-muted-foreground">
              Controle total de créditos pelo administrador, com histórico completo de movimentações.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Portal de Acesso &mdash; Sistema seguro de distribuição de arquivos
          </p>
        </div>
      </footer>
    </div>
  );
}
