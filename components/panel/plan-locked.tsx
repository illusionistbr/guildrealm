'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

/** Banner padrão para recurso bloqueado pelo plano da guild. */
export function PlanLocked({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-[rgba(10,18,32,0.4)] p-8 flex flex-col items-center text-center">
      <span className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
        <Lock size={20} className="text-amber-300" />
      </span>
      <p className="text-white font-heading font-bold">{title}</p>
      <p className="text-sm text-muted mt-1 max-w-md">{description}</p>
      <Link
        href="/app/settings"
        className="mt-4 inline-flex items-center px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
      >
        Ver planos premium
      </Link>
    </div>
  );
}
