import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { promptService, runApiService, experimentService } from '../services/api';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Clock, CheckCircle, Terminal, Beaker, TrendingUp,
  Play, RefreshCw, Zap, ArrowUpRight, Activity, Layers
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import ChartCard, { ChartEmpty } from '../components/ChartCard';
import { chartTooltipStyle, chartAxisTick, chartGridStroke, STATUS_COLORS } from '../components/chartTheme';

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

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-14 w-56 skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 skeleton rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-80 skeleton rounded-2xl" />
          <div className="h-80 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">System Overview</h1>
          <p className="page-subtitle">Real-time monitoring & analytics</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="btn-secondary"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
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
          trendColor={successRate >= 80 ? 'text-emerald-400' : successRate >= 50 ? 'text-amber-400' : 'text-red-400'}
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
        <h3 className="card-title mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/prompts')} className="btn-primary">
            <Terminal className="h-4 w-4" /> Manage Prompts
          </button>
          <button onClick={() => navigate('/experiments')} className="btn-secondary">
            <Beaker className="h-4 w-4" /> Run Experiment
          </button>
          <button onClick={() => navigate('/runs')} className="btn-secondary">
            <Play className="h-4 w-4" /> Go to Playground
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard
          title="Latency Trend"
          subtitle="Last 20 runs (ms)"
          icon={Activity}
          iconClass="text-primary-400"
          delay="0.3s"
        >
          {latencyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                <XAxis dataKey="time" tick={chartAxisTick} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="latency" stroke="#8b5cf6" strokeWidth={2} fill="url(#latencyGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>

        <ChartCard
          title="Status Distribution"
          subtitle="Run outcomes breakdown"
          icon={Zap}
          iconClass="text-accent-400"
          delay="0.35s"
        >
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
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || '#64748b'} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Runs */}
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="card-header">
            <h3 className="card-title">Recent Runs</h3>
            <button onClick={() => navigate('/runs')} className="btn-link">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {runs.slice(0, 5).map((run) => (
              <div key={run.id} className="list-row flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{run.model || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">
                    {run.created_at ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true }) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {run.latency_ms && (
                    <span className="text-xs text-slate-500 font-mono">{run.latency_ms}ms</span>
                  )}
                  <StatusBadge status={run.status} />
                </div>
              </div>
            ))}
            {runs.length === 0 && (
              <p className="empty-note">No runs yet</p>
            )}
          </div>
        </div>

        {/* Recent Experiments */}
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.45s' }}>
          <div className="card-header">
            <h3 className="card-title">Recent Experiments</h3>
            <button onClick={() => navigate('/experiments')} className="btn-link">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {experiments.slice(0, 5).map((exp) => (
              <div key={exp.id} className="list-row flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{exp.name}</p>
                  <p className="text-xs text-slate-500">
                    {exp.created_at ? formatDistanceToNow(new Date(exp.created_at), { addSuffix: true }) : ''}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <StatusBadge status={exp.status} />
                </div>
              </div>
            ))}
            {experiments.length === 0 && (
              <p className="empty-note">No experiments yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
