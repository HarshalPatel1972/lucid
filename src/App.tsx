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

        // Apply Appearance Opacity
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
          setIsSnipping(true);
        } else if (key === config.hotkeys.focus_chat) {
          setView("chat");
        } else if (key === config.hotkeys.new_session) {
          setView("chat");
          setSessionKey((k) => k + 1);
        } else if (key === config.hotkeys.capture_full) {
          try {
            const base64 = await invoke("capture_full", { displayIdx: 0 });
            setPendingSnip({ type: "vision", data: base64 as string });
            setView("chat");
          } catch (e) {
            console.error("Full capture failed", e);
          }
        } else if (key === config.hotkeys.toggle_click_through) {
          const newGhostMode = !config.ghost_mode;
          try {
            await invoke("set_click_through", { enabled: newGhostMode });
            // Save config to persist
            const updatedConfig = { ...config, ghost_mode: newGhostMode };
            await invoke("save_config", { config: updatedConfig });
            toast(
              newGhostMode
                ? "Ghost Mode: ON (Click-through enabled)"
                : "Ghost Mode: OFF (Click-through disabled)",
              {
                icon: "👻",
                style: {
                  background: "#18181b",
                  color: "#fff",
                  border: "1px solid #27272a",
                },
              },
            );
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

  const opacityValue = appConfig?.appearance?.opacity ?? 1.0;
  const fontFamilyValue = appConfig?.appearance?.font_family || "sans-serif";

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 rounded-lg transition-all duration-300"
      style={{
        backgroundColor: `rgba(9, 9, 11, ${opacityValue})`,
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
      {/* Titlebar */}
      <div
        className="h-8 flex-shrink-0 border-b flex justify-between items-center select-none"
        style={{ borderColor: `rgba(39, 39, 42, ${opacityValue})` }}
      >
        <div
          data-tauri-drag-region
          className="flex items-center gap-2 px-4 h-full flex-1 cursor-grab"
          style={{ WebkitAppRegion: "drag" } as any}
        >
          <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[10px] font-bold text-white pointer-events-none">
            L
          </div>
          <span className="text-xs font-semibold text-zinc-400 pointer-events-none">
            Lucid
          </span>
        </div>
        <div
          className="flex px-2 z-50 pointer-events-auto relative"
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <button
            className="w-10 h-6 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white rounded cursor-pointer"
            onClick={() => getCurrentWindow().minimize()}
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button
            className="w-10 h-6 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white rounded cursor-pointer"
            onClick={() => getCurrentWindow().toggleMaximize()}
            title="Maximize"
          >
            <div className="w-3 h-3 border border-zinc-400 rounded-sm" />
          </button>
          <button
            className="w-10 h-6 flex items-center justify-center text-zinc-400 hover:bg-red-600 hover:text-white rounded cursor-pointer transition-colors"
            onClick={() => getCurrentWindow().close()}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Global Overlays */}
        {isSnipping && (
          <SnipOverlay
            onCapture={(res) => {
              console.log("Captured:", res.type);
              setIsSnipping(false);
              setPendingSnip(res);
              setView("chat");
            }}
            onCancel={() => setIsSnipping(false)}
          />
        )}

        {/* Main Navigation Sidebar */}
        <div className="w-14 flex flex-col items-center py-4 border-r border-zinc-800 bg-zinc-900 gap-6 shrink-0 z-10">
          <button
            className={`p-2.5 rounded-xl transition-all duration-200 relative z-20 ${view === "chat" ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
            onClick={() => setView("chat")}
            title="Chat (Session)"
          >
            <MessageSquare size={22} />
          </button>
          <button
            className={`p-2.5 rounded-xl transition-all duration-200 relative z-20 ${view === "settings" ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
            onClick={() => setView("settings")}
            title="Settings"
          >
            <Settings size={22} />
          </button>

          <div className="flex-1" />

          {/* Vertical Opacity Slider */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest rotate-180 [writing-mode:vertical-lr]">Opacity</span>
            <div className="h-32 w-1.5 bg-zinc-800 rounded-full relative group cursor-pointer overflow-hidden">
               <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.01"
                value={opacityValue}
                onChange={async (e) => {
                  const val = parseFloat(e.target.value);
                  const newConfig = { ...appConfig, appearance: { ...appConfig.appearance, opacity: val } };
                  setAppConfig(newConfig);
                  
                  // Live Updates
                  document.documentElement.style.setProperty("--app-opacity", val.toString());
                  try {
                    await invoke("set_opacity", { opacity: val });
                    // Explicitly save to persist immediately as requested in task 3
                    await invoke("save_config", { config: newConfig });
                  } catch (err) {}
                }}
                className="absolute inset-0 w-32 h-1.5 -rotate-90 origin-left translate-y-32 opacity-0 cursor-pointer z-30"
                style={{ width: '128px', left: '50%', transform: 'translateX(-50%) rotate(-90deg)', transformOrigin: 'center' }}
              />
              <div 
                className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-75 pointer-events-none"
                style={{ height: `${opacityValue * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content Area - Fixed for persistence Task 1 */}
        <div className="flex-1 relative overflow-hidden">
          <div className={`absolute inset-0 transition-opacity duration-300 ${view === "chat" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}>
            <ChatPanel
              sessionKey={sessionKey}
              pendingSnip={pendingSnip}
              onSnipConsumed={() => setPendingSnip(null)}
            />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-300 ${view === "settings" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}>
            <SettingsPanel
              onConfigChanged={async () => {
                const config: any = await invoke("get_config");
                setAppConfig(config);
                if (config?.appearance?.theme) {
                  document.documentElement.setAttribute("data-theme", config.appearance.theme);
                  document.documentElement.className = config.appearance.theme;
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
