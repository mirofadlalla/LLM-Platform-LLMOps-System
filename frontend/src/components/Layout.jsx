import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Play, Beaker, Database, Settings, ChevronLeft,
  ChevronRight, Activity, Bell, Search, Zap, Menu, X, BarChart3
} from 'lucide-react';
import { healthService } from '../services/api';

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiHealthy, setApiHealthy] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

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

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          ${collapsed ? 'w-[72px]' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          transition-all duration-300 ease-in-out
          glass flex flex-col
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-white/5 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold gradient-text tracking-tight">LLMOps</h1>
              <p className="text-[10px] text-slate-500 -mt-0.5 font-medium">Prompt Management</p>
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
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${collapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-primary-500/15 text-primary-300 shadow-lg shadow-primary-500/5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }
                `}
                title={collapsed ? item.name : undefined}
              >
                <item.icon
                  className={`h-5 w-5 flex-shrink-0 transition-colors ${
                    isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                {!collapsed && <span>{item.name}</span>}
                {isActive && !collapsed && (
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
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
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-white">{currentPage}</h2>
              </div>
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

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Bell className="h-5 w-5" />
              </button>
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
