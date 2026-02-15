import React, { useState, useEffect, useCallback } from 'react';
import { experimentService, promptService } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Beaker, Play, RefreshCw, Search, Eye, CheckCircle, XCircle, Clock,
  Trophy, ArrowRight, BarChart3, Loader
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import Modal from '../components/Modal';
import { StatusBadge } from './Dashboard';

const Experiments = () => {
  const [experiments, setExperiments] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [experimentResults, setExperimentResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create form
  const [promptId, setPromptId] = useState('');
  const [experimentName, setExperimentName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  const fetchExperiments = useCallback(async () => {
    try {
      const data = await experimentService.list();
      setExperiments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch experiments', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExperiments();
    promptService.list().then(setPrompts).catch(console.error);
  }, [fetchExperiments]);

  const handleRunExperiment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const res = await experimentService.run(promptId, experimentName);
      setSubmitMessage({ type: 'success', text: res.message || 'Experiment started!' });
      setExperimentName('');
      setTimeout(() => fetchExperiments(), 2000);
    } catch (err) {
      setSubmitMessage({ type: 'error', text: err.friendlyMessage || 'Failed to start experiment' });
    } finally {
      setSubmitting(false);
    }
  };

  const viewResults = async (experiment) => {
    setSelectedExperiment(experiment);
    setShowResultsModal(true);
    setResultsLoading(true);
    setExperimentResults(null);
    try {
      const data = await experimentService.getStatus(experiment.id);
      setExperimentResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setResultsLoading(false);
    }
  };

  const filtered = experiments.filter(exp => {
    if (statusFilter !== 'all' && exp.status !== statusFilter) return false;
    if (searchQuery) {
      return exp.name?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Process results for charts
  const getChartData = () => {
    if (!experimentResults?.results?.length) return [];
    return experimentResults.results.map((r, i) => ({
      name: `Version ${i + 1}`,
      avg_score: r.avg_score != null ? (r.avg_score * 100).toFixed(1) : 0,
      min_score: r.min_score != null ? (r.min_score * 100).toFixed(1) : 0,
      max_score: r.max_score != null ? (r.max_score * 100).toFixed(1) : 0,
    }));
  };

  const avgScore = experimentResults?.results?.length
    ? (experimentResults.results.reduce((a, r) => a + (r.avg_score || 0), 0) / experimentResults.results.length * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-white">Experiments</h2>
          <p className="text-sm text-slate-400 mt-1">A/B test prompt versions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchExperiments} className="btn-ghost text-xs flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
            <Beaker className="h-4 w-4" /> New Experiment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search experiments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark w-full pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'completed', 'running', 'pending', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-primary-500/15 text-primary-300 border border-primary-500/20'
                  : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Experiments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <Beaker className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No experiments found</p>
          <p className="text-sm text-slate-600 mt-1">Create one to compare prompt versions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exp, i) => (
            <div
              key={exp.id}
              className="glass-card rounded-2xl overflow-hidden animate-fade-in opacity-0 cursor-pointer"
              style={{ animationDelay: `${0.05 * i}s` }}
              onClick={() => viewResults(exp)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      exp.status === 'completed'
                        ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20'
                        : exp.status === 'failed'
                        ? 'bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/20'
                        : 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/20'
                    }`}>
                      <Beaker className={`h-5 w-5 ${
                        exp.status === 'completed' ? 'text-emerald-400' :
                        exp.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{exp.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {exp.created_at ? formatDistanceToNow(new Date(exp.created_at), { addSuffix: true }) : ''}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={exp.status} />
                </div>
              </div>
              <div className="px-5 py-3 border-t border-white/5 bg-white/[0.015] flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {exp.created_at ? format(new Date(exp.created_at), 'MMM dd, yyyy HH:mm') : ''}
                </span>
                <button className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== CREATE EXPERIMENT MODAL ===== */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setSubmitMessage(null); }} title="Create Experiment" size="md">
        <form onSubmit={handleRunExperiment} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Prompt</label>
            <select
              value={promptId}
              onChange={(e) => setPromptId(e.target.value)}
              className="input-dark w-full"
              required
            >
              <option value="">Select a prompt...</option>
              {prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Experiment Name</label>
            <input
              type="text"
              value={experimentName}
              onChange={(e) => setExperimentName(e.target.value)}
              className="input-dark w-full"
              required
              placeholder="e.g., v2-vs-v3-comparison"
            />
          </div>

          {submitMessage && (
            <div className={`rounded-xl p-4 text-sm ${
              submitMessage.type === 'error'
                ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
            }`}>
              {submitMessage.text}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting ? <><Loader className="h-4 w-4 animate-spin" /> Starting...</> : <><Beaker className="h-4 w-4" /> Start Experiment</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ===== RESULTS MODAL ===== */}
      <Modal isOpen={showResultsModal} onClose={() => setShowResultsModal(false)} title={`Experiment: ${selectedExperiment?.name}`} size="xl">
        {resultsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="h-8 w-8 animate-spin text-primary-400" />
          </div>
        ) : experimentResults ? (
          <div className="space-y-6">
            {/* Status & Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <StatusBadge status={experimentResults.status} />
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Results</p>
                <p className="text-lg font-bold text-white">{experimentResults.results?.length || 0}</p>
              </div>
              {avgScore && (
                <div className="glass-card rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Avg Score</p>
                  <p className={`text-lg font-bold ${
                    avgScore >= 80 ? 'text-emerald-400' : avgScore >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>{avgScore}%</p>
                </div>
              )}
            </div>

            {/* Score Chart */}
            {getChartData().length > 0 && (
              <div className="glass-card rounded-xl p-6">
                <h4 className="text-sm font-semibold text-white mb-4">Score Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(15,23,42,0.95)',
                          border: '1px solid rgba(139,92,246,0.2)',
                          borderRadius: '10px',
                          color: '#e2e8f0'
                        }}
                      />
                      <Bar dataKey="avg_score" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Detailed Results */}
            {experimentResults.results?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Detailed Results</h4>
                <div className="space-y-3">
                  {experimentResults.results.map((res, i) => (
                    <div key={res.id || i} className="glass-card rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs text-slate-500">Version #{i + 1}</span>
                      </div>
                      
                      {/* Score Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-white/5 rounded-lg p-2.5">
                          <p className="text-[10px] text-slate-500">Avg Score</p>
                          <p className={`text-sm font-bold ${
                            res.avg_score >= 0.8 ? 'text-emerald-400' : res.avg_score >= 0.5 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {res.avg_score != null ? (res.avg_score * 100).toFixed(0) : 'N/A'}%
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2.5">
                          <p className="text-[10px] text-slate-500">Min</p>
                          <p className="text-sm font-bold text-orange-400">
                            {res.min_score != null ? (res.min_score * 100).toFixed(0) : 'N/A'}%
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2.5">
                          <p className="text-[10px] text-slate-500">Max</p>
                          <p className="text-sm font-bold text-cyan-400">
                            {res.max_score != null ? (res.max_score * 100).toFixed(0) : 'N/A'}%
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2.5">
                          <p className="text-[10px] text-slate-500">Hallucination</p>
                          <p className="text-sm font-bold text-rose-400">
                            {res.avg_hallucination_rate != null ? (res.avg_hallucination_rate * 100).toFixed(0) : 'N/A'}%
                          </p>
                        </div>
                      </div>

                      {/* Test Metrics */}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-white/5 rounded-lg p-2.5">
                          <p className="text-[10px] text-slate-500">Failures</p>
                          <p className="text-sm font-bold text-slate-300">{res.failure_count || 0}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2.5">
                          <p className="text-[10px] text-slate-500">Total Examples</p>
                          <p className="text-sm font-bold text-slate-300">{res.total_examples || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(experimentResults, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `experiment-${selectedExperiment?.name}.json`; a.click();
                }}
                className="btn-ghost text-xs"
              >
                Export JSON
              </button>
              <button onClick={() => setShowResultsModal(false)} className="btn-primary">Close</button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500">No results available</div>
        )}
      </Modal>
    </div>
  );
};

export default Experiments;
