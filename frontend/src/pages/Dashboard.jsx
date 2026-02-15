import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { promptService, runApiService, experimentService } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Clock, CheckCircle, XCircle, Terminal, Beaker, TrendingUp,
  Play, RefreshCw, Zap, ArrowUpRight, ArrowDownRight, Activity, Layers
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const Dashboard = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [runsData, promptsData, experimentsData] = await Promise.all([
        runApiService.list(0, 50),
        promptService.list(0, 100),
        experimentService.list(0, 100),
      ]);

      setRuns(runsData || []);
      setPrompts(promptsData || []);
      setExperiments(experimentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate stats
  const totalRuns = runs.length;
  const successRuns = runs.filter(r => r.status === 'success' || r.status === 'completed').length;
  const failedRuns = runs.filter(r => r.status === 'failed').length;
  const pendingRuns = runs.filter(r => r.status === 'pending' || r.status === 'processing').length;
  const successRate = totalRuns > 0 ? ((successRuns / totalRuns) * 100) : 0;
  const avgLatency = totalRuns > 0 ? runs.reduce((a, r) => a + (r.latency_ms || 0), 0) / totalRuns : 0;
  const activeModels = new Set(runs.map(r => r.model).filter(Boolean)).size;

  // Chart data
  const latencyData = runs.slice().reverse().slice(-20).map(r => ({
    time: r.created_at ? format(new Date(r.created_at), 'HH:mm') : '',
    latency: r.latency_ms || 0,
    status: r.status,
  }));

  const statusCounts = runs.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const COLORS = {
    success: '#34d399', completed: '#34d399', failed: '#f87171',
    pending: '#fbbf24', processing: '#60a5fa',
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 skeleton" />
          <div className="h-80 skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-white">System Overview</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time monitoring & analytics</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Runs"
          value={totalRuns}
          icon={TrendingUp}
          color="from-blue-500 to-cyan-400"
          trend={totalRuns > 0 ? '+' + totalRuns : null}
          delay="stagger-1"
        />
        <StatCard
          title="Success Rate"
          value={`${successRate.toFixed(1)}%`}
          icon={CheckCircle}
          color="from-emerald-500 to-green-400"
          trend={successRate >= 80 ? '↑ Good' : successRate >= 50 ? '→ OK' : '↓ Low'}
          trendColor={successRate >= 80 ? 'text-emerald-400' : successRate >= 50 ? 'text-yellow-400' : 'text-red-400'}
          delay="stagger-2"
        />
        <StatCard
          title="Avg Latency"
          value={`${Math.round(avgLatency)}ms`}
          icon={Clock}
          color="from-amber-500 to-yellow-400"
          delay="stagger-3"
        />
        <StatCard
          title="Prompts"
          value={prompts.length}
          icon={Terminal}
          color="from-violet-500 to-purple-400"
          delay="stagger-4"
        />
        <StatCard
          title="Experiments"
          value={experiments.length}
          icon={Beaker}
          color="from-pink-500 to-rose-400"
          delay="stagger-5"
        />
        <StatCard
          title="Models"
          value={activeModels}
          icon={Layers}
          color="from-indigo-500 to-blue-400"
          delay="stagger-6"
        />
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/prompts')} className="btn-primary flex items-center gap-2">
            <Terminal className="h-4 w-4" /> Manage Prompts
          </button>
          <button onClick={() => navigate('/experiments')} className="btn-secondary flex items-center gap-2 border-pink-500/20 text-pink-300 hover:bg-pink-500/10">
            <Beaker className="h-4 w-4" /> Run Experiment
          </button>
          <button onClick={() => navigate('/runs')} className="btn-secondary flex items-center gap-2">
            <Play className="h-4 w-4" /> Go to Playground
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Trend */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Latency Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Last 20 runs (ms)</p>
            </div>
            <Activity className="h-5 w-5 text-primary-400" />
          </div>
          <div className="h-64">
            {latencyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyData}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,23,42,0.95)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      borderRadius: '10px',
                      color: '#e2e8f0'
                    }}
                  />
                  <Area type="monotone" dataKey="latency" stroke="#8b5cf6" strokeWidth={2} fill="url(#latencyGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No run data available yet
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.35s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Status Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Run outcomes breakdown</p>
            </div>
            <Zap className="h-5 w-5 text-accent-400" />
          </div>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={COLORS[entry.name] || '#64748b'} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,23,42,0.95)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      borderRadius: '10px',
                      color: '#e2e8f0'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No run data available yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Runs */}
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recent Runs</h3>
            <button onClick={() => navigate('/runs')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {runs.slice(0, 5).map((run) => (
              <div key={run.id} className="px-6 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{run.model || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">
                      {run.created_at ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true }) : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {run.latency_ms && (
                      <span className="text-xs text-slate-500 font-mono">{run.latency_ms}ms</span>
                    )}
                    <StatusBadge status={run.status} />
                  </div>
                </div>
              </div>
            ))}
            {runs.length === 0 && (
              <div className="px-6 py-8 text-center text-slate-500 text-sm">No runs yet</div>
            )}
          </div>
        </div>

        {/* Recent Experiments */}
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.45s' }}>
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recent Experiments</h3>
            <button onClick={() => navigate('/experiments')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {experiments.slice(0, 5).map((exp) => (
              <div key={exp.id} className="px-6 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{exp.name}</p>
                    <p className="text-xs text-slate-500">
                      {exp.created_at ? formatDistanceToNow(new Date(exp.created_at), { addSuffix: true }) : ''}
                    </p>
                  </div>
                  <StatusBadge status={exp.status} />
                </div>
              </div>
            ))}
            {experiments.length === 0 && (
              <div className="px-6 py-8 text-center text-slate-500 text-sm">No experiments yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== Sub-components =====
const StatCard = ({ title, value, icon: Icon, color, trend, trendColor, delay }) => (
  <div className={`glass-card rounded-2xl p-5 animate-fade-in opacity-0 ${delay}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-white mt-2">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 font-medium ${trendColor || 'text-slate-400'}`}>{trend}</p>
        )}
      </div>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    success: 'badge-success',
    completed: 'badge-success',
    failed: 'badge-error',
    pending: 'badge-warning',
    processing: 'badge-info',
    running: 'badge-info',
  };

  return (
    <span className={`badge ${styles[status] || 'badge-neutral'}`}>
      {status === 'success' || status === 'completed' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      ) : status === 'failed' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      ) : status === 'pending' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      )}
      {status}
    </span>
  );
};

export { StatusBadge };
export default Dashboard;
