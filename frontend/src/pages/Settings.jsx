import React, { useState, useEffect } from 'react';
import { getApiKey, setApiKey } from '../services/api';
import { Key, Palette, Bell, Save, CheckCircle, Shield, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';

const Settings = () => {
  const [apiKey, setApiKeyInput] = useState('');
  const [saved, setSaved] = useState(false);
  const { preference, theme, setPreference } = useTheme();

  useEffect(() => {
    setApiKeyInput(getApiKey());
  }, []);

  const handleSave = () => {
    setApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="animate-fade-in">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your dashboard preferences</p>
      </div>

      {/* API Key */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/20 flex items-center justify-center">
            <Key className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="card-title">API Key</h3>
            <p className="text-xs text-slate-500">Used for authenticating API requests</p>
          </div>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="input-dark w-full font-mono"
            placeholder="Enter your API key..."
          />
          <div className="flex items-center gap-3">
            <button onClick={handleSave} className="btn-primary">
              <Save className="h-4 w-4" /> Save Key
            </button>
            {saved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fade-in">
                <CheckCircle className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center">
            <Palette className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="card-title">Appearance</h3>
            <p className="text-xs text-slate-500">Dashboard theme configuration</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="chip-group" role="group" aria-label="Theme">
            {[['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Monitor]].map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => setPreference(value)}
                aria-pressed={preference === value}
                className="filter-chip gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
          {preference === 'system' && (
            <span className="text-xs text-slate-500">Following your device ({theme})</span>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/20 flex items-center justify-center">
            <Bell className="h-5 w-5 text-pink-400" />
          </div>
          <div>
            <h3 className="card-title">Notifications</h3>
            <p className="text-xs text-slate-500">Alert preferences</p>
          </div>
        </div>
        <div className="space-y-3">
          <SettingToggle label="Run completion alerts" defaultOn={true} />
          <SettingToggle label="Experiment completion" defaultOn={true} />
          <SettingToggle label="Error notifications" defaultOn={true} />
          <SettingToggle label="System health alerts" defaultOn={false} />
        </div>
      </div>

      {/* About */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="card-title">About</h3>
            <p className="text-xs text-slate-500">System information</p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-slate-400">
          <div className="flex justify-between gap-4"><span>Version</span><span className="text-white">1.0.0</span></div>
          <div className="flex justify-between gap-4"><span>API Base</span><span className="font-mono text-xs text-white">localhost:8000/api/v1</span></div>
          <div className="flex justify-between gap-4"><span>Framework</span><span className="text-white">React + Vite</span></div>
        </div>
      </div>
    </div>
  );
};

const SettingToggle = ({ label, defaultOn }) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        onClick={() => setOn(!on)}
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`relative w-11 h-6 flex-shrink-0 rounded-full transition-colors ${
          on ? 'bg-primary-500' : 'bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-on-accent shadow transition-transform ${
            on ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

export default Settings;
