import React, { useEffect, useState, useCallback } from 'react';
import { runApiService, promptService, experimentService } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  TrendingUp, Activity, BarChart3, RefreshCw, Clock, Zap, Layers
} from 'lucide-react';
import { format } from 'date-fns';

const Analytics = () => {
  const [runs, setRuns] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [runsData, promptsData, experimentsData] = await Promise.all([
        runApiService.list(0, 200),
        promptService.list(0, 100),
        experimentService.list(0, 100),
      ]);
      setRuns(runsData || []);
      setPrompts(promptsData || []);
      setExperiments(experimentsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Model usage pie
  const modelUsage = runs.reduce((acc, r) => {
    const model = r.model || 'unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  const modelPieData = Object.entries(modelUsage).map(([name, value]) => ({ name, value }));

  // Success rate over time (grouped by hour)  
  const hourlyData = {};
  runs.forEach(r => {
    if (!r.created_at) return;
    const hour = format(new Date(r.created_at), 'MM/dd HH:00');
    if (!hourlyData[hour]) hourlyData[hour] = { total: 0, success: 0, latency: [] };
    hourlyData[hour].total++;
    if (r.status === 'success' || r.status === 'completed') hourlyData[hour].success++;
    if (r.latency_ms) hourlyData[hour].latency.push(r.latency_ms);
  });

  const timeSeriesData = Object.entries(hourlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-24)
    .map(([time, data]) => ({
      time,
      successRate: data.total > 0 ? ((data.success / data.total) * 100).toFixed(1) : 0,
      avgLatency: data.latency.length > 0 ? Math.round(data.latency.reduce((a, b) => a + b, 0) / data.latency.length) : 0,
      runs: data.total,
    }));

  // Latency distribution histogram
  const latencyBuckets = { '0-100': 0, '100-500': 0, '500-1000': 0, '1000-2000': 0, '2000+': 0 };
  runs.forEach(r => {
    const ms = r.latency_ms || 0;
    if (ms <= 100) latencyBuckets['0-100']++;
    else if (ms <= 500) latencyBuckets['100-500']++;
    else if (ms <= 1000) latencyBuckets['500-1000']++;
    else if (ms <= 2000) latencyBuckets['1000-2000']++;
    else latencyBuckets['2000+']++;
  });
  const latencyHistData = Object.entries(latencyBuckets).map(([range, count]) => ({ range, count }));

  // Model comparison radar
  const modelStats = {};
  runs.forEach(r => {
    const m = r.model || 'unknown';
    if (!modelStats[m]) modelStats[m] = { total: 0, success: 0, totalLatency: 0, count: 0 };
    modelStats[m].total++;
    if (r.status === 'success' || r.status === 'completed') modelStats[m].success++;
    if (r.latency_ms) { modelStats[m].totalLatency += r.latency_ms; modelStats[m].count++; }
  });

  const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

  const tooltipStyle = {
    background: 'rgba(15,23,42,0.95)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-80 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics</h2>
          <p className="text-sm text-slate-400 mt-1">Performance insights & trends</p>
        </div>
        <button onClick={fetchData} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <MiniStat label="Total Runs" value={runs.length} icon={TrendingUp} />
        <MiniStat
          label="Avg Latency"
          value={`${runs.length > 0 ? Math.round(runs.reduce((a, r) => a + (r.latency_ms || 0), 0) / runs.length) : 0}ms`}
          icon={Clock}
        />
        <MiniStat label="Models Used" value={Object.keys(modelUsage).length} icon={Layers} />
        <MiniStat
          label="Success Rate"
          value={`${runs.length > 0 ? ((runs.filter(r => r.status === 'success' || r.status === 'completed').length / runs.length) * 100).toFixed(1) : 0}%`}
          icon={Activity}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Rate Over Time */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Success Rate Over Time</h3>
              <p className="text-xs text-slate-500 mt-0.5">Hourly success percentage</p>
            </div>
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="h-64">
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} fill="url(#successGrad)" name="Success %" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        {/* Model Usage */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Model Usage</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution of model calls</p>
            </div>
            <Layers className="h-5 w-5 text-primary-400" />
          </div>
          <div className="h-64">
            {modelPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {modelPieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        {/* Latency Distribution */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Latency Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Response time buckets (ms)</p>
            </div>
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyHistData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Runs" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Throughput Over Time */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Throughput</h3>
              <p className="text-xs text-slate-500 mt-0.5">Runs per hour</p>
            </div>
            <Zap className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="h-64">
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="runs" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Runs" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>
      </div>

      {/* Model Performance Table */}
      {Object.keys(modelStats).length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">Model Performance Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Total Runs</th>
                  <th>Success Rate</th>
                  <th>Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(modelStats).map(([model, stats]) => (
                  <tr key={model}>
                    <td><span className="text-white font-medium">{model}</span></td>
                    <td>{stats.total}</td>
                    <td>
                      <span className={
                        (stats.success / stats.total) >= 0.8 ? 'text-emerald-400' :
                        (stats.success / stats.total) >= 0.5 ? 'text-amber-400' : 'text-red-400'
                      }>
                        {((stats.success / stats.total) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs">
                        {stats.count > 0 ? `${Math.round(stats.totalLatency / stats.count)}ms` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const MiniStat = ({ label, value, icon: Icon }) => (
  <div className="glass-card rounded-xl p-4">
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-primary-400" />
      <div>
        <p className="text-[11px] text-slate-500 uppercase font-semibold">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  </div>
);

const EmptyChart = () => (
  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
    No data available yet
  </div>
);

export default Analytics;
