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
      <div className="space-y-5">
        {/* Template Preview */}
        {version?.template && (
          <div>
            <label className="field-label">Template</label>
            <pre className="code-block text-xs max-h-24 overflow-auto">{version.template}</pre>
          </div>
        )}

        {/* Model Selection */}
        <div>
          <label className="field-label">Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="input-dark w-full">
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
          </select>
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
            <XCircle /> {error}
          </div>
        )}

        {/* Status indicator */}
        {(status === 'pending' || status === 'processing') && (
          <div className="alert alert-info" role="status">
            <Loader className="animate-spin" />
            {status === 'pending' ? 'Queued, waiting for processing...' : 'Processing...'}
          </div>
        )}

        {/* Success */}
        {status === 'success' && result && (
          <div className="alert-success border rounded-xl p-4">
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
            disabled={status === 'pending' || status === 'processing'}
            className="btn-primary"
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
