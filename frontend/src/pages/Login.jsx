import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, LogIn, UserPlus, Eye, EyeOff, Loader, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Login / Register page.
 *
 * After a successful login the user lands on the dashboard.
 * If they have no API key yet a prompt guides them to Settings → create one.
 */
const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode]       = useState('login');   // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showPw, setShowPw]   = useState(false);

  const [form, setForm] = useState({ username: '', email: '', password: '' });

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ username: form.username, password: form.password });
      } else {
        await register({ username: form.username, email: form.email, password: form.password });
      }
      navigate('/');
    } catch (err) {
      setError(err.friendlyMessage || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-xl shadow-primary-500/30">
            <Zap className="h-7 w-7 text-on-accent" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold gradient-text tracking-tight">LLMOps</p>
            <p className="text-sm text-slate-500 mt-0.5">Prompt Management Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-6 space-y-5">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-white/5 p-1 gap-1">
            {[['login', 'Sign In', LogIn], ['register', 'Register', UserPlus]].map(
              ([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setMode(key); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === key
                      ? 'bg-primary-500/20 text-primary-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              )
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="field-label">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={set('username')}
                className="input-dark w-full"
                placeholder="your_username"
                required
                autoFocus
              />
            </div>

            {/* Email — register only */}
            {mode === 'register' && (
              <div className="animate-fade-in">
                <label className="field-label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  className="input-dark w-full"
                  placeholder="you@example.com"
                  required
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  className="input-dark w-full pr-10"
                  placeholder="••••••••"
                  minLength={mode === 'register' ? 8 : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="alert alert-error" role="alert">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? (
                <><Loader className="h-4 w-4 animate-spin" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>
        </div>

        {/* Hint */}
        {mode === 'register' && (
          <p className="text-center text-xs text-slate-500 animate-fade-in">
            After registering, go to <span className="text-primary-400">Settings → API Keys</span> to create your first platform key.
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
