import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: React.ReactNode;
  badge?: {
    text: string;
    variant: 'positive' | 'negative' | 'neutral' | 'info';
  };
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle, badge }) => {
  return (
    <div className="bg-white p-5 rounded-2xl card-shadow border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${color} text-white shadow-sm shrink-0`}>
            {icon}
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        </div>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
            badge.variant === 'positive' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            badge.variant === 'negative' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            badge.variant === 'info' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {badge.text}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
        {subtitle && (
          <div className="mt-1.5 text-xs text-slate-400 font-medium flex items-center gap-1.5">{subtitle}</div>
        )}
      </div>
    </div>
  );
};

export const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};
