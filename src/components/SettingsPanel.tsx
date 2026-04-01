import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, Key, Monitor, Shield, Save, Keyboard } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function SettingsPanel() {
  const [config, setConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('api_keys');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke('get_config').then(setConfig as any).catch(console.error);
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await invoke('save_config', { config });
      
      // Live reload opacity
      if (config.appearance && config.appearance.opacity !== undefined) {
        // Apply CSS variable
        document.documentElement.style.setProperty('--app-opacity', config.appearance.opacity.toString());
        // Apply to native window wrapper
        try {
          await invoke('set_opacity', { opacity: config.appearance.opacity });
        } catch(e) {
          console.error("Window opacity set failed:", e);
        }
      }

      // Apply native Ghost Mode toggle
      try {
        await invoke('set_click_through', { enabled: config.ghost_mode });
      } catch (e) {
        console.error("Window click-through set failed:", e);
      }

      // Apply native Stealth toggle
      try {
        await invoke('set_stealth', { enabled: config.stealth_on_launch });
      } catch (e) {
        console.error("Window stealth set failed:", e);
      }

      toast.success('Settings saved successfully');
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to save settings: ${e.toString()}`);
    } finally {
      setSaving(false);
    }
  };

  if (!config) return <div className='flex items-center justify-center h-full text-zinc-400'>Loading...</div>;

  return (
    <div className='flex h-full w-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden'>
      {/* Sidebar */}
      <div 
        className='w-64 bg-zinc-920 border-r border-zinc-800 p-4 flex flex-col gap-2 select-none'
      >
        <h2 className='text-xl font-bold mb-6 flex items-center gap-2 text-zinc-100 pointer-events-none'>
          <Settings size={20} className='text-zinc-400' /> Settings
        </h2>
        <TabButton id='api_keys' label='API Keys' icon={Key} active={activeTab} set={setActiveTab} />
        <TabButton id='general' label='General' icon={Monitor} active={activeTab} set={setActiveTab} />
        <TabButton id='stealth' label='Stealth & Ghost' icon={Shield} active={activeTab} set={setActiveTab} />
        <TabButton id='shortcuts' label='Hotkeys' icon={Keyboard} active={activeTab} set={setActiveTab} />
        <div className='flex-1' />
        <button onClick={saveConfig} className='mt-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md py-2 px-4 transition-colors font-medium'>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Content */}
      <div className='flex-1 p-8 overflow-y-auto'>
        {activeTab === 'api_keys' && (
          <div className='space-y-6 animate-in fade-in duration-200'>
            <h3 className='text-2xl font-semibold mb-6 flex items-center gap-2'>
              <Key className='text-blue-500' /> AI Providers
            </h3>
            
            <InputField label='Groq API Key' value={config.api_keys.groq || ''} onChange={(v: string) => setConfig({...config, api_keys: {...config.api_keys, groq: v}})} type='password' />
            <InputField label='Gemini API Key' value={config.api_keys.gemini || ''} onChange={(v: string) => setConfig({...config, api_keys: {...config.api_keys, gemini: v}})} type='password' />
            <InputField label='Claude API Key' value={config.api_keys.claude || ''} onChange={(v: string) => setConfig({...config, api_keys: {...config.api_keys, claude: v}})} type='password' />
            <InputField label='Ollama Model' value={config.ollama_model || ''} onChange={(v: string) => setConfig({...config, ollama_model: v})} placeholder='e.g., llama3' />
          </div>
        )}

        {activeTab === 'general' && (
          <div className='space-y-6 animate-in fade-in duration-200'>
            <h3 className='text-2xl font-semibold mb-6 flex items-center gap-2'>
              <Monitor className='text-emerald-500' /> General Settings
            </h3>
            
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium text-zinc-400'>Theme</label>
              <select 
                value={config.appearance.theme || 'system'}
                onChange={e => setConfig({...config, appearance: {...config.appearance, theme: e.target.value}})}
                className='bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-lg px-4 py-2.5 text-zinc-100 outline-none transition-all appearance-none'
              >
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium text-zinc-400'>Font Family</label>
              <select 
                value={config.appearance.font_family || 'sans-serif'}
                onChange={e => setConfig({...config, appearance: {...config.appearance, font_family: e.target.value}})}
                className='bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-lg px-4 py-2.5 text-zinc-100 outline-none transition-all appearance-none'
              >
                <option value="sans-serif">System Sans</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="'Inter', sans-serif">Inter</option>
                <option value="'Fira Code', monospace">Fira Code</option>
              </select>
            </div>

            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium text-zinc-400'>Window Opacity ({config.appearance.opacity || 1.0})</label>
              <input 
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.appearance.opacity || 1.0}
                onChange={e => setConfig({...config, appearance: {...config.appearance, opacity: parseFloat(e.target.value)}})}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className='space-y-6 animate-in fade-in duration-200'>
            <h3 className='text-2xl font-semibold mb-6 flex items-center gap-2'>
              <Keyboard className='text-orange-500' /> Hotkeys
            </h3>
            <p className="text-sm text-zinc-400 mb-4">Click to record a new global shortcut.</p>

            <HotkeyInput label='Toggle Visibility' value={config.hotkeys.toggle_visibility || ''} onChange={(v: string) => setConfig({...config, hotkeys: {...config.hotkeys, toggle_visibility: v}})} placeholder='e.g., CommandOrControl+Shift+Space' />
            <HotkeyInput label='Toggle Ghost Mode (Click-Through)' value={config.hotkeys.toggle_click_through || ''} onChange={(v: string) => setConfig({...config, hotkeys: {...config.hotkeys, toggle_click_through: v}})} placeholder='e.g., CommandOrControl+Shift+T' />
            <HotkeyInput label='Focus Chat' value={config.hotkeys.focus_chat || ''} onChange={(v: string) => setConfig({...config, hotkeys: {...config.hotkeys, focus_chat: v}})} placeholder='e.g., CommandOrControl+Shift+A' />
            <HotkeyInput label='Snip Region' value={config.hotkeys.snip_region || ''} onChange={(v: string) => setConfig({...config, hotkeys: {...config.hotkeys, snip_region: v}})} placeholder='e.g., CommandOrControl+Shift+S' />
            <HotkeyInput label='New Session' value={config.hotkeys.new_session || ''} onChange={(v: string) => setConfig({...config, hotkeys: {...config.hotkeys, new_session: v}})} placeholder='e.g., CommandOrControl+Shift+N' />
            <HotkeyInput label='Capture Full Screen' value={config.hotkeys.capture_full || ''} onChange={(v: string) => setConfig({...config, hotkeys: {...config.hotkeys, capture_full: v}})} placeholder='e.g., CommandOrControl+Shift+F' />   
          </div>
        )}

        {activeTab === 'stealth' && (
          <div className='space-y-6 animate-in fade-in duration-200'>
            <h3 className='text-2xl font-semibold mb-6 flex items-center gap-2'>
              <Shield className='text-purple-500' /> Stealth & Ghost
            </h3>
            <div className='flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm'>
              <div>
                <h4 className='font-medium text-zinc-100'>Stealth On Launch</h4>
                <p className='text-sm text-zinc-400'>Make window completely invisible to screen capturing immediately upon startup.</p>
              </div>
              <input type='checkbox' checked={config.stealth_on_launch} onChange={e => setConfig({...config, stealth_on_launch: e.target.checked})} className='w-5 h-5 accent-purple-500' />
            </div>
            <div className='flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm'>
              <div>
                <h4 className='font-medium text-zinc-100'>Ghost Mode Defaults</h4>
                <p className='text-sm text-zinc-400'>Enable click-through mode automatically.</p>
              </div>
              <input type='checkbox' checked={config.ghost_mode} onChange={e => setConfig({...config, ghost_mode: e.target.checked})} className='w-5 h-5 accent-purple-500' />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ id, label, icon: Icon, active, set }: any) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => set(id)} 
      className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-all ${
        isActive ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
      }`}
    >
      <Icon size={18} className={isActive ? 'text-blue-400' : ''} /> {label}
    </button>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder = '' }: any) {
  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-sm font-medium text-zinc-400'>{label}</label>
      <input 
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className='bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-lg px-4 py-2.5 text-zinc-100 outline-none transition-all'
      />
    </div>
  );
}
function HotkeyInput({ label, value, onChange, placeholder }: any) {
  const [recording, setRecording] = useState(false);

  const handleKeyDown = (e: any) => {
    e.preventDefault();
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
      return; 
    }
    
    let keys = [];
    if (e.ctrlKey || e.metaKey) keys.push('CommandOrControl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    
    let key = e.key;
    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();
    
    keys.push(key);
    onChange(keys.join('+'));
    setRecording(false);
  };

  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-sm font-medium text-zinc-400'>{label}</label>
      <input
        type="text"
        value={recording ? "Listening for keypress..." : value}
        onFocus={() => setRecording(true)}
        onBlur={() => setRecording(false)}
        onKeyDown={recording ? handleKeyDown : undefined}
        readOnly
        placeholder={placeholder}
        className={`bg-zinc-900 border ${recording ? 'border-orange-500 ring-1 ring-orange-500' : 'border-zinc-800'} rounded-lg px-4 py-2.5 text-zinc-100 outline-none transition-all cursor-pointer`}
      />
    </div>
  );
}