import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { SnipOverlay } from "./components/SnipOverlay";
import { SettingsPanel } from "./components/SettingsPanel";
import { ChatPanel } from "./components/ChatPanel";
import { VaultPanel } from "./components/VaultPanel";
import { Toaster, toast } from "react-hot-toast";

export default function App() {
  const [isSnipping, setIsSnipping] = useState(false);
  const [view, setView] = useState<"chat" | "settings" | "vault">("chat");
  const [sessionKey, setSessionKey] = useState(0);
  const [pendingSnip, setPendingSnip] = useState<{
    type: "ocr" | "vision";
    data: string;
  } | null>(null);
  const [appConfig, setAppConfig] = useState<any>(null);
  const configRef = useRef<any>(null);

  useEffect(() => {
    async function initApp() {
      try {
        const config: any = await invoke("get_config");
        configRef.current = config;
        setAppConfig(config);
        if (config?.appearance?.theme) {
          document.documentElement.setAttribute("data-theme", config.appearance.theme);
          document.documentElement.className = config.appearance.theme;
        }
        if (config.appearance?.opacity !== undefined) {
          document.documentElement.style.setProperty("--app-opacity", config.appearance.opacity.toString());
          try { await invoke("set_opacity", { opacity: config.appearance.opacity }); } catch (_) {}
        }
        const tasks: Promise<unknown>[] = [];
        if (config.stealth_on_launch) tasks.push(invoke("set_stealth", { enabled: true }));
        if (config.ghost_mode) tasks.push(invoke("set_click_through", { enabled: true }));
        await Promise.all(tasks);
      } catch (err) {
        console.error("Failed to initialize app config", err);
      }
    }
    initApp();
  }, []);

  useEffect(() => {
    const unlisten = listen<string>("hotkey", async (event) => {
      const config = configRef.current;
      if (!config) return;
      const key = event.payload;

      if (key === config.hotkeys.snip_region) {
        setIsSnipping(true);
      } else if (key === config.hotkeys.focus_chat) {
        setView("chat");
      } else if (key === config.hotkeys.new_session) {
        setView("chat");
        setSessionKey((k) => k + 1);
      } else if (key === config.hotkeys.capture_full) {
        try {
          const base64 = await invoke("capture_full");
          setPendingSnip({ type: "vision", data: base64 as string });
          setView("chat");
        } catch (e) {
          console.error("Full capture failed", e);
        }
      } else if (key === config.hotkeys.toggle_click_through) {
        const newGhostMode = !config.ghost_mode;
        try {
          const updatedConfig = { ...config, ghost_mode: newGhostMode };
          await Promise.all([
            invoke("set_click_through", { enabled: newGhostMode }),
            invoke("save_config", { config: updatedConfig }),
          ]);
          configRef.current = updatedConfig;
          setAppConfig(updatedConfig);
          toast(newGhostMode ? "Ghost mode enabled" : "Ghost mode disabled", {
            icon: newGhostMode ? "👻" : "👁",
            style: {
              background: "#0e0e10",
              color: "#fafafa",
              border: "1px solid rgba(255,255,255,0.07)",
              fontSize: "12px",
            },
          });
        } catch (e) {
          console.error("Failed toggling click-through", e);
        }
      }
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  const fontFamily = useMemo(() => {
    const f = appConfig?.appearance?.font_family;
    if (!f || f === "sans-serif" || f === "segoe-ui") return "inherit";
    return f;
  }, [appConfig]);

  const handleConfigChanged = useCallback(async () => {
    const config: any = await invoke("get_config");
    configRef.current = config;
    setAppConfig(config);
    if (config?.appearance?.theme) {
      document.documentElement.setAttribute("data-theme", config.appearance.theme);
      document.documentElement.className = config.appearance.theme;
    }
  }, []);

  return (
    <div
      className="app-root"
      style={{ fontFamily }}
    >
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#0e0e10",
            color: "#fafafa",
            border: "1px solid rgba(255,255,255,0.07)",
            fontSize: "12px",
            padding: "9px 14px",
            borderRadius: "8px",
          },
        }}
      />

      {/* ── Titlebar ── */}
      <div className="titlebar" data-tauri-drag-region>
        {/* Brand */}
        <div className="titlebar-brand">
          <div className="brand-glyph">
            <svg viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2L5.5 2L5.5 9L9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="brand-name">Lucid</span>
        </div>

        {/* Tab nav */}
        <nav className="titlebar-nav">
          <button
            className={`nav-tab ${view === "chat" ? "active" : ""}`}
            onClick={() => setView("chat")}
          >
            Chat
          </button>
          <button
            className={`nav-tab ${view === "vault" ? "active" : ""}`}
            onClick={() => setView("vault")}
          >
            Vault
          </button>
          <button
            className={`nav-tab ${view === "settings" ? "active" : ""}`}
            onClick={() => setView("settings")}
          >
            Settings
          </button>
        </nav>

        {/* Window controls */}
        <div className="titlebar-controls">
          <button
            className="wc-btn"
            onClick={() => setSessionKey(k => k + 1)}
            title="New Chat"
            style={{ fontWeight: 600, fontSize: "14px" }}
          >
            +
          </button>
          <button
            className="wc-btn"
            onClick={() => invoke("minimize_window")}
            title="Minimize"
          >
            <svg viewBox="0 0 10 10" fill="none">
              <path d="M2 5H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            className="wc-btn wc-close"
            onClick={() => invoke("close_window")}
            title="Close"
          >
            <svg viewBox="0 0 10 10" fill="none">
              <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="app-content">
        {isSnipping && (
          <SnipOverlay
            onCapture={(res) => {
              setIsSnipping(false);
              setPendingSnip(res);
              setView("chat");
            }}
            onCancel={() => setIsSnipping(false)}
          />
        )}
        <div style={{ display: view === "chat" ? "flex" : "none", flex: 1, overflow: "hidden", flexDirection: "column", width: "100%" }}>
          <ChatPanel
            sessionKey={sessionKey}
            pendingSnip={pendingSnip}
            onSnipConsumed={() => setPendingSnip(null)}
          />
        </div>
        
        <div style={{ display: view === "vault" ? "flex" : "none", flex: 1, overflow: "hidden", flexDirection: "column", width: "100%" }}>
          <VaultPanel />
        </div>

        <div style={{ display: view === "settings" ? "flex" : "none", flex: 1, overflow: "hidden", flexDirection: "column", width: "100%" }}>
          <SettingsPanel onConfigChanged={handleConfigChanged} />
        </div>
      </div>
    </div>
  );
}
