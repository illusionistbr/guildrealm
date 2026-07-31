import { cn } from '@/lib/admin/utils/cn';

type StatusBadgeProps = {
  status: string;
  variant?: 'emerald' | 'yellow' | 'red' | 'blue' | 'muted';
  className?: string;
};

const variantStyles: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400',
  yellow: 'bg-yellow-500/10 text-yellow-400',
  red: 'bg-red-500/10 text-red-400',
  blue: 'bg-blue-500/10 text-blue-400',
  muted: 'bg-muted/10 text-muted',
};

export function StatusBadge({ status, variant = 'muted', className }: StatusBadgeProps) {
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', variantStyles[variant], className)}>
      {status}
    </span>
  );
}
