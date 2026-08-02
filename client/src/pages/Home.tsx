import { Button } from "@/components/ui/button";
import { Shield, Lock, Download, Monitor, CreditCard, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { SITE_CONFIG } from "@/lib/config";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Netflix-style background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-red-950/30 to-transparent" />
      <div className="absolute top-1/4 left-1/3 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-red-700/5 rounded-full blur-[120px]" />

      {/* Header */}
      <header className="relative z-10 border-b border-red-900/20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-lg font-bold text-red-500 tracking-wide uppercase">{SITE_CONFIG.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/login")}
            className="text-gray-400 hover:text-white border border-red-600/30 hover:border-red-500"
          >
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section - Netflix style */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600/10 border border-red-600/20 mb-6">
            <Lock className="w-3 h-3 text-red-500" />
            <span className="text-xs font-semibold text-red-400 tracking-wide uppercase">Acesso Exclusivo</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
            {SITE_CONFIG.name.split(' ')[0]}
            <span className="text-red-500"> {SITE_CONFIG.name.split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-lg text-gray-400 mb-10">
            {SITE_CONFIG.description}
          </p>
          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={() => setLocation("/login")}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-10 py-6 text-lg tracking-wide"
            >
              Acessar Portal
            </Button>
            <a 
              href="https://discord.gg/shelbys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-red-500 hover:text-red-400 font-medium transition-colors"
            >
              Entrar no Discord oficial dos criadores do site
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-gray-900/80 rounded-lg p-6 text-center border border-red-900/20 hover:border-red-600/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-red-600/10 flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-white mb-2">Bloqueio por Dispositivo</h3>
            <p className="text-sm text-gray-500">
              Cada login funciona exclusivamente em um único dispositivo.
            </p>
          </div>

          <div className="bg-gray-900/80 rounded-lg p-6 text-center border border-red-900/20 hover:border-red-600/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-red-600/10 flex items-center justify-center mx-auto mb-4">
              <Download className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-white mb-2">Downloads Exclusivos</h3>
            <p className="text-sm text-gray-500">
              Arquivos de instalação disponibilizados exclusivamente para você.
            </p>
          </div>

          <div className="bg-gray-900/80 rounded-lg p-6 text-center border border-red-900/20 hover:border-red-600/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-red-600/10 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-white mb-2">Sistema de Créditos</h3>
            <p className="text-sm text-gray-500">
              Controle total de créditos com histórico completo.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-red-900/20 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center">
          <p className="text-xs text-gray-600">
            {SITE_CONFIG.footerText}
          </p>
        </div>
      </footer>

      {/* Floating Discord Button */}
      <a
        href="https://discord.gg/shelbys"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 group"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 font-medium">
          Discord Oficial
        </span>
      </a>
    </div>
  );
}
