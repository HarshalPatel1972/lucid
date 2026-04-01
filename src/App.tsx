import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function App() {
  const [stealthOn, setStealthOn] = useState(true);

  // Enable stealth immediately on mount
  useEffect(() => {
    invoke("set_stealth", { enabled: true }).catch(console.error);
  }, []);

  const toggleStealth = async () => {
    const next = !stealthOn;
    try {
      await invoke("set_stealth", { enabled: next });
      setStealthOn(next);
    } catch (e) {
      console.error("set_stealth failed:", e);
    }
  };

  return (
    <div className="app-shell">
      <div className="header">
        <span className="brand">Lucid</span>
        <span className={`status-dot ${stealthOn ? "stealth" : "visible"}`} />
      </div>

      <div className="content">
        <p className="status-label">
          {stealthOn ? "Invisible to screen share" : "Visible to screen share"}
        </p>
        <button className="toggle-btn" onClick={toggleStealth}>
          {stealthOn ? "Disable Stealth" : "Enable Stealth"}
        </button>
        <p className="hint">
          Open OBS or start a screen share to verify.
        </p>
      </div>
    </div>
  );
}
