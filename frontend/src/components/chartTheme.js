// Shared Recharts styling so every chart in the app looks the same.
// Colours come from CSS variables (see index.css) so charts follow the light/dark theme.

export const chartTooltipStyle = {
  background: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: '10px',
  color: 'var(--text-body)',
};

export const chartAxisTick = { fill: 'var(--chart-axis)', fontSize: 12 };
export const chartGridStroke = 'var(--chart-grid)';

// Series colours (violet, cyan, amber, red, green, pink) - readable on both themes
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
