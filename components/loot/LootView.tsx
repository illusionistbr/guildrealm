'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, getFirebaseDb } from '@/lib/admin/firebase/client';
import { useLootList, useDkpBalances, useDkpHistory, useLootBids, useCountdown } from '@/lib/loot/hooks';
import { useLootSettings } from '@/lib/loot/hooks';
import { LootDoc } from '@/lib/loot/types';
import { LootCard } from './LootCard';
import { cn } from '@/lib/admin/utils/cn';
import { toast, Toaster } from 'sonner';
import { Gem, Gavel, Ticket, Plus, Coins, Clock, Trophy, History, Settings, Users, Loader2, X, Search } from 'lucide-react';

type Tab = 'active' | 'upcoming' | 'finished' | 'mydkp' | 'manageLoot' | 'manageDkp';

export function LootView({ guildId, guild, uid, isLeader, canCreateLoot, canManageDkp, canManageLootSettings, memberNames, memberMeta }: any) {
  const { loots, loading } = useLootList(guildId);
  const { balances } = useDkpBalances(guildId);
  const { settings } = useLootSettings(guildId);

  const [tab, setTab] = useState<Tab>('active');
  const [filterType, setFilterType] = useState<'ALL' | 'AUCTION' | 'RAFFLE'>('ALL');
  const [selectedLoot, setSelectedLoot] = useState<LootDoc | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // characters of current user in this guild
  const myCharacters = useMemo(() => {
    const ids = (guild?.members ?? []) as string[];
    return ids.filter((id: string) => memberMeta?.[id]?.ownerId === uid).map((id: string) => ({ id, name: memberNames[id] ?? id.slice(0,8), meta: memberMeta[id] }));
  }, [guild, memberMeta, memberNames, uid]);
  const [selectedChar, setSelectedChar] = useState<string>('');
  useEffect(() => { if (myCharacters.length && !selectedChar) setSelectedChar(myCharacters[0].id); }, [myCharacters, selectedChar]);

  const myBalance = useMemo(() => balances.find(b => b.characterId === selectedChar)?.dkpBalance ?? 0, [balances, selectedChar]);
  const { txs: myTxs } = useDkpHistory(guildId, selectedChar || undefined, 20);

  const filtered = useMemo(() => {
    const now = Date.now();
    return loots.filter(l => {
      if (filterType !== 'ALL' && l.type !== filterType) return false;
      const s = l.startsAt?.toMillis ? l.startsAt.toMillis() : new Date(l.startsAt as any).getTime();
      const e = l.endsAt?.toMillis ? l.endsAt.toMillis() : new Date(l.endsAt as any).getTime();
      if (tab === 'active') return l.status === 'ACTIVE' && s <= now && e > now;
      if (tab === 'upcoming') return l.status === 'SCHEDULED' || s > now;
      if (tab === 'finished') return ['FINISHED','CANCELLED','PENDING_RESOLUTION'].includes(l.status) || e <= now;
      return true; // for other tabs we still show? but those tabs don't use filtered
    });
  }, [loots, tab, filterType]);

  const stats = useMemo(() => {
    const now = Date.now();
    const activeAuctions = loots.filter(l => l.type==='AUCTION' && l.status==='ACTIVE' && l.startsAt.toMillis()<=now && l.endsAt.toMillis()>now).length;
    const activeRaffles = loots.filter(l => l.type==='RAFFLE' && l.status==='ACTIVE' && l.startsAt.toMillis()<=now && l.endsAt.toMillis()>now).length;
    const upcoming = loots.filter(l => l.status==='SCHEDULED').length;
    const totalDistributed = balances.reduce((a,b)=>a+b.dkpBalance,0);
    return { activeAuctions, activeRaffles, upcoming, totalDistributed, myBalance };
  }, [loots, balances, myBalance]);

  if (loading) return <div className="flex items-center justify-center py-16 text-muted"><Loader2 className="animate-spin mr-2"/>Carregando Loot & DKP...</div>;

  return (
    <div className="space-y-6">
      <Toaster richColors theme="dark" position="top-right" />
      <div>
        <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2"><Gem className="text-accent"/> Loot & DKP</h1>
        <p className="text-muted mt-1">Gerencie seu DKP, participe de leilões e concorra a itens da guilda.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-4">
          <p className="text-xs text-muted flex items-center gap-1"><Coins size={12}/> Meu saldo</p>
          <p className="text-2xl font-bold text-accent">{myBalance} DKP</p>
          {myCharacters.length>1 && (
            <select value={selectedChar} onChange={e=>setSelectedChar(e.target.value)} className="mt-2 w-full h-8 px-2 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded text-xs text-white">
              {myCharacters.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
        <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-4 text-center">
          <Gavel size={20} className="mx-auto text-amber-400 mb-1"/>
          <p className="text-xl font-bold text-white">{stats.activeAuctions}</p>
          <p className="text-xs text-muted">Leilões ativos</p>
        </div>
        <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-4 text-center">
          <Ticket size={20} className="mx-auto text-purple-400 mb-1"/>
          <p className="text-xl font-bold text-white">{stats.activeRaffles}</p>
          <p className="text-xs text-muted">Sorteios ativos</p>
        </div>
        <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-4 text-center">
          <Trophy size={20} className="mx-auto text-yellow-400 mb-1"/>
          <p className="text-xl font-bold text-white">{stats.totalDistributed}</p>
          <p className="text-xs text-muted">DKP total na guilda</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id:'active', label:'Ativos' },
          { id:'upcoming', label:'Próximos' },
          { id:'finished', label:'Encerrados' },
          { id:'mydkp', label:'Meu DKP' },
          ...(canCreateLoot ? [{ id:'manageLoot', label:'Gerenciar Loot'}] : []),
          ...(canManageDkp ? [{ id:'manageDkp', label:'Gerenciar DKP'}] : []),
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id as Tab)} className={cn('px-4 py-2 rounded-full text-xs font-medium border whitespace-nowrap', tab===t.id ? 'bg-accent border-accent text-white' : 'bg-[#0a1122] border-[rgba(38,51,86,0.5)] text-muted hover:text-white')}>{t.label}</button>
        ))}
      </div>

      {/* Filters (only for loot lists) */}
      {(tab==='active'||tab==='upcoming'||tab==='finished') && (
        <div className="flex gap-2">
          {(['ALL','AUCTION','RAFFLE'] as const).map(v=> (
            <button key={v} onClick={()=>setFilterType(v)} className={cn('px-3 py-1.5 rounded-lg text-xs border', filterType===v ? 'bg-accent/15 border-accent/30 text-accent' : 'border-[rgba(38,51,86,0.4)] text-muted')}>{v==='ALL'?'Todos':v==='AUCTION'?'Leilões':'Sorteios'}</button>
          ))}
          {canCreateLoot && <button onClick={()=>setShowCreate(true)} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs hover:bg-accent-hover"><Plus size={12}/> Criar Loot</button>}
        </div>
      )}

      {/* Content */}
      {tab==='mydkp' ? (
        <MyDkpView characterId={selectedChar} guildId={guildId} balances={balances} txs={myTxs} myCharacters={myCharacters} selectedChar={selectedChar} onSelect={setSelectedChar} />
      ) : tab==='manageLoot' ? (
        <ManageLootView guildId={guildId} loots={loots} onCreated={()=>{setTab('active');}} />
      ) : tab==='manageDkp' ? (
        <ManageDkpView guildId={guildId} members={guild?.members ?? []} memberNames={memberNames} memberMeta={memberMeta} balances={balances} />
      ) : (
        filtered.length===0 ? (
          <div className="rounded-xl border border-dashed border-[rgba(38,51,86,0.4)] p-8 text-center text-muted">
            <Gem size={28} className="mx-auto mb-2 text-accent/50"/> Nenhum loot disponível no momento. Quando novos leilões ou sorteios forem criados, eles aparecerão aqui.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(l=> <LootCard key={l.id} loot={l} onClick={()=>setSelectedLoot(l)} />)}
          </div>
        )
      )}

      {selectedLoot && <LootDetailModal loot={selectedLoot} guildId={guildId} myCharacterId={selectedChar} myCharacters={myCharacters} onSelectChar={setSelectedChar} onClose={()=>setSelectedLoot(null)} memberNames={memberNames} balances={balances} />}
      {showCreate && <CreateLootModal guildId={guildId} onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false); toast.success('Loot criado!');}} />}
    </div>
  );
}

function MyDkpView({ characterId, guildId, balances, txs, myCharacters, selectedChar, onSelect }: any) {
  const bal = balances.find((b:any)=>b.characterId===characterId)?.dkpBalance ?? 0;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6 text-center">
        <p className="text-xs text-muted">💎 SALDO ATUAL</p>
        <p className="text-3xl font-black text-accent">{bal} DKP</p>
        {myCharacters.length>1 && (
          <select value={selectedChar} onChange={e=>onSelect(e.target.value)} className="mt-3 h-9 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white">
            {myCharacters.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><History size={14} className="text-accent"/> Últimas movimentações</h3>
        {txs.length===0 ? <p className="text-xs text-muted text-center py-6">Nenhuma movimentação ainda.</p> : (
          <div className="space-y-2">
            {txs.map((t:any)=> (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-[#0a1122] border border-[rgba(38,51,86,0.3)]">
                <div>
                  <p className={cn('text-sm font-bold', t.amount>=0 ? 'text-emerald-400' : 'text-red-400')}>{t.amount>0?'+':''}{t.amount} DKP</p>
                  <p className="text-xs text-muted truncate max-w-[220px]">{t.description}</p>
                  <p className="text-[11px] text-muted">{t.type} • {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleString('pt-BR') : ''}</p>
                </div>
                <span className="text-xs text-muted">{t.balanceAfter} DKP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ManageLootView({ guildId, loots, onCreated }: any) {
  const [filter, setFilter] = useState('');
  const filtered = loots.filter((l:any)=> !filter || l.item.name.toLowerCase().includes(filter.toLowerCase()));
  const cancel = async (id:string)=>{
    try{ const fn=httpsCallable(getFunctions(getFirebaseApp()),'cancelLoot'); await fn({guildId, lootId:id}); toast.success('Loot cancelado'); } catch(e:any){ toast.error(e.message); }
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar item..." className="w-full h-9 pl-9 pr-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted"/></div>
      </div>
      <div className="space-y-2">
        {filtered.map((l:any)=> (
          <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122]">
            <span className="text-sm text-white flex-1 truncate">{l.item.name} <span className="text-xs text-muted">({l.type}) {l.status}</span></span>
            {['ACTIVE','SCHEDULED'].includes(l.status) && <button onClick={()=>cancel(l.id)} className="px-3 py-1 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10">Cancelar</button>}
          </div>
        ))}
        {filtered.length===0 && <p className="text-sm text-muted text-center py-6">Nenhum loot encontrado.</p>}
      </div>
    </div>
  );
}

function ManageDkpView({ guildId, members, memberNames, memberMeta, balances }: any) {
  const [selected, setSelected] = useState<string>(members[0] ?? '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [op, setOp] = useState<'add'|'remove'>('add');
  const [loading, setLoading] = useState(false);
  const submit = async ()=>{
    if(!selected || !amount || !reason) return toast.error('Preencha todos os campos');
    setLoading(true);
    try{
      const fn=httpsCallable(getFunctions(getFirebaseApp()),'manageDkp');
      await fn({ guildId, characterId:selected, amount:Number(amount), reason, operation:op });
      toast.success('DKP atualizado!');
      setAmount(''); setReason('');
    } catch(e:any){ toast.error(e.message); }
    setLoading(false);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-4 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Users size={14}/> Gerenciar DKP por character</h3>
        <select value={selected} onChange={e=>setSelected(e.target.value)} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white">
          {members.map((id:string)=> <option key={id} value={id}>{memberNames[id] ?? id.slice(0,8)} — {balances.find((b:any)=>b.characterId===id)?.dkpBalance ?? 0} DKP</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <select value={op} onChange={e=>setOp(e.target.value as any)} className="h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white">
            <option value="add">Adicionar</option>
            <option value="remove">Remover</option>
          </select>
          <input type="number" placeholder="Qtd" value={amount} onChange={e=>setAmount(e.target.value)} className="h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" />
          <button onClick={submit} disabled={loading} className="h-10 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">{loading&&<Loader2 size={12} className="animate-spin"/>} Confirmar</button>
        </div>
        <input placeholder="Motivo" value={reason} onChange={e=>setReason(e.target.value)} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {members.map((id:string)=> {
          const bal=balances.find((b:any)=>b.characterId===id);
          return <div key={id} className="p-3 rounded-lg border border-[rgba(38,51,86,0.3)] bg-[rgba(10,18,32,0.4)] flex items-center justify-between"><span className="text-sm text-white truncate">{memberNames[id]??id.slice(0,8)}</span><span className="text-sm font-bold text-accent">{bal?.dkpBalance??0} DKP</span></div>;
        })}
      </div>
    </div>
  );
}

function LootDetailModal({ loot, guildId, myCharacterId, myCharacters, onSelectChar, onClose, memberNames, balances }: any) {
  const [amount, setAmount] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'bid'|'history'|'tickets'>('bid');
  const { bids } = useLootBids(guildId, loot.id);
  const myBal = balances.find((b:any)=>b.characterId===myCharacterId)?.dkpBalance ?? 0;
  const isAuction = loot.type==='AUCTION';
  const currentBid = loot.auction?.currentBid ?? loot.auction?.startingBid ?? 0;
  const minInc = loot.auction?.minimumIncrement ?? 10;
  const nextMin = isAuction ? (loot.auction?.bidCount===0 ? loot.auction?.startingBid : currentBid + minInc) : 0;

  const handleBid = async ()=>{
    if(!myCharacterId) return toast.error('Selecione um character');
    const val=Number(amount);
    if(val < nextMin) return toast.error(`Lance mínimo ${nextMin} DKP`);
    setLoading(true);
    try{ const fn=httpsCallable(getFunctions(getFirebaseApp()),'placeBid'); await fn({guildId, lootId:loot.id, characterId:myCharacterId, amount:val}); toast.success('Lance realizado!'); setAmount(''); } catch(e:any){ toast.error(e.message);} setLoading(false);
  };
  const handleBuy = async ()=>{
    if(!myCharacterId) return toast.error('Selecione um character');
    setLoading(true);
    try{ const fn=httpsCallable(getFunctions(getFirebaseApp()),'purchaseRaffleTickets'); await fn({guildId, lootId:loot.id, characterId:myCharacterId, quantity:qty}); toast.success(`${qty} ticket(s) comprados!`);} catch(e:any){ toast.error(e.message);} setLoading(false);
  };

  const endsAt = loot.endsAt?.toDate ? loot.endsAt.toDate() : new Date(loot.endsAt);
  const { formatted, finished } = useCountdown(loot.status==='ACTIVE' ? endsAt : null);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6 max-h-[90vh] overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#050912] border border-[rgba(38,51,86,0.4)]">{loot.item.image ? <img src={loot.item.image} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-2xl">{isAuction?'🔨':'🎲'}</div>}</div>
            <div>
              <h2 className="text-lg font-bold text-white">{loot.item.name}</h2>
              <p className="text-xs text-muted">{loot.item.description}</p>
              <div className="flex gap-1 mt-1"><span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">{loot.type}</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/10 text-muted">{loot.status}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-white"><X size={18}/></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-[#050912] border border-[rgba(38,51,86,0.3)] p-3">
            <p className="text-[11px] text-muted">Seu DKP</p>
            <p className="text-lg font-bold text-accent">{myBal} DKP</p>
            {myCharacters.length>1 && <select value={myCharacterId} onChange={e=>onSelectChar(e.target.value)} className="mt-2 w-full h-8 px-2 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded text-xs text-white">{myCharacters.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}
          </div>
          <div className="rounded-lg bg-[#050912] border border-[rgba(38,51,86,0.3)] p-3">
            <p className="text-[11px] text-muted flex items-center gap-1"><Clock size={10}/> Tempo restante</p>
            <p className="text-lg font-bold text-white">{finished?'00:00':formatted}</p>
            <p className="text-xs text-muted">Fim: {endsAt.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {isAuction ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-[#050912] border border-[rgba(38,51,86,0.3)] p-3 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted">Lance atual</p><p className="font-bold text-accent">{currentBid} DKP</p></div>
              <div><p className="text-xs text-muted">Próximo mínimo</p><p className="font-bold text-white">{nextMin} DKP</p></div>
              <div><p className="text-xs text-muted">Maior apostador</p><p className="text-white truncate">{loot.auction?.highestBidderId ? (memberNames[loot.auction.highestBidderId] ?? loot.auction.highestBidderId.slice(0,8)) : '—'}</p></div>
              <div><p className="text-xs text-muted">Lances</p><p className="text-white">{loot.auction?.bidCount ?? 0}</p></div>
            </div>
            <div className="flex gap-2">
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={String(nextMin)} className="flex-1 h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" />
              <button onClick={handleBid} disabled={loading} className="px-6 h-10 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">{loading&&<Loader2 size={12} className="animate-spin"/>} DAR LANCE</button>
            </div>
            <div className="space-y-1 max-h-40 overflow-auto">
              <p className="text-xs font-bold text-white">Histórico</p>
              {bids.map((b:any)=> <div key={b.id} className="flex justify-between text-xs p-2 rounded bg-[#050912] border border-[rgba(38,51,86,0.2)]"><span className="text-white">{b.characterName || memberNames[b.characterId] || b.characterId.slice(0,8)}</span><span className="text-accent font-bold">{b.amount} DKP</span><span className="text-muted">{b.createdAt?.toDate ? b.createdAt.toDate().toLocaleTimeString('pt-BR') : ''}</span></div>)}
              {bids.length===0 && <p className="text-xs text-muted text-center py-4">Nenhum lance ainda.</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-[#050912] border border-[rgba(38,51,86,0.3)] p-3 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted">Custo/ticket</p><p className="font-bold text-accent">{loot.raffle?.entryCost} DKP</p></div>
              <div><p className="text-xs text-muted">Total tickets</p><p className="font-bold text-white">{loot.raffle?.totalTickets ?? 0}</p></div>
              <div><p className="text-xs text-muted">Máx por character</p><p className="text-white">{loot.raffle?.maxTicketsPerUser}</p></div>
              <div><p className="text-xs text-muted">Múltiplos</p><p className="text-white">{loot.raffle?.allowMultipleTickets ? 'Sim' : 'Não'}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setQty(Math.max(1, qty-1))} className="w-9 h-9 rounded-lg border border-[rgba(38,51,86,0.5)] text-white">-</button>
              <span className="flex-1 text-center text-white font-bold">{qty}</span>
              <button onClick={()=>setQty(qty+1)} className="w-9 h-9 rounded-lg border border-[rgba(38,51,86,0.5)] text-white">+</button>
              <span className="text-sm text-muted">Total: <b className="text-accent">{(loot.raffle?.entryCost ?? 0)*qty} DKP</b></span>
              <button onClick={handleBuy} disabled={loading} className="px-4 h-10 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1">{loading&&<Loader2 size={12} className="animate-spin"/>} COMPRAR</button>
            </div>
            {loot.raffle?.winnerId && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
                <p className="text-sm font-bold text-emerald-400">🏆 Vencedor ticket #{loot.raffle.winningTicketNumber} — {memberNames[loot.raffle.winnerId] ?? loot.raffle.winnerId.slice(0,8)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateLootModal({ guildId, onClose, onCreated }: any) {
  const [type, setType] = useState<'AUCTION'|'RAFFLE'|null>(null);
  const [name, setName] = useState(''); const [image, setImage] = useState(''); const [desc, setDesc] = useState('');
  const [startsAt, setStartsAt] = useState(''); const [endsAt, setEndsAt] = useState('');
  const [startingBid, setStartingBid] = useState('100'); const [increment, setIncrement] = useState('10');
  const [entryCost, setEntryCost] = useState('50'); const [allowMultiple, setAllowMultiple] = useState(false); const [maxTickets, setMaxTickets] = useState('5');
  const [classes, setClasses] = useState<string[]>([]); const [eligibility, setEligibility] = useState<'ALL'|'CLASSES'>('ALL');
  const [saving, setSaving] = useState(false);
  const classOptions = ['gladiator','templar','assassin','ranger','sorcerer','elementalist','cleric','chanter'];

  const submit = async()=>{
    if(!type || !name || !startsAt || !endsAt) return toast.error('Preencha nome e datas');
    setSaving(true);
    try{
      const starts = new Date(startsAt).toISOString();
      const ends = new Date(endsAt).toISOString();
      const payload:any = { guildId, type, item:{name, image, description:desc}, startsAt:starts, endsAt:ends, eligibility:{type:eligibility, allowedClasses: eligibility==='CLASSES'?classes:[]} };
      if(type==='AUCTION') payload.auction={startingBid:Number(startingBid), minimumIncrement:Number(increment)};
      else payload.raffle={entryCost:Number(entryCost), allowMultipleTickets:allowMultiple, maxTicketsPerUser: Number(maxTickets)};
      const fn=httpsCallable(getFunctions(getFirebaseApp()),'createLoot');
      await fn(payload);
      onCreated();
    } catch(e:any){ toast.error(e.message); }
    setSaving(false);
  };

  if(!type) return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-xl p-6 max-w-md w-full" onClick={e=>e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">Criar Loot — Escolha o tipo</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={()=>setType('AUCTION')} className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-white flex flex-col items-center gap-2"><Gavel/> 🔨 Leilão <span className="text-xs text-muted">Maior lance vence</span></button>
          <button onClick={()=>setType('RAFFLE')} className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-white flex flex-col items-center gap-2"><Ticket/> 🎲 Sorteio <span className="text-xs text-muted">Tickets com DKP</span></button>
        </div>
        <button onClick={onClose} className="w-full mt-4 h-10 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-sm">Cancelar</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto" onClick={onClose}>
      <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-white">{type==='AUCTION' ? '🔨 Criar Leilão' : '🎲 Criar Sorteio'}</h3><button onClick={()=>setType(null)} className="text-xs text-muted border border-[rgba(38,51,86,0.5)] rounded px-2 py-1">Trocar tipo</button></div>
        <div className="space-y-3">
          <input placeholder="Nome do item" value={name} onChange={e=>setName(e.target.value)} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" />
          <input placeholder="Imagem URL (opcional)" value={image} onChange={e=>setImage(e.target.value)} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" />
          <textarea placeholder="Descrição opcional" value={desc} onChange={e=>setDesc(e.target.value)} rows={2} className="w-full px-3 py-2 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted">Início</label><input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="w-full h-10 px-2 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white [color-scheme:dark]" /></div>
            <div><label className="text-xs text-muted">Fim</label><input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="w-full h-10 px-2 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white [color-scheme:dark]" /></div>
          </div>
          {type==='AUCTION' ? (
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted">Lance inicial</label><input type="number" value={startingBid} onChange={e=>setStartingBid(e.target.value)} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" /></div>
              <div><label className="text-xs text-muted">Incremento mínimo</label><input type="number" value={increment} onChange={e=>setIncrement(e.target.value)} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" /></div>
            </div>
          ) : (
            <div className="space-y-2">
              <div><label className="text-xs text-muted">Custo por ticket DKP</label><input type="number" value={entryCost} onChange={e=>setEntryCost(e.target.value)} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" /></div>
              <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={allowMultiple} onChange={e=>setAllowMultiple(e.target.checked)}/> Permitir múltiplos tickets</label>
              {allowMultiple && <div><label className="text-xs text-muted">Máx por character</label><input type="number" value={maxTickets} onChange={e=>setMaxTickets(e.target.value)} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" /></div>}
            </div>
          )}
          <div>
            <label className="text-xs text-muted">Elegibilidade</label>
            <div className="flex gap-2 mt-1">
              <button onClick={()=>setEligibility('ALL')} className={cn('px-3 py-1.5 rounded-lg text-xs border', eligibility==='ALL'?'bg-accent text-white border-accent':'border-[rgba(38,51,86,0.5)] text-muted')}>Todos os membros</button>
              <button onClick={()=>setEligibility('CLASSES')} className={cn('px-3 py-1.5 rounded-lg text-xs border', eligibility==='CLASSES'?'bg-accent text-white border-accent':'border-[rgba(38,51,86,0.5)] text-muted')}>Classes específicas</button>
            </div>
            {eligibility==='CLASSES' && (
              <div className="grid grid-cols-2 gap-1 mt-2">
                {classOptions.map(c=> (
                  <label key={c} className="flex items-center gap-1 text-xs text-muted"><input type="checkbox" checked={classes.includes(c)} onChange={e=> setClasses(prev=> e.target.checked ? [...prev,c] : prev.filter(x=>x!==c))}/> {c}</label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-sm">Cancelar</button>
            <button onClick={submit} disabled={saving} className="flex-1 h-10 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">{saving&&<Loader2 size={14} className="animate-spin"/>} Criar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
