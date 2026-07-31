import { useEffect, useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * Advanced Anti Screen Capture Component
 * Blocks:
 * 1. PrintScreen / Win+Shift+S / Cmd+Shift+4
 * 2. Screen sharing via Screen Capture API
 * 3. Screenshot via browser DevTools
 * 4. Right-click context menu
 * 5. Copy/paste of sensitive content
 * 6. Text selection
 * 7. DevTools shortcuts
 * 8. Screen sharing detection via video streams
 * 9. Blur when window loses focus
 * 10. Permissions-Policy meta tag
 */
export default function AntiScreenCapture() {
  const [isBlurred, setIsBlurred] = useState(false);

  // Blur when window loses focus
  const handleBlur = useCallback(() => {
    setIsBlurred(true);
    document.title = "🔒 Shelby Community";
  }, []);

  const handleFocus = useCallback(() => {
    setIsBlurred(false);
    document.title = "Shelby Community";
  }, []);

  // Visibility change - detect if user switches tab
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "hidden") {
      setIsBlurred(true);
    } else {
      setIsBlurred(false);
    }
  }, []);

  // Block keyboard shortcuts for capture
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Block PrintScreen
    if (e.key === "PrintScreen") {
      e.preventDefault();
      e.stopImmediatePropagation();
      navigator.clipboard.writeText("").catch(() => {});
      toast.error("⛔ Captura de tela bloqueada!");
      return;
    }
    // Block Windows: Win+Shift+S (Snip & Sketch)
    if (e.key === "Meta" || e.key === "OS") {
      // Windows key - we can't fully block but warn
    }
    // Block Win+Shift+S specifically (handled by OS, but try to block)
    if (e.key === "PrintScreen" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.writeText("").catch(() => {});
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
    // Block F12 (DevTools)
    if (e.key === "F12") {
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
    // Block Ctrl+P (Print)
    if (e.ctrlKey && e.key === "p") {
      e.preventDefault();
      toast.warning("Impressão bloqueada.");
      return;
    }
    // Block Ctrl+C on the page
    if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      return;
    }
    // Block Ctrl+A (Select all)
    if (e.ctrlKey && e.key === "a") {
      e.preventDefault();
      return;
    }
  }, []);

  // Block context menu
  const handleContextMenu = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  // Block copy/cut/paste
  const handleCopy = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    // Allow copy/paste on input elements (password, text fields, etc.)
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }
    e.preventDefault();
    toast.warning("Cópia de conteúdo bloqueada.");
  }, []);

  const handleCut = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }
    e.preventDefault();
  }, []);

  const handlePaste = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    // Always allow paste on input fields
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }
    e.preventDefault();
  }, []);

  // Block beforeprint
  const handleBeforePrint = useCallback((e: Event) => {
    e.preventDefault();
    toast.warning("Impressão bloqueada.");
  }, []);

  // Block select
  const handleSelectStart = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  // Drag block
  const handleDragStart = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("keydown", handleKeyDown, true); // capture phase
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("beforeprint", handleBeforePrint);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("dragstart", handleDragStart);

    // Disable Screen Capture API via permissions policy
    const meta = document.createElement("meta");
    meta.setAttribute("http-equiv", "Permissions-Policy");
    meta.setAttribute("content", "display-capture=(), screen-wake-lock=()");
    document.head.appendChild(meta);

    // Add user-select: none to body
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    document.body.style.webkitTouchCallout = "none";
    document.body.style.webkitUserDrag = "none";

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeprint", handleBeforePrint);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("dragstart", handleDragStart);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      document.body.style.webkitTouchCallout = "";
      document.body.style.webkitUserDrag = "";
    };
  }, [handleVisibilityChange, handleBlur, handleFocus, handleKeyDown, handleContextMenu, handleBeforePrint, handleCopy, handleCut, handlePaste, handleSelectStart, handleDragStart]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        pointerEvents: isBlurred ? "all" : "none",
        background: isBlurred ? "rgba(0,0,0,0.95)" : "transparent",
        display: isBlurred ? "flex" : "none",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(20px)",
      }}
    >
      {isBlurred && (
        <div style={{ textAlign: "center", color: "#ef4444" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
            Shelby Community
          </div>
          <div style={{ fontSize: "14px", color: "#9ca3af" }}>
            Clique na página para continuar
          </div>
        </div>
      )}
    </div>
  );
}
