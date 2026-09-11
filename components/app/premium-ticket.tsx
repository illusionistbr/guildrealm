'use client';

import Link from 'next/link';
import { Crown, Gem, Sparkles, ArrowUpCircle } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';
import type { UserPlanState } from '@/lib/premium/use-user-plan';

/**
 * Ticket de plano exibido abaixo de "Configurações".
 * - free: "Plano Grátis, faça upgrade agora!"
 * - elite/conquistador: countdown "X dias de Elite restantes"
 */
export function PremiumTicket({ planState }: { planState: UserPlanState }) {
  const { loading, planId, plan, remainingDays } = planState;

  if (loading) {
    return (
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6 animate-pulse">
        <div className="h-5 w-48 rounded bg-[rgba(38,51,86,0.4)]" />
      </div>
    );
  }

  if (planId === 'free') {
    return (
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="w-11 h-11 rounded-xl bg-[rgba(38,51,86,0.4)] border border-[rgba(38,51,86,0.5)] flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-muted" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-heading font-bold">
              Plano Grátis
            </p>
            <p className="text-sm text-muted mt-0.5">
              Faça upgrade agora e libere até 100 membros, VOD, loot &amp; DKP,
              webhook do Discord e auditoria!
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
              <span className="px-2 py-1 rounded-lg bg-[rgba(38,51,86,0.3)] text-muted">
                1 guild • 50 membros
              </span>
              <span className="px-2 py-1 rounded-lg bg-[rgba(38,51,86,0.3)] text-muted">
                Grupos + Calendário
              </span>
            </div>
          </div>
          <Link
            href="/app/promotions"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors shrink-0"
          >
            <ArrowUpCircle size={16} /> Fazer upgrade
          </Link>
        </div>
      </div>
    );
  }

  const isElite = planId === 'elite';
  const Icon = isElite ? Gem : Crown;
  const days = remainingDays;

  return (
    <div
      className={cn(
        'rounded-xl border p-6',
        isElite
          ? 'border-violet-500/30 bg-gradient-to-br from-violet-950/40 to-[rgba(10,18,32,0.4)]'
          : 'border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-[rgba(10,18,32,0.4)]',
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <span
          className={cn(
            'w-11 h-11 rounded-xl border flex items-center justify-center shrink-0',
            isElite
              ? 'bg-violet-500/15 border-violet-500/30'
              : 'bg-amber-500/15 border-amber-500/30',
          )}
        >
          <Icon size={20} className={isElite ? 'text-violet-300' : 'text-amber-300'} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-heading font-bold">
            Plano {plan.label}{' '}
            {typeof days === 'number' && (
              <span className={cn('text-sm font-medium', isElite ? 'text-violet-300' : 'text-amber-300')}>
                — {days} {days === 1 ? 'dia' : 'dias'} de {plan.label} restantes
              </span>
            )}
            {days === null && (
              <span className={cn('text-sm font-medium', isElite ? 'text-violet-300' : 'text-amber-300')}>
                — ativo
              </span>
            )}
          </p>
          <p className="text-sm text-muted mt-0.5">
            {isElite
              ? '1 guild com 100 membros e todos os recursos liberados.'
              : 'Até 5 guilds com 100 membros cada e todos os recursos liberados.'}
            {' '}O premium vale para você — todos os seus personagens têm os benefícios.
          </p>
        </div>
        {!isElite ? null : (
          <Link
            href="/app/promotions"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-violet-500/30 text-violet-200 text-sm hover:bg-violet-500/10 transition-colors shrink-0"
          >
            <Crown size={16} /> Conhecer Conquistador
          </Link>
        )}
      </div>
    </div>
  );
}
