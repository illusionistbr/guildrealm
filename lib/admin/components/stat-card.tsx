import { cn } from '@/lib/admin/utils/cn';

type StatCardProps = {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
};

export function StatCard({ label, value, change, trend = 'neutral', icon }: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-muted',
  };

  return (
    <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-5 hover:border-[rgba(168,100,255,0.3)] transition-all group">
      <div className="flex items-start justify-between">
        <p className="text-muted text-xs font-medium uppercase tracking-wider">{label}</p>
        {icon && <div className="text-accent/60 group-hover:text-accent transition-colors">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-2xl font-heading font-bold text-white">{value}</span>
        {change && (
          <span className={cn('text-sm font-medium', trendColors[trend])}>{change}</span>
        )}
      </div>
    </div>
  );
}
