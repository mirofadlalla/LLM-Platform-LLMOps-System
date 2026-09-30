import React, { useEffect, useState, useCallback } from 'react';
import { runApiService, promptService, experimentService } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Activity, RefreshCw, Clock, Zap, Layers
} from 'lucide-react';
import { format } from 'date-fns';
import StatCard from '../components/StatCard';
import ChartCard, { ChartEmpty } from '../components/ChartCard';
import { chartTooltipStyle, chartAxisTick, chartGridStroke, CHART_COLORS } from '../components/chartTheme';

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

  const totalRuns = runs.length;
  const avgLatency = totalRuns > 0 ? Math.round(runs.reduce((a, r) => a + (r.latency_ms || 0), 0) / totalRuns) : 0;
  const successRate = totalRuns > 0
    ? ((runs.filter(r => r.status === 'success' || r.status === 'completed').length / totalRuns) * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-14 w-56 skeleton" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-80 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Performance insights & trends</p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <StatCard title="Total Runs" value={totalRuns} icon={TrendingUp} color="from-blue-500 to-cyan-400" />
        <StatCard title="Avg Latency" value={`${avgLatency}ms`} icon={Clock} color="from-amber-500 to-yellow-400" />
        <StatCard title="Models Used" value={Object.keys(modelUsage).length} icon={Layers} color="from-indigo-500 to-blue-400" />
        <StatCard title="Success Rate" value={`${successRate}%`} icon={Activity} color="from-emerald-500 to-green-400" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Success Rate Over Time" subtitle="Hourly success percentage" icon={Activity} iconClass="text-emerald-400" delay="0.1s">
          {timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                <XAxis dataKey="time" tick={chartAxisTick} angle={-30} textAnchor="end" height={64} />
                <YAxis domain={[0, 100]} tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} fill="url(#successGrad)" name="Success %" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>

        <ChartCard title="Model Usage" subtitle="Distribution of model calls" icon={Layers} iconClass="text-primary-400" delay="0.15s">
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
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>

        <ChartCard title="Latency Distribution" subtitle="Response time buckets (ms)" icon={Clock} iconClass="text-amber-400" delay="0.2s">
          {runs.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyHistData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                <XAxis dataKey="range" tick={chartAxisTick} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Runs" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>

        <ChartCard title="Throughput" subtitle="Runs per hour" icon={Zap} iconClass="text-cyan-400" delay="0.25s">
          {timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                <XAxis dataKey="time" tick={chartAxisTick} angle={-30} textAnchor="end" height={64} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="runs" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Runs" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>
      </div>

      {/* Model Performance Table */}
      {Object.keys(modelStats).length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="card-header">
            <h3 className="card-title">Model Performance Comparison</h3>
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

export default Analytics;
