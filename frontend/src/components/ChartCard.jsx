import React from 'react';

// Card shell for a single chart: title, subtitle, icon, fixed-height plot area.
const ChartCard = ({ title, subtitle, icon: Icon, iconClass = 'text-primary-400', delay, children }) => (
  <div className="glass-card rounded-2xl p-6 animate-fade-in" style={delay ? { animationDelay: delay } : undefined}>
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {Icon && <Icon className={`h-5 w-5 flex-shrink-0 ${iconClass}`} />}
    </div>
    <div className="h-64">{children}</div>
  </div>
);

export const ChartEmpty = () => (
  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
    No data available yet
  </div>
);

export default ChartCard;
