import React, { useState, useEffect } from 'react';
import { goldenExampleService } from '../services/api';
import { Plus, Download, Upload } from 'lucide-react';
import Modal from './Modal';

const GoldenExamples = ({ promptId }) => {
  const [examples, setExamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inputData, setInputData] = useState('{}');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (promptId) fetchExamples();
  }, [promptId]);

  const fetchExamples = async () => {
    setLoading(true);
    try {
      const data = await goldenExampleService.list(promptId);
      setExamples(data || []);
    } catch (err) {
      console.error('Failed to fetch golden examples', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      let parsed;
      try {
        parsed = JSON.parse(inputData);
      } catch {
        setFormError('Input data must be valid JSON');
        setCreating(false);
        return;
      }

      await goldenExampleService.create(promptId, {
        input_data: parsed,
        expected_output: expectedOutput,
      });

      setShowCreateModal(false);
      setInputData('{}');
      setExpectedOutput('');
      fetchExamples();
    } catch (err) {
      setFormError('Failed to create example');
    } finally {
      setCreating(false);
    }
  };

  const exportExamples = () => {
    const blob = new Blob([JSON.stringify(examples, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golden-examples-${promptId}.json`;
    a.click();
  };

  const formatInput = (data) => {
    if (typeof data === 'string') {
      try { return JSON.stringify(JSON.parse(data), null, 2); } catch { return data; }
    }
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-ghost btn-sm text-primary-300"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
          {examples.length > 0 && (
            <button onClick={exportExamples} className="btn-ghost btn-sm">
              <Download className="h-3.5 w-3.5" /> Export JSON
            </button>
          )}
        </div>
        <span className="text-xs text-slate-500">{examples.length} example{examples.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="h-4 skeleton w-32 mx-auto rounded" />
        </div>
      ) : examples.length === 0 ? (
        <p className="empty-note">No golden examples yet</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {examples.map((example) => (
            <div key={example.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="label-caps mb-1.5">Input</p>
                  <pre className="code-block text-xs p-3">
                    {formatInput(example.input_data)}
                  </pre>
                </div>
                <div>
                  <p className="label-caps mb-1.5">Expected Output</p>
                  <p className="text-xs leading-relaxed text-slate-300 py-3">{example.expected_output}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Golden Example">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="field-label">Input Data (JSON)</label>
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              rows={4}
              className="input-dark w-full font-mono"
              placeholder='{"text": "Example input"}'
            />
          </div>
          <div>
            <label className="field-label">Expected Output</label>
            <textarea
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              rows={3}
              className="input-dark w-full"
              placeholder="The expected response..."
            />
          </div>

          {formError && (
            <div className="alert alert-error" role="alert">
              {formError}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Saving...' : 'Save Example'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GoldenExamples;
