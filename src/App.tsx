import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { SnipOverlay } from "./components/SnipOverlay";
import { SettingsPanel } from "./components/SettingsPanel";
import { ChatPanel } from "./components/ChatPanel";
import { Settings, MessageSquare } from "lucide-react";

export default function App() {
  const [isSnipping, setIsSnipping] = useState(false);
  const [view, setView] = useState<'chat' | 'settings'>('chat');
  const [sessionKey, setSessionKey] = useState(0);
  const [pendingSnip, setPendingSnip] = useState<{type: 'ocr'|'vision', data: string} | null>(null);

  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

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
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
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
          className={`p-2.5 rounded-xl transition-colors ${view === 'chat' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
          onClick={() => setView('chat')}
          title="Chat (Session)"
        >
          <MessageSquare size={22} />
        </button>
        <button 
          className={`p-2.5 rounded-xl transition-colors ${view === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
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
  );
}
