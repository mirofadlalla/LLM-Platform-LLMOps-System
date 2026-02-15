import React, { useState, useEffect } from 'react';
import { evaluationService } from '../services/api';
import { CheckCircle, XCircle, RefreshCw, BarChart3, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import Modal from './Modal';

const EvaluationResults = ({ promptId, versionId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && promptId && versionId) {
      runEvaluation();
    }
  }, [isOpen, promptId, versionId]);

  const runEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await evaluationService.run(promptId, versionId);
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.friendlyMessage || 'Failed to run evaluation');
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = async () => {
    setEvaluating(true);
    setError(null);
    try {
      const data = await evaluationService.run(promptId, versionId);
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.friendlyMessage || 'Failed to run evaluation');
    } finally {
      setEvaluating(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-emerald-400';
    if (score >= 0.5) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 0.8) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 0.5) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const exportResults = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `evaluation-${versionId}.json`; a.click();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Evaluation Results" size="lg">
      <div className="space-y-5">
        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleRerun}
            disabled={evaluating}
            className="btn-primary text-xs flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            {evaluating ? 'Running...' : 'Re-Run Evaluation'}
          </button>
          {results && (
            <button onClick={exportResults} className="btn-ghost text-xs flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary-400 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Running evaluation against golden examples...</p>
          </div>
        )}

        {/* Results */}
        {!loading && results && (
          <div className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-card rounded-xl p-4 border">
                <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">Total Tests</p>
                <p className="text-2xl font-bold text-white">{results.total_tests || 0}</p>
              </div>
              <div className={`rounded-xl p-4 border ${getScoreBg(results.average_score || 0)}`}>
                <p className={`text-[11px] uppercase font-semibold mb-1 ${getScoreColor(results.average_score || 0)}`}>Avg Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(results.average_score || 0)}`}>
                  {results.average_score ? (results.average_score * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="glass-card rounded-xl p-4 border">
                <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">Rating</p>
                <p className="text-2xl font-bold text-white">
                  {results.average_score >= 0.8 ? '🟢' : results.average_score >= 0.5 ? '🟡' : '🔴'}
                </p>
              </div>
            </div>

            {/* Visual Indicator */}
            <div className="flex items-center justify-center py-6">
              {results.average_score >= 0.8 ? (
                <div className="flex items-center gap-3 text-emerald-400">
                  <CheckCircle className="h-12 w-12" />
                  <div>
                    <span className="text-lg font-bold block">Excellent Performance!</span>
                    <span className="text-xs text-emerald-500">Score above 80% threshold</span>
                  </div>
                </div>
              ) : results.average_score >= 0.5 ? (
                <div className="flex items-center gap-3 text-amber-400">
                  <BarChart3 className="h-12 w-12" />
                  <div>
                    <span className="text-lg font-bold block">Good Performance</span>
                    <span className="text-xs text-amber-500">Consider improving template</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-red-400">
                  <XCircle className="h-12 w-12" />
                  <div>
                    <span className="text-lg font-bold block">Needs Improvement</span>
                    <span className="text-xs text-red-500">Review and revise template</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && !results && !error && (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Click "Re-Run Evaluation" to test this version</p>
          </div>
        )}

        {/* Close */}
        <div className="flex justify-end pt-3 border-t border-white/5">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </Modal>
  );
};

export default EvaluationResults;
