import React, { useState, useEffect } from 'react';
import { runApiService } from '../services/api';
import { Play, Loader, CheckCircle, XCircle } from 'lucide-react';
import Modal from './Modal';

const RunPromptModal = ({ isOpen, onClose, prompt, version }) => {
  const [variables, setVariables] = useState('{}');
  const [model, setModel] = useState('gpt-4o');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [taskId, setTaskId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setResult(null);
      setError('');
      setTaskId(null);
      if (version?.template) {
        const matches = version.template.match(/\{([^}]+)\}/g);
        if (matches) {
          const vars = {};
          matches.forEach(m => { vars[m.slice(1, -1)] = ''; });
          setVariables(JSON.stringify(vars, null, 2));
        }
      }
    }
  }, [isOpen, version]);

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
        } catch (err) { /* transient error, keep polling */ }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [status, taskId]);

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
        model,
      });

      setTaskId(res.task_id || res.run_id);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to start run');
      setStatus('failed');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Run: ${prompt?.name} (${version?.version})`} size="lg">
      <div className="space-y-4">
        {/* Template Preview */}
        {version?.template && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Template</label>
            <pre className="code-block text-xs max-h-24 overflow-auto">{version.template}</pre>
          </div>
        )}

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="input-dark w-full">
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
          </select>
        </div>

        {/* Variables */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Variables (JSON)</label>
          <textarea
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            className="input-dark w-full font-mono text-sm"
            rows={5}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 flex items-center gap-2">
            <XCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Status indicator */}
        {(status === 'pending' || status === 'processing') && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-300 flex items-center gap-2">
            <Loader className="h-4 w-4 animate-spin flex-shrink-0" />
            {status === 'pending' ? 'Queued, waiting for processing...' : 'Processing...'}
          </div>
        )}

        {/* Success */}
        {status === 'success' && result && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300 mb-2">
              <CheckCircle className="h-4 w-4" /> Success
            </div>
            <pre className="code-block text-xs max-h-40 overflow-auto">
              {typeof result === 'object' ? JSON.stringify(result, null, 2) : result}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button
            onClick={handleRun}
            disabled={status === 'pending' || status === 'processing'}
            className="btn-primary flex items-center gap-2"
          >
            {status === 'pending' || status === 'processing' ? (
              <><Loader className="h-4 w-4 animate-spin" /> Running...</>
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
