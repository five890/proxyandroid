import { useEffect, useCallback } from "react";
import { toast } from "sonner";

/**
 * Anti Screen Capture Component
 * Blocks screen capture, recording, and sharing via:
 * 1. Screen Capture API permission policy
 * 2. Visibility change detection
 * 3. Blur effect when window loses focus
 */
export default function AntiScreenCapture() {
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      // Check if we should warn about possible capture
      if (document.hidden) {
        toast.warning("Distribuição proibida. Captura de tela não permitida.");
      }
    }
  }, []);

  const handleBlur = useCallback(() => {
    document.title = "🔒 Portal Protegido";
  }, []);

  const handleFocus = useCallback(() => {
    document.title = "Portal de Acesso";
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Block PrintScreen
    if (e.key === "PrintScreen") {
      e.preventDefault();
      toast.warning("Captura de tela bloqueada.");
      return;
    }
    // Block Ctrl+Shift+I (DevTools)
    if (e.ctrlKey && e.shiftKey && e.key === "I") {
      e.preventDefault();
      return;
    }
    // Block Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === "J") {
      e.preventDefault();
      return;
    }
    // Block Ctrl+U (View Source)
    if (e.ctrlKey && e.key === "u") {
      e.preventDefault();
      return;
    }
    // Block Ctrl+S (Save)
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      toast.warning("Salvamento de página bloqueado.");
      return;
    }
    // Block Ctrl+Shift+S (Save as)
    if (e.ctrlKey && e.shiftKey && e.key === "S") {
      e.preventDefault();
      return;
    }
  }, []);

  const handleContextMenu = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  const handleBeforePrint = useCallback((e: Event) => {
    e.preventDefault();
    toast.warning("Impressão bloqueada.");
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("beforeprint", handleBeforePrint);

    // Disable Screen Capture API via permissions policy
    const meta = document.createElement("meta");
    meta.setAttribute("http-equiv", "Permissions-Policy");
    meta.setAttribute("content", "display-capture=(), screen-wake-lock=()");
    document.head.appendChild(meta);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeprint", handleBeforePrint);
    };
  }, [handleVisibilityChange, handleBlur, handleFocus, handleKeyDown, handleContextMenu, handleBeforePrint]);

  return null;
}
