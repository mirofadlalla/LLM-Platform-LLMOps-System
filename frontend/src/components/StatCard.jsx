import React from 'react';

// Headline metric card - used on Dashboard and Analytics.
const StatCard = ({ title, value, icon: Icon, color, trend, trendColor, delay }) => (
  <div className={`glass-card rounded-2xl p-5 ${delay ? `animate-fade-in opacity-0 ${delay}` : ''}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="label-caps">{title}</p>
        <p className="text-2xl font-bold text-white mt-2 truncate">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 font-medium ${trendColor || 'text-slate-400'}`}>{trend}</p>
        )}
      </div>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </div>
);

export default StatCard;
