import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Play, Beaker, Database, Settings, ChevronLeft,
  ChevronRight, Bell, Zap, Menu, BarChart3, Sun, Moon, LogOut, User
} from 'lucide-react';
import { healthService } from '../services/api';
import { useTheme } from './ThemeContext';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Prompts', href: '/prompts', icon: Database },
  { name: 'Runs', href: '/runs', icon: Play },
  { name: 'Experiments', href: '/experiments', icon: Beaker },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { theme, setPreference } = useTheme();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiHealthy, setApiHealthy] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const checkHealth = async () => {
    const result = await healthService.check();
    setApiHealthy(result.healthy);
  };

  const currentPage = navigation.find(n => n.href === location.pathname)?.name || 'LLMOps';
  // The icon-only rail is a desktop feature; the mobile drawer always shows labels
  const compact = collapsed && !mobileOpen;

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="scrim fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64
          ${collapsed ? 'md:w-[72px]' : ''}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          transition-all duration-300 ease-in-out
          glass border-r border-white/5 flex flex-col
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-white/5 ${compact ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
            <Zap className="h-5 w-5 text-on-accent" />
          </div>
          {!compact && (
            <div className="animate-fade-in">
              <p className="text-lg font-bold gradient-text tracking-tight leading-tight">LLMOps</p>
              <p className="text-[11px] leading-tight text-slate-500 font-medium">Prompt Management</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-colors duration-200
                  ${compact ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-primary-500/15 text-primary-300 shadow-lg shadow-primary-500/5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }
                `}
                title={compact ? item.name : undefined}
              >
                <item.icon
                  className={`h-5 w-5 flex-shrink-0 transition-colors ${
                    isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                {!compact && <span>{item.name}</span>}
                {isActive && !compact && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse-glow" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-white/5 hidden md:block">
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'md:pl-[72px]' : 'md:pl-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 glass border-b border-white/5">
          <div className="flex items-center justify-between h-16 px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="icon-btn -ml-2 md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <p className="text-sm font-medium text-slate-300">{currentPage}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* API Health */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                <div className={`w-2 h-2 rounded-full ${
                  apiHealthy === null ? 'bg-slate-500' :
                  apiHealthy ? 'bg-emerald-400 shadow-lg shadow-emerald-400/30' :
                  'bg-red-400 shadow-lg shadow-red-400/30'
                }`} />
                <span className="text-xs font-medium text-slate-400">
                  {apiHealthy === null ? 'Checking...' : apiHealthy ? 'API Online' : 'API Offline'}
                </span>
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setPreference(theme === 'dark' ? 'light' : 'dark')}
                className="icon-btn"
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="icon-btn relative"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </button>

              {/* User badge + logout */}
              {user && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 text-xs text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    <span className="font-medium text-slate-300">{user.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="icon-btn text-slate-500 hover:text-rose-400"
                    aria-label="Sign out"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
