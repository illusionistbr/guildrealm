import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-muted mb-4">
        {icon ?? <Inbox size={48} className="opacity-30" />}
      </div>
      <h3 className="text-white font-heading font-bold text-lg mb-1">{title}</h3>
      {description && <p className="text-muted text-sm max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
