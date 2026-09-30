import React, { useState, useEffect } from 'react';
import { experimentService } from '../services/api';
import { Loader, Download } from 'lucide-react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import ExperimentResultCard from './ExperimentResultCard';

const ExperimentResultsModal = ({ isOpen, onClose, experiment }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && experiment?.id) {
      fetchResults();
    }
  }, [isOpen, experiment]);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await experimentService.getStatus(experiment.id);
      setResults(data);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment-${experiment?.name || experiment?.id}.json`;
    a.click();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Experiment Results: ${experiment?.name}`} size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="h-8 w-8 animate-spin text-primary-400" />
        </div>
      ) : error ? (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      ) : results ? (
        <div className="space-y-6">
          {/* Status */}
          <div className="glass-card rounded-xl p-4">
            <p className="label-caps mb-2">Status</p>
            <StatusBadge status={results.status} />
          </div>

          {/* Results list */}
          {results.results?.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.results.map((r, i) => (
                <ExperimentResultCard key={r.id || i} result={r} index={i} />
              ))}
            </div>
          ) : (
            <p className="empty-note">No results available yet</p>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button onClick={exportResults} className="btn-ghost">
              <Download className="h-4 w-4" /> Export JSON
            </button>
            <button onClick={onClose} className="btn-secondary">Close</button>
          </div>
        </div>
      ) : (
        <p className="empty-note">No results available</p>
      )}
    </Modal>
  );
};

export default ExperimentResultsModal;
