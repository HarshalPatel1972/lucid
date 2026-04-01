import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { SnipOverlay } from "./components/SnipOverlay";
import { SettingsPanel } from "./components/SettingsPanel";
import { ChatPanel } from "./components/ChatPanel";
import { Settings, MessageSquare, Minus, X } from "lucide-react";
import { Toaster, toast } from 'react-hot-toast';

export default function App() {
  const [isSnipping, setIsSnipping] = useState(false);
  const [view, setView] = useState<'chat' | 'settings'>('chat');
  const [sessionKey, setSessionKey] = useState(0);
  const [pendingSnip, setPendingSnip] = useState<{type: 'ocr'|'vision', data: string} | null>(null);

  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  // Phase 12: App Initialization & Startup Hooks
  useEffect(() => {
    async function initApp() {
      try {
        const config: any = await invoke('get_config');
        
        // Apply Appearance Opacity
        if (config.appearance && config.appearance.opacity !== undefined) {
          document.documentElement.style.setProperty('--app-opacity', config.appearance.opacity.toString());
          try {
            await invoke('set_opacity', { opacity: config.appearance.opacity });
          } catch(e) {}
        }
        
        // Apply startup Ghost Mode settings
        if (config.stealth_on_launch) {
          await invoke('set_stealth', { enabled: true });
        }
        if (config.ghost_mode) {
          await invoke('set_click_through', { enabled: true });
        }
      } catch (err) {
        console.error("Failed to initialize app config", err);
      }
    }
    initApp();
  }, []);

  useEffect(() => {
    // Listen to global hotkeys configured via backend and forwarded via "hotkey" event
    const unlisten = listen<string>('hotkey', async (event) => {
      try {
        const config: any = await invoke('get_config');
        const key = event.payload;
        
        if (key === config.hotkeys.snip_region) {
          setIsSnipping(true);
        } else if (key === config.hotkeys.focus_chat) {
          setView('chat');
        } else if (key === config.hotkeys.new_session) {
          setView('chat');
          setSessionKey(k => k + 1);
        } else if (key === config.hotkeys.capture_full) {
          // Future phase: Capture Full -> Read screen -> send to chat
          console.log("Full capture requested");
        } else if (key === config.hotkeys.toggle_click_through) {
          const newGhostMode = !config.ghost_mode;
          try {
            await invoke('set_click_through', { enabled: newGhostMode });       
            // Save config to persist
            const updatedConfig = { ...config, ghost_mode: newGhostMode };      
            await invoke('save_config', { config: updatedConfig });
            toast(newGhostMode ? 'Ghost Mode: ON (Click-through enabled)' : 'Ghost Mode: OFF (Click-through disabled)', {
              icon: '👻',
              style: { background: '#18181b', color: '#fff', border: '1px solid #27272a' }
            });
          } catch (e) {
            console.error("Failed toggling click-through", e);
          }
        }
      } catch (err) {
        console.error("Failed handling hotkey", err);
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100 rounded-lg">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#18181b', color: '#fff', border: '1px solid #27272a' } }} />
      {/* Titlebar */}
      <div 
        data-tauri-drag-region
        className="h-8 flex-shrink-0 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center px-2 select-none"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex items-center gap-2 pointer-events-none px-2">
          <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[10px] font-bold text-white">L</div>
          <span className="text-xs font-semibold text-zinc-400">Lucid</span>
        </div>
        <div className="flex" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button 
            className="w-10 h-6 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white rounded"
            onClick={() => getCurrentWindow().minimize()}
          >
            <Minus size={14} />
          </button>
          <button 
            className="w-10 h-6 flex items-center justify-center text-zinc-400 hover:bg-red-600 hover:text-white rounded"
            onClick={() => getCurrentWindow().hide()}
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
        <div className="w-14 flex flex-col items-center py-4 border-r border-zinc-800 bg-zinc-900 gap-4 shrink-0 z-10">
          <button 
            className={`p-2.5 rounded-xl transition-colors relative z-20 ${view === 'chat' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
            onClick={() => setView('chat')}
            title="Chat (Session)"
          >
            <MessageSquare size={22} />
          </button>
          <button 
            className={`p-2.5 rounded-xl transition-colors relative z-20 ${view === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
            onClick={() => setView('settings')}
            title="Settings"
          >
            <Settings size={22} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative">
          {view === 'chat' && <ChatPanel sessionKey={sessionKey} pendingSnip={pendingSnip} onSnipConsumed={() => setPendingSnip(null)} />}
          {view === 'settings' && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}
