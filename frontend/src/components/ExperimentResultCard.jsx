import React from 'react';

const pct = (value, digits = 0) =>
  value != null ? `${(value * 100).toFixed(digits)}%` : 'N/A';

const scoreTone = (score) =>
  score >= 0.8 ? 'text-emerald-400' : score >= 0.5 ? 'text-amber-400' : 'text-red-400';

const Metric = ({ label, value, className = '' }) => (
  <div className="metric-tile">
    <p className="metric-label">{label}</p>
    <p className={`metric-value ${className}`}>{value}</p>
  </div>
);

// One experiment result (a single prompt version) with its score metrics.
const ExperimentResultCard = ({ result, index }) => (
  <div className="glass-card rounded-xl p-4">
    <p className="text-sm font-semibold text-white mb-3">Version #{index + 1}</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <Metric label="Avg Score" value={pct(result.avg_score)} className={scoreTone(result.avg_score)} />
      <Metric label="Min" value={pct(result.min_score)} />
      <Metric label="Max" value={pct(result.max_score)} />
      <Metric label="Hallucination" value={pct(result.avg_hallucination_rate, 1)} />
      <Metric label="Failures" value={result.failure_count || 0} />
      <Metric label="Total Examples" value={result.total_examples || 0} />
    </div>
  </div>
);

export default ExperimentResultCard;
