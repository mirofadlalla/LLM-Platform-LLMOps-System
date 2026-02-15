import React, { useState, useEffect } from 'react';
import { experimentService } from '../services/api';
import { Loader, CheckCircle, XCircle, Download } from 'lucide-react';
import Modal from './Modal';

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
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      ) : results ? (
        <div className="space-y-5">
          {/* Status */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Status</span>
              <span className={`badge ${
                results.status === 'completed' ? 'badge-success' :
                results.status === 'failed' ? 'badge-error' : 'badge-warning'
              }`}>
                {results.status}
              </span>
            </div>
          </div>

          {/* Results list */}
          {results.results?.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.results.map((r, i) => (
                <div key={r.id || i} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500">Version #{i + 1}</span>
                  </div>
                  
                  {/* Score Metrics */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-[10px] text-slate-500">Avg Score</p>
                      <p className={`text-sm font-bold ${
                        r.avg_score >= 0.8 ? 'text-emerald-400' : r.avg_score >= 0.5 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {r.avg_score != null ? (r.avg_score * 100).toFixed(0) + '%' : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-[10px] text-slate-500">Min</p>
                      <p className="text-sm font-bold text-orange-400">
                        {r.min_score != null ? (r.min_score * 100).toFixed(0) + '%' : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-[10px] text-slate-500">Max</p>
                      <p className="text-sm font-bold text-cyan-400">
                        {r.max_score != null ? (r.max_score * 100).toFixed(0) + '%' : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-xs">
                      <p className="text-slate-500">Hallucination</p>
                      <p className="font-semibold text-slate-300">{(r.avg_hallucination_rate * 100 || 0).toFixed(1)}%</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-slate-500">Failures</p>
                      <p className="font-semibold text-slate-300">{r.failure_count || 0}</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-slate-500">Total</p>
                      <p className="font-semibold text-slate-300">{r.total_examples || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">No results available yet</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button onClick={exportResults} className="btn-ghost text-xs flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button onClick={onClose} className="btn-primary">Close</button>
          </div>
        </div>
      ) : (
        <p className="text-center text-slate-500 py-10">No results available</p>
      )}
    </Modal>
  );
};

export default ExperimentResultsModal;
