import { useState, useEffect } from "react";
// import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { SnipOverlay } from "./components/SnipOverlay";
import { SettingsPanel } from "./components/SettingsPanel";

export default function App() {
  const [isSnipping, setIsSnipping] = useState(false);

  useEffect(() => {
    // We launch into stealth if config told us to, the Rust side handled that,
    // but just in case, we can set default stealth handling.
    // Also listen to the global hotkey
    const unlisten = listen<string>('hotkey', (event) => {
      if (event.payload === 'Ctrl+Shift+S') {
        setIsSnipping(true);
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return (
    <div className="flex h-screen w-screen bg-transparent overflow-hidden">
      {isSnipping ? (
        <SnipOverlay
          onCapture={(res) => {
            console.log("Captured:", res.type);
            setIsSnipping(false);
          }}
          onCancel={() => setIsSnipping(false)}
        />
      ) : (
        <SettingsPanel />
      )}
    </div>
  );
}
