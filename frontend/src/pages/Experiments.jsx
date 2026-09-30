import React, { useState, useEffect, useCallback } from 'react';
import { experimentService, promptService } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Beaker, RefreshCw, Search, Eye, Loader, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import ExperimentResultCard from '../components/ExperimentResultCard';
import { chartTooltipStyle, chartAxisTick, chartGridStroke } from '../components/chartTheme';

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
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">Experiments</h1>
          <p className="page-subtitle">A/B test prompt versions</p>
        </div>
        <div className="page-actions">
          <button onClick={fetchExperiments} className="btn-secondary">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Beaker className="h-4 w-4" /> New Experiment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar glass-card animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="search-field">
          <Search />
          <input
            type="text"
            placeholder="Search experiments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark"
            aria-label="Search experiments"
          />
        </div>
        <div className="chip-group">
          {['all', 'completed', 'running', 'pending', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className="filter-chip"
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Experiments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state animate-fade-in">
          <Beaker />
          <p className="empty-state-title">No experiments found</p>
          <p className="empty-state-hint">Create one to compare prompt versions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((exp, i) => (
            <div
              key={exp.id}
              className="glass-card card-interactive rounded-2xl overflow-hidden flex flex-col animate-fade-in opacity-0 cursor-pointer"
              style={{ animationDelay: `${0.05 * i}s` }}
              onClick={() => viewResults(exp)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  viewResults(exp);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="p-5 flex-1">
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
                    <div className="flex-1 min-w-0">
                      <h3 className="card-title truncate" title={exp.name}>{exp.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {exp.created_at ? formatDistanceToNow(new Date(exp.created_at), { addSuffix: true }) : ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <StatusBadge status={exp.status} />
                    </div>
                </div>
              </div>
              <div className="card-footer">
                <span className="text-xs text-slate-500">
                  {exp.created_at ? format(new Date(exp.created_at), 'MMM dd, yyyy HH:mm') : ''}
                </span>
                <span className="btn-link">
                  <Eye className="h-3 w-3" /> View
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== CREATE EXPERIMENT MODAL ===== */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setSubmitMessage(null); }} title="Create Experiment" size="md">
        <form onSubmit={handleRunExperiment} className="space-y-5">
          <div>
            <label className="field-label">Prompt</label>
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
            <label className="field-label">Experiment Name</label>
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
            <div
              role={submitMessage.type === 'error' ? 'alert' : 'status'}
              className={`alert ${submitMessage.type === 'error' ? 'alert-error' : 'alert-success'}`}
            >
              {submitMessage.text}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
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
                <p className="label-caps mb-1">Status</p>
                <div className="h-8 flex items-center">
                  <StatusBadge status={experimentResults.status} />
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="label-caps mb-1">Results</p>
                <p className="text-2xl font-bold text-white">{experimentResults.results?.length || 0}</p>
              </div>
              {avgScore && (
                <div className="glass-card rounded-xl p-4">
                  <p className="label-caps mb-1">Avg Score</p>
                  <p className={`text-2xl font-bold ${
                    avgScore >= 80 ? 'text-emerald-400' : avgScore >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>{avgScore}%</p>
                </div>
              )}
            </div>

            {/* Score Chart */}
            {getChartData().length > 0 && (
              <div className="glass-card rounded-xl p-5">
                <h4 className="section-title">Score Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                      <XAxis dataKey="name" tick={chartAxisTick} />
                      <YAxis tick={chartAxisTick} domain={[0, 100]} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="avg_score" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Detailed Results */}
            {experimentResults.results?.length > 0 && (
              <div>
                <h4 className="section-title">Detailed Results</h4>
                <div className="space-y-3">
                  {experimentResults.results.map((res, i) => (
                    <ExperimentResultCard key={res.id || i} result={res} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Export */}
            <div className="modal-actions">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(experimentResults, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `experiment-${selectedExperiment?.name}.json`; a.click();
                }}
                className="btn-ghost"
              >
                <Download className="h-4 w-4" /> Export JSON
              </button>
              <button onClick={() => setShowResultsModal(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        ) : (
          <p className="empty-note">No results available</p>
        )}
      </Modal>
    </div>
  );
};

export default Experiments;
