import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  authService, getApiKey, setApiKey, getApiBaseUrl
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Key, Palette, Bell, Save, CheckCircle, Shield, Sun, Moon, Monitor,
  Plus, Trash2, Copy, Eye, EyeOff, Loader, XCircle, LogOut, User
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { format } from 'date-fns';

/**
 * Settings page — fully connected to the real backend.
 *
 * Sections:
 *  1. Account info + Logout
 *  2. API Keys  — create/list/revoke via /auth/api-keys (JWT-protected)
 *  3. Active API Key  — the key currently used for platform calls
 *  4. Appearance (theme)
 *  5. Notifications (UI only)
 *  6. About — shows VITE_API_URL at runtime (no hardcoding)
 */
const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { preference, theme, setPreference } = useTheme();

  // ── Active API key (used for platform calls) ──────────────────────────────
  const [activeKey, setActiveKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  // ── API key management (backend) ──────────────────────────────────────────
  const [apiKeys, setApiKeys]         = useState([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keysError, setKeysError]     = useState('');
  const [newKeyName, setNewKeyName]   = useState('');
  const [creating, setCreating]       = useState(false);
  const [createdKey, setCreatedKey]   = useState(null);  // shown once after creation
  const [showCreatedKey, setShowCreatedKey] = useState(false);

  useEffect(() => {
    setActiveKeyInput(getApiKey());
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setKeysLoading(true);
    setKeysError('');
    try {
      const data = await authService.listApiKeys();
      setApiKeys(data || []);
    } catch (err) {
      setKeysError(err.friendlyMessage || 'Failed to load API keys');
    } finally {
      setKeysLoading(false);
    }
  };

  const handleSaveActiveKey = () => {
    setApiKey(activeKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreatedKey(null);
    try {
      const data = await authService.createApiKey({ name: newKeyName || undefined });
      setCreatedKey(data);
      setShowCreatedKey(true);
      setNewKeyName('');
      // Also set the newly created key as the active platform key
      setActiveKeyInput(data.key);
      setApiKey(data.key);
      fetchApiKeys();
    } catch (err) {
      setKeysError(err.friendlyMessage || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (apiKeyId) => {
    if (!window.confirm('Revoke this API key? Any request using it will immediately fail.')) return;
    try {
      await authService.revokeApiKey(apiKeyId);
      fetchApiKeys();
    } catch (err) {
      setKeysError(err.friendlyMessage || 'Failed to revoke API key');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const apiBaseUrl = getApiBaseUrl();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="animate-fade-in">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your dashboard preferences</p>
      </div>

      {/* ── Account ──────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.02s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center">
            <User className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="card-title">Account</h3>
            <p className="text-xs text-slate-500">Your session</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200 font-medium">{user?.username}</p>
            <p className="text-xs text-slate-500">ID: {user?.user_id?.slice(0, 12)}…</p>
          </div>
          <button onClick={handleLogout} className="btn-secondary text-rose-400 hover:text-rose-300">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>

      {/* ── API Key Management (backend) ──────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in space-y-5" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/20 flex items-center justify-center">
            <Key className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="card-title">API Keys</h3>
            <p className="text-xs text-slate-500">Manage keys that grant access to the platform</p>
          </div>
        </div>

        {/* Error banner */}
        {keysError && (
          <div className="alert alert-error" role="alert">
            <XCircle className="h-4 w-4 flex-shrink-0" /> {keysError}
          </div>
        )}

        {/* Created key banner — shown once */}
        {createdKey && showCreatedKey && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <p className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> New API key created — copy it now, it won't be shown again
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs text-slate-200 bg-black/30 rounded-lg px-3 py-2 break-all">
                {createdKey.key}
              </code>
              <button
                onClick={() => { navigator.clipboard.writeText(createdKey.key); }}
                className="btn-ghost btn-sm flex-shrink-0"
                title="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setShowCreatedKey(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Create new key */}
        <form onSubmit={handleCreateKey} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="field-label">New Key Label (optional)</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="input-dark w-full"
              placeholder="e.g. production, local-dev"
              maxLength={100}
            />
          </div>
          <button type="submit" disabled={creating} className="btn-primary flex-shrink-0">
            {creating ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
        </form>

        {/* Existing keys list */}
        <div>
          <label className="field-label mb-2">Your Keys</label>
          {keysLoading ? (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
            </div>
          ) : apiKeys.length === 0 ? (
            <p className="empty-note">No API keys yet. Create one above.</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map(k => (
                <div
                  key={k.api_key_id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${
                    k.is_active
                      ? 'border-white/10 bg-white/[0.03]'
                      : 'border-white/5 bg-white/[0.01] opacity-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {k.name || <span className="text-slate-500 italic">Unnamed</span>}
                      {!k.is_active && <span className="ml-2 text-xs text-slate-500">(revoked)</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      Created {k.created_at ? format(new Date(k.created_at), 'MMM dd, yyyy') : '—'}
                    </p>
                  </div>
                  {k.is_active && (
                    <button
                      onClick={() => handleRevoke(k.api_key_id)}
                      className="btn-ghost btn-sm text-rose-400 hover:text-rose-300 flex-shrink-0"
                      title="Revoke"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Active Platform Key ───────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.08s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="card-title">Active API Key</h3>
            <p className="text-xs text-slate-500">The key currently used for all platform requests</p>
          </div>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            value={activeKey}
            onChange={(e) => setActiveKeyInput(e.target.value)}
            className="input-dark w-full font-mono"
            placeholder="Paste your llmops_xxx... key here"
          />
          <div className="flex items-center gap-3">
            <button onClick={handleSaveActiveKey} className="btn-primary">
              <Save className="h-4 w-4" /> Save Key
            </button>
            {keySaved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fade-in">
                <CheckCircle className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Create a key in the section above, copy it, then paste it here.
          </p>
        </div>
      </div>

      {/* ── Appearance ───────────────────────────────────────────────────── */}
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

      {/* ── Notifications ────────────────────────────────────────────────── */}
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
          <SettingToggle label="Run completion alerts"    defaultOn={true} />
          <SettingToggle label="Experiment completion"    defaultOn={true} />
          <SettingToggle label="Error notifications"      defaultOn={true} />
          <SettingToggle label="System health alerts"     defaultOn={false} />
        </div>
      </div>

      {/* ── About ────────────────────────────────────────────────────────── */}
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
          <div className="flex justify-between gap-4">
            <span>Version</span>
            <span className="text-white">1.0.0</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>API Base</span>
            {/* Read from env var — never hardcoded */}
            <span className="font-mono text-xs text-white break-all">{apiBaseUrl}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Framework</span>
            <span className="text-white">React + Vite</span>
          </div>
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
