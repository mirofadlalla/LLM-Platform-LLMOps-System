import React from 'react';

const STYLES = {
  success: 'badge-success',
  completed: 'badge-success',
  failed: 'badge-error',
  pending: 'badge-warning',
  processing: 'badge-info',
  running: 'badge-info',
};

const DOTS = {
  success: 'bg-emerald-400',
  completed: 'bg-emerald-400',
  failed: 'bg-red-400',
  pending: 'bg-amber-400 animate-pulse',
};

const StatusBadge = ({ status }) => (
  <span className={`badge capitalize ${STYLES[status] || 'badge-neutral'}`}>
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOTS[status] || 'bg-blue-400 animate-pulse'}`} />
    {status}
  </span>
);

export default StatusBadge;
