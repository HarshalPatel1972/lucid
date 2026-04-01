import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, Key, Monitor, Shield, Save } from 'lucide-react';

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
    } catch (e) {
      console.error(e);
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
        data-tauri-drag-region
      >
        <h2 className='text-xl font-bold mb-6 flex items-center gap-2 text-zinc-100 pointer-events-none'>
          <Settings size={20} className='text-zinc-400' /> Settings
        </h2>
        <TabButton id='api_keys' label='API Keys' icon={Key} active={activeTab} set={setActiveTab} />
        <TabButton id='general' label='General' icon={Monitor} active={activeTab} set={setActiveTab} />
        <TabButton id='stealth' label='Stealth & Ghost' icon={Shield} active={activeTab} set={setActiveTab} />
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
            <InputField label='Theme' value={config.appearance.theme || ''} onChange={(v: string) => setConfig({...config, appearance: {...config.appearance, theme: v}})} placeholder='system / dark / light' />
            <InputField label='Font Family' value={config.appearance.font_family || ''} onChange={(v: string) => setConfig({...config, appearance: {...config.appearance, font_family: v}})} />
            <InputField label='Opacity (0.1 to 1.0)' value={config.appearance.opacity?.toString() || ''} onChange={(v: string) => setConfig({...config, appearance: {...config.appearance, opacity: parseFloat(v)}})} type='number' />
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