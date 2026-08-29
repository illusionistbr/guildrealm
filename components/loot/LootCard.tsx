'use client';
import { useCountdown } from '@/lib/loot/hooks';
import { LootDoc } from '@/lib/loot/types';
import { cn } from '@/lib/admin/utils/cn';
import { Timer, Gavel, Ticket, Crown, Users } from 'lucide-react';

export function LootCard({ loot, onClick, highlightCharacterId }: { loot: LootDoc; onClick: () => void; highlightCharacterId?: string }) {
  const endsAt = loot.endsAt?.toDate ? loot.endsAt.toDate() : (loot.endsAt as any);
  const startsAt = loot.startsAt?.toDate ? loot.startsAt.toDate() : (loot.startsAt as any);
  const now = Date.now();
  const isActive = loot.status === 'ACTIVE' && startsAt.getTime() <= now && endsAt.getTime() > now;
  const isScheduled = loot.status === 'SCHEDULED' || startsAt.getTime() > now;
  const isFinished = loot.status === 'FINISHED' || loot.status === 'CANCELLED' || loot.status === 'PENDING_RESOLUTION';
  const { formatted, finished } = useCountdown(isActive ? endsAt : null);

  const isAuction = loot.type === 'AUCTION';
  const currentBid = loot.auction?.currentBid ?? 0;
  const bidCount = loot.auction?.bidCount ?? 0;
  const totalTickets = loot.raffle?.totalTickets ?? 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] overflow-hidden cursor-pointer hover:border-accent/30 transition-all group flex flex-col',
        isActive ? 'border-accent/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'border-[rgba(38,51,86,0.5)]',
      )}
    >
      <div className="relative h-36 bg-[#0a1122] overflow-hidden">
        {loot.item.image ? (
          <img src={loot.item.image} alt={loot.item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">{isAuction ? '🔨' : '🎲'}</div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={cn('text-[10px] px-2 py-1 rounded-full font-bold', isAuction ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30')}>
            {isAuction ? 'LEILÃO' : 'SORTEIO'}
          </span>
          <span className={cn('text-[10px] px-2 py-1 rounded-full font-bold', isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : isScheduled ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-muted/20 text-muted border border-[rgba(38,51,86,0.4)]')}>
            {isActive ? 'ATIVO' : isScheduled ? 'PRÓXIMO' : loot.status}
          </span>
        </div>
        {isActive && (
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded-full border border-accent/30 flex items-center gap-1 text-xs text-white">
            <Timer size={12} className="text-accent" /> {finished ? '00:00' : formatted}
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-white truncate group-hover:text-accent transition-colors">{loot.item.name}</h3>
        {loot.item.description && <p className="text-xs text-muted line-clamp-2">{loot.item.description}</p>}
        <div className="mt-auto grid grid-cols-2 gap-2 text-xs">
          {isAuction ? (
            <>
              <div className="rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.3)] p-2">
                <p className="text-[10px] text-muted">Maior lance</p>
                <p className="text-sm font-bold text-accent flex items-center gap-1"><Gavel size={12} /> {currentBid} DKP</p>
                <p className="text-[11px] text-muted truncate">{bidCount} lances</p>
              </div>
              <div className="rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.3)] p-2">
                <p className="text-[10px] text-muted">Termina em</p>
                <p className="text-sm font-bold text-white">{isActive ? (finished ? '00:00' : formatted) : isScheduled ? 'Agendado' : 'Encerrado'}</p>
                {loot.auction?.highestBidderId && <p className="text-[11px] text-muted truncate flex items-center gap-1"><Crown size={10} /> {loot.auction.highestBidderId.slice(0,8)}</p>}
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.3)] p-2">
                <p className="text-[10px] text-muted">Custo/ticket</p>
                <p className="text-sm font-bold text-accent flex items-center gap-1"><Ticket size={12} /> {loot.raffle?.entryCost} DKP</p>
                <p className="text-[11px] text-muted">{totalTickets} tickets</p>
              </div>
              <div className="rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.3)] p-2">
                <p className="text-[10px] text-muted">Vencedor</p>
                <p className="text-sm font-bold text-white truncate">{loot.raffle?.winnerId ? loot.raffle.winnerId.slice(0,8) : isActive ? '—' : '—'}</p>
                <p className="text-[11px] text-muted flex items-center gap-1"><Users size={10} /> {isActive ? formatted : 'Encerrado'}</p>
              </div>
            </>
          )}
        </div>
        <button className="mt-2 w-full h-9 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs font-medium hover:bg-accent hover:text-white transition-colors">VER {isAuction ? 'LEILÃO' : 'SORTEIO'}</button>
      </div>
    </div>
  );
}
