import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { SnipOverlay } from "./components/SnipOverlay";
import { SettingsPanel } from "./components/SettingsPanel";
import { ChatPanel } from "./components/ChatPanel";
import { Settings, MessageSquare, Minus, X } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

export default function App() {
  const [isSnipping, setIsSnipping] = useState(false);
  const [view, setView] = useState<"chat" | "settings">("chat");
  const [sessionKey, setSessionKey] = useState(0);
  const [pendingSnip, setPendingSnip] = useState<{
    type: "ocr" | "vision";
    data: string;
  } | null>(null);
  const [appConfig, setAppConfig] = useState<any>(null);

  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Phase 12: App Initialization & Startup Hooks
  useEffect(() => {
    async function initApp() {
      try {
        const config: any = await invoke("get_config");
        setAppConfig(config);
        if (config?.appearance?.theme) {
          document.documentElement.setAttribute(
            "data-theme",
            config.appearance.theme,
          );
          document.documentElement.className = config.appearance.theme;
        }

        // Apply Appearance Opacity (Startup Only)
        if (config.appearance && config.appearance.opacity !== undefined) {
          document.documentElement.style.setProperty(
            "--app-opacity",
            config.appearance.opacity.toString(),
          );
          try {
            await invoke("set_opacity", { opacity: config.appearance.opacity });
          } catch (e) {}
        }

        // Apply startup Ghost Mode settings
        if (config.stealth_on_launch) {
          await invoke("set_stealth", { enabled: true });
        }
        if (config.ghost_mode) {
          await invoke("set_click_through", { enabled: true });
        }
      } catch (err) {
        console.error("Failed to initialize app config", err);
      }
    }
    initApp();
  }, []);

  useEffect(() => {
    // Listen to global hotkeys configured via backend and forwarded via "hotkey" event
    const unlisten = listen<string>("hotkey", async (event) => {
      try {
        const config: any = await invoke("get_config");
        const key = event.payload;

        if (key === config.hotkeys.snip_region) {
          // Starting snip: only make internal background transparent (CSS only)
          // NEVER use set_opacity(0.0) on the whole window, it loses focus!
          setIsSnipping(true);
        } else if (key === config.hotkeys.focus_chat) {
          setView("chat");
          const win = getCurrentWindow();
          await win.setFocus();
        } else if (key === config.hotkeys.new_session) {
          setView("chat");
          setSessionKey((k) => k + 1);
        } else if (key === config.hotkeys.capture_full) {
          try {
            // Full Capture requires a quick app hide
            const win = getCurrentWindow();
            await win.setOpacity(0.0);
            await new Promise(r => setTimeout(r, 150));
            
            const base64 = await invoke("capture_full", { displayIdx: 0 });
            setPendingSnip({ type: "vision", data: base64 as string });
            setView("chat");

            // Restore from config
            const appConfig: any = await invoke("get_config");
            const targetOpacity = appConfig?.appearance?.opacity ?? 1.0;
            await win.setOpacity(targetOpacity);
          } catch (e) {
            console.error("Full capture failed", e);
          }
        } else if (key === config.hotkeys.toggle_click_through) {
          const newGhostMode = !config.ghost_mode;
          try {
            await invoke("set_click_through", { enabled: newGhostMode });
            const updatedConfig = { ...config, ghost_mode: newGhostMode };
            await invoke("save_config", { config: updatedConfig });
            toast(newGhostMode ? "Ghost Mode: ON" : "Ghost Mode: OFF");
          } catch (e) {
            console.error("Failed toggling click-through", e);
          }
        }
      } catch (err) {
        console.error("Failed handling hotkey", err);
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const currentOpacity = appConfig?.appearance?.opacity ?? 1.0;
  const fontFamilyValue = appConfig?.appearance?.font_family || "sans-serif";

  return (
    <div
      id="app-root"
      className="flex flex-col h-screen w-screen overflow-hidden text-zinc-100 transition-all duration-300"
      style={{
        // When snipping, make the background alpha 0 to see through, but keep window visible
        backgroundColor: isSnipping ? "transparent" : `rgba(9, 9, 11, ${currentOpacity})`,
        fontFamily: fontFamilyValue,
      }}
    >
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#18181b",
            color: "#fff",
            border: "1px solid #27272a",
          },
        }}
      />
      
      {/* Titlebar: Hidden when snipping to show the screen below */}
      <div
        className={`h-8 flex-shrink-0 border-b flex justify-between items-center select-none transition-opacity duration-200 ${isSnipping ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        style={{ borderColor: `rgba(39, 39, 42, ${currentOpacity})` }}
      >
        <div
          data-tauri-drag-region
          className="flex items-center gap-2 px-4 h-full flex-1 cursor-grab"
        >
          <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[10px] font-bold text-white pointer-events-none">
            L
          </div>
          <span className="text-xs font-semibold text-zinc-400 pointer-events-none">
            Lucid
          </span>
        </div>
        <div className="flex h-full" style={{ WebkitAppRegion: "no-drag" } as any}>
          <button
            className="w-11 h-full flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white"
            onClick={async () => await getCurrentWindow().minimize()}
          >
            <Minus size={14} />
          </button>
          <button
            className="w-11 h-full flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white"
            onClick={async () => {
               const win = getCurrentWindow();
               (await win.isMaximized()) ? await win.unmaximize() : await win.maximize();
            }}
          >
            <div className="w-3 h-3 border border-zinc-400 rounded-sm" />
          </button>
          <button
            className="w-11 h-full flex items-center justify-center text-zinc-400 hover:bg-red-600 hover:text-white"
            onClick={async () => await getCurrentWindow().close()}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main UI Body: Becomes invisible when snipping */}
        <div className={`flex flex-1 overflow-hidden transition-opacity duration-200 ${isSnipping ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <div className="w-14 flex flex-col items-center py-4 border-r border-zinc-800 bg-zinc-900 gap-6 shrink-0 z-10">
            <button
               className={`p-2.5 rounded-xl ${view === "chat" ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
               onClick={() => setView("chat")}
            >
              <MessageSquare size={22} />
            </button>
            <button
               className={`p-2.5 rounded-xl ${view === "settings" ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
               onClick={() => setView("settings")}
            >
              <Settings size={22} />
            </button>
            <div className="flex-1" />
            
            {/* Opacity Slider */}
            <div className="flex flex-col items-center gap-3 pb-4">
              <span className="text-[9px] font-bold text-zinc-500 uppercase [writing-mode:vertical-lr] rotate-180 opacity-50">Opacity</span>
              <div className="h-40 w-5 bg-zinc-800/50 rounded-2xl relative flex items-center justify-center group overflow-hidden border border-zinc-700/30">
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.01"
                  value={currentOpacity}
                  onChange={async (e) => {
                    const val = parseFloat(e.target.value);
                    if (!appConfig) return;
                    const newConfig = { ...appConfig, appearance: { ...appConfig.appearance, opacity: val } };
                    setAppConfig(newConfig);
                    try {
                      await invoke("set_opacity", { opacity: val });
                      await invoke("save_config", { config: newConfig });
                    } catch (err) {}
                  }}
                  className="absolute inset-0 cursor-pointer appearance-none bg-transparent -rotate-90 w-40 z-30"
                  style={{ height: '20px', marginTop: '10px' }}
                />
                <div 
                   className="absolute bottom-0 left-0 right-0 bg-blue-500/80 rounded-b-xl"
                   style={{ height: `${currentOpacity * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <div className={`${view === "chat" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"} absolute inset-0 transition-opacity duration-300`}>
              <ChatPanel sessionKey={sessionKey} pendingSnip={pendingSnip} onSnipConsumed={() => setPendingSnip(null)} />
            </div>
            <div className={`${view === "settings" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"} absolute inset-0 transition-opacity duration-300`}>
              <SettingsPanel
                onConfigChanged={async () => {
                   const config: any = await invoke("get_config");
                   setAppConfig(config);
                }}
              />
            </div>
          </div>
        </div>

        {/* Snip Overlay: Stays visible while everything else hides */}
        {isSnipping && (
          <SnipOverlay
            onCapture={async (res) => {
              setIsSnipping(false);
              setPendingSnip(res);
              setView("chat");
              toast.success("Text captured to clipboard!");
            }}
            onCancel={() => setIsSnipping(false)}
          />
        )}
      </div>
    </div>
  );
}
