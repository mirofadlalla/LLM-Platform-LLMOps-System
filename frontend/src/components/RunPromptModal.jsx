import React, { useState, useEffect } from 'react';
import { runApiService, modelsService } from '../services/api';
import { Play, Loader, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import Modal from './Modal';

/**
 * RunPromptModal
 *
 * Fetches available providers and models from GET /models (the real backend
 * catalog) instead of hardcoding model names.
 *
 * Provider + model selection is now a two-step dropdown:
 *   1. Choose provider  (groq | huggingface | ...)
 *   2. Choose model     (populated from backend registry)
 */
const RunPromptModal = ({ isOpen, onClose, prompt, version }) => {
  const [variables, setVariables] = useState('{}');

  // Provider / model state — loaded from backend
  const [catalog, setCatalog]     = useState({});  // { groq: [{slug, display_name}], ... }
  const [provider, setProvider]   = useState('');
  const [modelSlug, setModelSlug] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error,  setError]  = useState('');
  const [taskId, setTaskId] = useState(null);

  // ── Load catalog once when modal opens ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Reset run state
    setStatus('idle');
    setResult(null);
    setError('');
    setTaskId(null);

    // Pre-fill variables from template
    if (version?.template) {
      const matches = version.template.match(/\{([^}]+)\}/g);
      if (matches) {
        const vars = {};
        matches.forEach(m => { vars[m.slice(1, -1)] = ''; });
        setVariables(JSON.stringify(vars, null, 2));
      } else {
        setVariables('{}');
      }
    }

    // Fetch provider catalog if not already loaded
    if (Object.keys(catalog).length === 0) {
      setCatalogLoading(true);
      modelsService.catalog()
        .then(data => {
          setCatalog(data);
          // Default to first provider / first model
          const firstProvider = Object.keys(data)[0] || '';
          setProvider(firstProvider);
          const firstModel = data[firstProvider]?.[0]?.slug || '';
          setModelSlug(firstModel);
        })
        .catch(() => {
          // Fallback — show empty, user can type manually
        })
        .finally(() => setCatalogLoading(false));
    }
  }, [isOpen, version]);

  // When provider changes, reset model to the first one in that provider
  useEffect(() => {
    if (provider && catalog[provider]) {
      setModelSlug(catalog[provider][0]?.slug || '');
    }
  }, [provider, catalog]);

  // ── Poll task status ───────────────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if ((status === 'pending' || status === 'processing') && taskId) {
      interval = setInterval(async () => {
        try {
          const res = await runApiService.getTaskStatus(taskId);
          if (res.status === 'success') {
            setStatus('success');
            setResult(res.result);
            clearInterval(interval);
          } else if (res.status === 'failed') {
            setStatus('failed');
            setError(res.error || 'Run failed');
            clearInterval(interval);
          } else if (res.status !== status) {
            setStatus(res.status);
          }
        } catch { /* transient — keep polling */ }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [status, taskId]);

  // ── Run ────────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    try {
      setStatus('pending');
      setError('');
      setResult(null);

      let parsed;
      try {
        parsed = JSON.parse(variables);
      } catch {
        setError('Invalid JSON in variables');
        setStatus('idle');
        return;
      }

      const res = await runApiService.create({
        prompt_version_id: version.id,
        variables: parsed,
        provider,
        model: modelSlug,
      });

      setTaskId(res.task_id || res.run_id);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to start run');
      setStatus('failed');
    }
  };

  if (!isOpen) return null;

  const providers = Object.keys(catalog);
  const models    = provider && catalog[provider] ? catalog[provider] : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Run: ${prompt?.name} (${version?.version})`} size="lg">
      <div className="space-y-5">
        {/* Template Preview */}
        {version?.template && (
          <div>
            <label className="field-label">Template</label>
            <pre className="code-block text-xs max-h-24 overflow-auto">{version.template}</pre>
          </div>
        )}

        {/* Provider + Model Selection */}
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
                {providers.length === 0 && (
                  <option value="">No providers available</option>
                )}
                {providers.map(p => (
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
                disabled={models.length === 0}
              >
                {models.length === 0 && (
                  <option value="">Select provider first</option>
                )}
                {models.map(m => (
                  <option key={m.slug} value={m.slug}>
                    {m.display_name || m.slug}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Variables */}
        <div>
          <label className="field-label">Variables (JSON)</label>
          <textarea
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            className="input-dark w-full font-mono"
            rows={5}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" role="alert">
            <XCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Status indicator */}
        {(status === 'pending' || status === 'processing') && (
          <div className="alert alert-info" role="status">
            <Loader className="animate-spin h-4 w-4" />
            {status === 'pending' ? 'Queued, waiting for processing…' : 'Processing…'}
          </div>
        )}

        {/* Success */}
        {status === 'success' && result && (
          <div className="alert-success border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-2">
              <CheckCircle className="h-4 w-4" /> Success
            </div>
            <pre className="code-block text-xs max-h-40 overflow-auto">
              {typeof result === 'object' ? JSON.stringify(result, null, 2) : result}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button
            onClick={handleRun}
            disabled={status === 'pending' || status === 'processing' || !modelSlug}
            className="btn-primary"
          >
            {status === 'pending' || status === 'processing' ? (
              <><Loader className="h-4 w-4 animate-spin" /> Running…</>
            ) : (
              <><Play className="h-4 w-4" /> Run</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RunPromptModal;
