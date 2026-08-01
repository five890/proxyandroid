import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Menu, 
  Users, 
  FileUp, 
  BarChart3, 
  Shield, 
  LogOut,
  Settings,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface MobileAdminNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  currentAdmin?: { username: string; role: string };
}

export function MobileAdminNav({ 
  activeTab, 
  onTabChange, 
  onLogout,
  currentAdmin 
}: MobileAdminNavProps) {
  const [open, setOpen] = useState(false);

  const menuItems = [
    { id: "clients", label: "Clientes", icon: Users },
    { id: "files", label: "Arquivos", icon: FileUp },
    { id: "analytics", label: "Análise", icon: BarChart3 },
    { id: "admins", label: "Admins", icon: Shield },
    { id: "mini-admins", label: "Mini Admins", icon: ShieldCheck },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            <span className="font-bold text-white text-sm">Admin Panel</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <SheetContent side="left" className="w-64 bg-gray-900 border-gray-800">
              <SheetHeader>
                <SheetTitle className="text-white">Menu</SheetTitle>
              </SheetHeader>
              
              {/* Admin Info */}
              <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700 mb-6">
                <p className="text-xs text-gray-400 mb-1">Conectado como</p>
                <p className="font-semibold text-white text-sm">{currentAdmin?.username}</p>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {currentAdmin?.role === 'admin' ? 'ADMIN' : 'MINI ADMIN'}
                </Badge>
              </div>

              {/* Menu Items */}
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-red-600 text-white"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Logout */}
              <Button
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                variant="destructive"
                className="w-full mt-6 gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </SheetContent>
          </Sheet>
        </div>

        {/* Tab Indicator */}
        <div className="mt-3 flex gap-1 overflow-x-auto pb-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === item.id
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex-col p-4">
        <div className="flex items-center gap-2 mb-8">
          <Shield className="w-6 h-6 text-red-500" />
          <span className="font-bold text-white">Admin Panel</span>
        </div>

        {/* Admin Info */}
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 mb-6">
          <p className="text-xs text-gray-400 mb-1">Conectado como</p>
          <p className="font-semibold text-white">{currentAdmin?.username}</p>
        </div>

        {/* Menu Items */}
        <nav className="space-y-2 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-red-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <Button
          onClick={onLogout}
          variant="destructive"
          className="w-full gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </>
  );
}

import { Badge } from "@/components/ui/badge";
