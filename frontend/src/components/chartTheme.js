// Shared Recharts styling so every chart in the app looks the same.
// Values mirror the global `.recharts-*` overrides in index.css.

export const chartTooltipStyle = {
  background: 'rgba(15,23,42,0.95)',
  border: '1px solid rgba(139,92,246,0.2)',
  borderRadius: '10px',
  color: '#e2e8f0',
};

export const chartAxisTick = { fill: '#94a3b8', fontSize: 12 };
export const chartGridStroke = 'rgba(51,65,85,0.3)';

// Series colours (violet, cyan, amber, red, green, pink)
export const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

// Run-status colours - match the StatusBadge palette
export const STATUS_COLORS = {
  success: '#34d399',
  completed: '#34d399',
  failed: '#f87171',
  pending: '#fbbf24',
  processing: '#60a5fa',
  running: '#60a5fa',
};
