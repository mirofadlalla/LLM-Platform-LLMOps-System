import React, { useState, useEffect, useCallback } from 'react';
import { runApiService, promptService, modelsService } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Play, RefreshCw, Search, Eye, CheckCircle, XCircle, Loader
} from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const RunPlayground = () => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Run form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [versions, setVersions] = useState([]);

  // Provider / model catalog — loaded from backend
  const [catalog, setCatalog]         = useState({});
  const [provider, setProvider]       = useState('');
  const [modelSlug, setModelSlug]     = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [formData, setFormData] = useState({
    prompt_version_id: '',
    input_data: '{\n  \n}',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Run detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [runDetail, setRunDetail] = useState(null);
  const [pollingDetail, setPollingDetail] = useState(false);

  const fetchRuns = useCallback(async () => {
    try {
      const data = await runApiService.list(0, 100);
      setRuns(data || []);
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRuns]);

  // Load prompts for create modal
  useEffect(() => {
    if (showCreateModal) {
      promptService.list().then(setPrompts).catch(console.error);

      // Fetch provider/model catalog if not yet loaded
      if (Object.keys(catalog).length === 0) {
        setCatalogLoading(true);
        modelsService.catalog()
          .then(data => {
            setCatalog(data);
            const firstProvider = Object.keys(data)[0] || '';
            setProvider(firstProvider);
            setModelSlug(data[firstProvider]?.[0]?.slug || '');
          })
          .catch(console.error)
          .finally(() => setCatalogLoading(false));
      }
    }
  }, [showCreateModal]);

  // Reset model to first in list when provider changes
  useEffect(() => {
    if (provider && catalog[provider]) {
      setModelSlug(catalog[provider][0]?.slug || '');
    }
  }, [provider, catalog]);

  // Load versions when prompt selected
  useEffect(() => {
    if (selectedPromptId) {
      promptService.listVersions(selectedPromptId).then(data => {
        setVersions(data.versions || []);
      }).catch(console.error);
    }
  }, [selectedPromptId]);

  const filteredRuns = runs.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (r.model || '').toLowerCase().includes(q) ||
             (r.id || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleCreateRun = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);

    try {
      let parsedVars;
      try {
        parsedVars = JSON.parse(formData.input_data);
      } catch {
        setSubmitResult({ type: 'error', message: 'Input data must be valid JSON' });
        setSubmitting(false);
        return;
      }

      const res = await runApiService.create({
        prompt_version_id: formData.prompt_version_id,
        provider,
        model: modelSlug,
        variables: parsedVars,
      });

      setSubmitResult({
        type: 'success',
        message: `Run created! ID: ${res.run_id}`,
        data: res,
      });

      // Start polling for this run
      if (res.task_id || res.run_id) {
        pollRunStatus(res.task_id || res.run_id);
      }

      fetchRuns();
    } catch (err) {
      setSubmitResult({ type: 'error', message: err.friendlyMessage || 'Failed to create run' });
    } finally {
      setSubmitting(false);
    }
  };

  const pollRunStatus = async (taskId) => {
    const interval = setInterval(async () => {
      try {
        const statusRes = await runApiService.getTaskStatus(taskId);
        if (statusRes.status === 'success' || statusRes.status === 'failed') {
          clearInterval(interval);
          setSubmitResult(prev => ({
            ...prev,
            finalStatus: statusRes,
          }));
          fetchRuns();
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
  };

  const viewRunDetail = async (run) => {
    setSelectedRun(run);
    setRunDetail(null);
    setShowDetailModal(true);
    // If run has a task, try to get the detail
    // For now show the run data directly
    setRunDetail(run);
  };

  const statusCounts = {
    all: runs.length,
    success: runs.filter(r => r.status === 'success' || r.status === 'completed').length,
    pending: runs.filter(r => r.status === 'pending').length,
    processing: runs.filter(r => r.status === 'processing').length,
    failed: runs.filter(r => r.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">Runs</h1>
          <p className="page-subtitle">
            {runs.length} total runs
            {autoRefresh && <span className="text-primary-300 ml-2">• Auto-refreshing</span>}
          </p>
        </div>
        <div className="page-actions">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            aria-pressed={autoRefresh}
            className={`btn-secondary ${autoRefresh ? 'text-primary-300' : 'text-slate-400'}`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} style={autoRefresh ? { animationDuration: '3s' } : {}} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Play className="h-4 w-4" /> New Run
          </button>
        </div>
      </div>

      {/* Search + status filters */}
      <div className="toolbar glass-card animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="search-field">
          <Search />
          <input
            type="text"
            placeholder="Search by model, run ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark"
            aria-label="Search runs"
          />
        </div>
        <div className="chip-group">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className="filter-chip"
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Runs Table */}
      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Model</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j}><div className="h-4 skeleton rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className="empty-note py-6">
                      {searchQuery || statusFilter !== 'all' ? 'No matching runs found' : 'No runs yet. Create one to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <span className="font-mono text-xs text-slate-400">{run.id?.slice(0, 8)}...</span>
                    </td>
                    <td>
                      <span className="font-medium text-white">{run.model || '—'}</span>
                    </td>
                    <td>
                      <StatusBadge status={run.status} />
                    </td>
                    <td>
                      {run.latency_ms ? (
                        <span className="font-mono text-xs text-slate-300">{run.latency_ms}ms</span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs text-slate-400">
                        {run.created_at ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true }) : '—'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => viewRunDetail(run)}
                        className="btn-ghost btn-sm"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== CREATE RUN MODAL ===== */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setSubmitResult(null); }} title="Create New Run" size="lg">
        <form onSubmit={handleCreateRun} className="space-y-5">
          {/* Prompt Selector */}
          <div>
            <label className="field-label">Select Prompt</label>
            <select
              value={selectedPromptId}
              onChange={(e) => {
                setSelectedPromptId(e.target.value);
                setFormData({ ...formData, prompt_version_id: '' });
              }}
              className="input-dark w-full"
            >
              <option value="">Choose a prompt...</option>
              {prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Version Selector */}
          {selectedPromptId && versions.length > 0 && (
            <div>
              <label className="field-label">Select Version</label>
              <select
                value={formData.prompt_version_id}
                onChange={(e) => setFormData({ ...formData, prompt_version_id: e.target.value })}
                className="input-dark w-full"
                required
              >
                <option value="">Choose a version...</option>
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.version} {v.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Or manual ID */}
          {!selectedPromptId && (
            <div>
              <label className="field-label">Prompt Version ID</label>
              <input
                type="text"
                value={formData.prompt_version_id}
                onChange={(e) => setFormData({ ...formData, prompt_version_id: e.target.value })}
                className="input-dark w-full font-mono"
                required
                placeholder="UUID..."
              />
            </div>
          )}

          {/* Provider + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Provider</label>
              {catalogLoading ? (
                <div className="input-dark w-full flex items-center gap-2 text-slate-500">
                  <Loader className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="input-dark w-full"
                >
                  {Object.keys(catalog).length === 0 && (
                    <option value="">No providers available</option>
                  )}
                  {Object.keys(catalog).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="field-label">Model</label>
              {catalogLoading ? (
                <div className="input-dark w-full flex items-center gap-2 text-slate-500">
                  <Loader className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <select
                  value={modelSlug}
                  onChange={(e) => setModelSlug(e.target.value)}
                  className="input-dark w-full"
                  disabled={(catalog[provider] || []).length === 0}
                >
                  {(catalog[provider] || []).length === 0 && (
                    <option value="">Select provider first</option>
                  )}
                  {(catalog[provider] || []).map(m => (
                    <option key={m.slug} value={m.slug}>
                      {m.display_name || m.slug}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Input Variables */}
          <div>
            <label className="field-label">Input Variables (JSON)</label>
            <textarea
              value={formData.input_data}
              onChange={(e) => setFormData({ ...formData, input_data: e.target.value })}
              className="input-dark w-full font-mono"
              rows={6}
              required
            />
          </div>

          {/* Result */}
          {submitResult && (
            <div className={`border rounded-xl p-4 ${
              submitResult.type === 'error' ? 'alert-error' : 'alert-success'
            }`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                {submitResult.type === 'error' ? (
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <span>{submitResult.message}</span>
              </div>
              {submitResult.finalStatus && (
                <div className="mt-3">
                  <p className="label-caps mb-1.5">Result</p>
                  <pre className="code-block text-xs max-h-40 overflow-auto">
                    {JSON.stringify(submitResult.finalStatus.result || submitResult.finalStatus, null, 2)}
                  </pre>
                </div>
              )}
              {!submitResult.finalStatus && submitResult.type === 'success' && (
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                  <Loader className="h-3 w-3 animate-spin" /> Waiting for result...
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting || !modelSlug} className="btn-primary">
              {submitting ? <><Loader className="h-4 w-4 animate-spin" /> Running...</> : <><Play className="h-4 w-4" /> Run Prompt</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ===== RUN DETAIL MODAL ===== */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Run Details" size="lg">
        {runDetail && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-4">
                <p className="label-caps mb-1.5">Run ID</p>
                <p className="text-sm font-mono text-white break-all">{runDetail.id}</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="label-caps mb-1.5">Status</p>
                <StatusBadge status={runDetail.status} />
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="label-caps mb-1.5">Model</p>
                <p className="text-sm text-white">{runDetail.model || '—'}</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="label-caps mb-1.5">Latency</p>
                <p className="text-sm font-mono text-white">{runDetail.latency_ms ? `${runDetail.latency_ms}ms` : '—'}</p>
              </div>
            </div>

            {runDetail.output && (
              <div>
                <p className="field-label">Output</p>
                <pre className="code-block text-xs max-h-60 overflow-auto">
                  {typeof runDetail.output === 'object' ? JSON.stringify(runDetail.output, null, 2) : runDetail.output}
                </pre>
              </div>
            )}

            {runDetail.error && (
              <div>
                <p className="field-label text-red-300">Error</p>
                <pre className="code-block text-xs border-red-500/20 max-h-40 overflow-auto text-red-300">
                  {runDetail.error}
                </pre>
              </div>
            )}

            <div className="text-xs text-slate-500">
              Created: {runDetail.created_at ? format(new Date(runDetail.created_at), 'yyyy-MM-dd HH:mm:ss') : '—'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RunPlayground;
