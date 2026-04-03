import { useState, useEffect, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";

interface SettingsPanelProps {
  onConfigChanged?: () => void;
}

// ── SVG Icons ──────────────────────────────────────────────────
const SaveIcon = () => (
  <svg viewBox="0 0 13 13" fill="none">
    <path d="M2 2h7l2 2v7a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M4 1v3h5V1M4 8h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 13 13" fill="none">
    <path d="M1 6.5C2.5 3.5 4.5 2 6.5 2s4 1.5 5.5 4.5C10.5 9.5 8.5 11 6.5 11S2.5 9.5 1 6.5z" stroke="currentColor" strokeWidth="1.1"/>
    <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 13 13" fill="none">
    <path d="M1.5 1.5l10 10M5 4A5.5 5.5 0 0112 6.5c-.6 1-1.5 2-2.5 2.5M4 9.5A7 7 0 011 6.5c.8-1.5 2-3 3.5-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
);

// ── Sub-components ─────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="toggle-bg" />
      <div className="toggle-thumb" />
    </label>
  );
}

function ApiKeyField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="srow">
      <div className="srow-left">
        <p className="srow-label">{label}</p>
      </div>
      <div className="srow-control">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Paste your key…"}
          className="s-input"
          spellCheck={false}
          autoComplete="off"
        />
        <button className="eye-btn" onClick={() => setShow((s) => !s)} title={show ? "Hide" : "Show"}>
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function HotkeyCapture({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [recording, setRecording] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    const mod = e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta";
    if (mod) return;
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("CommandOrControl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    let k = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    parts.push(k);
    onChange(parts.join("+"));
    setRecording(false);
  };

  return (
    <div className="srow">
      <div className="srow-left">
        <p className="srow-label">{label}</p>
      </div>
      <div className="srow-control">
        <input
          type="text"
          value={recording ? "Press keys…" : value}
          onFocus={() => setRecording(true)}
          onBlur={() => setRecording(false)}
          onKeyDown={recording ? handleKeyDown : undefined}
          readOnly
          className={`hotkey-input${recording ? " recording" : ""}`}
          title="Click and press keys to record shortcut"
        />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export const SettingsPanel = memo(function SettingsPanel({
  onConfigChanged,
}: SettingsPanelProps) {
  const [config, setConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"api" | "appearance" | "privacy" | "hotkeys">("api");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke("get_config").then(setConfig as any).catch(console.error);
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await invoke("save_config", { config });
      if (onConfigChanged) onConfigChanged();

      const nativeOps: Promise<unknown>[] = [];
      if (config.appearance?.opacity !== undefined) {
        document.documentElement.style.setProperty(
          "--app-opacity",
          config.appearance.opacity.toString()
        );
        nativeOps.push(
          invoke("set_opacity", { opacity: config.appearance.opacity }).catch(console.error)
        );
      }
      nativeOps.push(
        invoke("set_click_through", { enabled: config.ghost_mode }).catch(console.error),
        invoke("set_stealth", { enabled: config.stealth_on_launch }).catch(console.error)
      );
      await Promise.all(nativeOps);
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(`Save failed: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 12 }}>
        Loading…
      </div>
    );
  }

  const patch = (partial: any) => setConfig((c: any) => ({ ...c, ...partial }));
  const patchAppearance = (partial: any) => setConfig((c: any) => ({ ...c, appearance: { ...c.appearance, ...partial } }));
  const patchHotkeys = (partial: any) => setConfig((c: any) => ({ ...c, hotkeys: { ...c.hotkeys, ...partial } }));
  const patchApiKeys = (partial: any) => setConfig((c: any) => ({ ...c, api_keys: { ...c.api_keys, ...partial } }));

  const TABS = [
    { id: "api" as const, label: "API Keys" },
    { id: "appearance" as const, label: "Appearance" },
    { id: "privacy" as const, label: "Privacy" },
    { id: "hotkeys" as const, label: "Hotkeys" },
  ];

  return (
    <div className="settings-root">
      {/* Tabs */}
      <div className="settings-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`stab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="settings-body">

        {/* ── API Keys ── */}
        {activeTab === "api" && (
          <>
            <div className="settings-section">
              <p className="section-title">AI Providers</p>
              <div className="settings-card">
                <ApiKeyField
                  label="Groq"
                  value={config.api_keys.groq || ""}
                  onChange={(v) => patchApiKeys({ groq: v })}
                />
                <ApiKeyField
                  label="Gemini"
                  value={config.api_keys.gemini || ""}
                  onChange={(v) => patchApiKeys({ gemini: v })}
                />
                <ApiKeyField
                  label="DeepSeek"
                  value={config.api_keys.deepseek || ""}
                  onChange={(v) => patchApiKeys({ deepseek: v })}
                />
                <ApiKeyField
                  label="OpenRouter"
                  value={config.api_keys.openrouter || ""}
                  onChange={(v) => patchApiKeys({ openrouter: v })}
                />
                <ApiKeyField
                  label="Claude (Anthropic)"
                  value={config.api_keys.claude || ""}
                  onChange={(v) => patchApiKeys({ claude: v })}
                />
              </div>
            </div>

            <div className="settings-section">
              <p className="section-title">Primary Model</p>
              <div className="settings-card">
                <div className="srow">
                  <div className="srow-left">
                    <p className="srow-label">Selected Provider</p>
                    <p className="srow-desc">
                      Lucid will default to this provider. If it fails, it will attempt alternative providers.
                    </p>
                  </div>
                  <div className="srow-control">
                    <select
                      value={config.provider_priority[0] || "groq"}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newPriority = [
                          val,
                          ...config.provider_priority.filter((p: string) => p !== val),
                        ];
                        patch({ provider_priority: newPriority });
                      }}
                      className="s-select"
                    >
                      <option value="groq">Groq (Llama 3)</option>
                      <option value="gemini">Gemini 2.5 Flash</option>
                      <option value="deepseek">DeepSeek V3</option>
                      <option value="openrouter">OpenRouter (Llama 4)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Appearance ── */}
        {activeTab === "appearance" && (
          <>
            <div className="settings-section">
              <p className="section-title">Display</p>
              <div className="settings-card">
                <div className="srow">
                  <div className="srow-left">
                    <p className="srow-label">Theme</p>
                  </div>
                  <div className="srow-control">
                    <select
                      value={config.appearance.theme || "system"}
                      onChange={(e) => patchAppearance({ theme: e.target.value })}
                      className="s-select"
                    >
                      <option value="system">System</option>
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="dracula">Dracula</option>
                      <option value="nord">Nord</option>
                      <option value="gruvbox">Gruvbox</option>
                    </select>
                  </div>
                </div>

                <div className="srow">
                  <div className="srow-left">
                    <p className="srow-label">Font</p>
                  </div>
                  <div className="srow-control">
                    <select
                      value={config.appearance.font_family || "sans-serif"}
                      onChange={(e) => patchAppearance({ font_family: e.target.value })}
                      className="s-select"
                    >
                      <option value="segoe-ui">Segoe UI (System)</option>
                      <option value="sans-serif">System Sans</option>
                      <option value="monospace">Monospace</option>
                      <option value="'Inter', sans-serif">Inter</option>
                      <option value="'Fira Code', monospace">Fira Code</option>
                    </select>
                  </div>
                </div>

                <div className="srow">
                  <div className="srow-left">
                    <p className="srow-label">Window Opacity</p>
                    <p className="srow-desc">Slide left to make the window more transparent</p>
                  </div>
                  <div className="srow-control" style={{ gap: 8 }}>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={config.appearance.opacity ?? 1.0}
                      onChange={async (e) => {
                        const v = parseFloat(e.target.value);
                        patchAppearance({ opacity: v });
                        document.documentElement.style.setProperty("--app-opacity", v.toString());
                        try { await invoke("set_opacity", { opacity: v }); } catch (_) {}
                      }}
                      className="s-range"
                    />
                    <span className="range-val">
                      {Math.round((config.appearance.opacity ?? 1.0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Privacy ── */}
        {activeTab === "privacy" && (
          <>
            <div className="settings-section">
              <p className="section-title">Window Visibility</p>
              <div className="settings-card">
                <div className="srow">
                  <div className="srow-left">
                    <p className="srow-label">Stealth on Launch</p>
                    <p className="srow-desc">
                      Hide window from screen capture and recording tools at startup
                    </p>
                  </div>
                  <div className="srow-control">
                    <Toggle
                      checked={config.stealth_on_launch}
                      onChange={(v) => patch({ stealth_on_launch: v })}
                    />
                  </div>
                </div>

                <div className="srow">
                  <div className="srow-left">
                    <p className="srow-label">Ghost Mode on Launch</p>
                    <p className="srow-desc">
                      Start with click-through enabled — mouse clicks pass through the window
                    </p>
                  </div>
                  <div className="srow-control">
                    <Toggle
                      checked={config.ghost_mode}
                      onChange={(v) => patch({ ghost_mode: v })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Hotkeys ── */}
        {activeTab === "hotkeys" && (
          <>
            <div className="settings-section">
              <p className="section-title">Global Shortcuts</p>
              <div className="settings-card">
                <HotkeyCapture
                  label="Toggle Visibility"
                  value={config.hotkeys.toggle_visibility}
                  onChange={(v) => patchHotkeys({ toggle_visibility: v })}
                />
                <HotkeyCapture
                  label="Toggle Ghost Mode"
                  value={config.hotkeys.toggle_click_through}
                  onChange={(v) => patchHotkeys({ toggle_click_through: v })}
                />
                <HotkeyCapture
                  label="Snip Region"
                  value={config.hotkeys.snip_region}
                  onChange={(v) => patchHotkeys({ snip_region: v })}
                />
                <HotkeyCapture
                  label="Capture Full Screen"
                  value={config.hotkeys.capture_full}
                  onChange={(v) => patchHotkeys({ capture_full: v })}
                />
                <HotkeyCapture
                  label="Focus Chat"
                  value={config.hotkeys.focus_chat}
                  onChange={(v) => patchHotkeys({ focus_chat: v })}
                />
                <HotkeyCapture
                  label="New Session"
                  value={config.hotkeys.new_session}
                  onChange={(v) => patchHotkeys({ new_session: v })}
                />
              </div>
            </div>
            <div className="settings-section" style={{ marginTop: 0 }}>
              <div className="settings-card">
                <div className="srow">
                  <p className="srow-desc" style={{ padding: 0 }}>
                    Click a field, then press the desired key combination to record it.
                    Win/Super key combinations are not supported by the OS.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="settings-footer">
        <button onClick={saveConfig} disabled={saving} className="save-btn">
          <SaveIcon />
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
});
