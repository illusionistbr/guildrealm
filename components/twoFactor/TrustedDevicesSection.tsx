'use client';
import { useEffect, useState } from 'react';
import { getFirebaseAuth } from '@/lib/admin/firebase/client';
import { toast } from 'sonner';
import { Loader2, Monitor, Smartphone, Trash2, ShieldAlert } from 'lucide-react';

type Device = {
  deviceId: string;
  deviceLabel: string;
  createdAt: any;
  lastUsedAt: any;
  expiresAt: any;
  revoked?: boolean;
};

function formatDate(ts: any): string {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleDateString('pt-BR');
}
function expiresIn(ts: any): string {
  if (!ts) return '-';
  const exp = ts.toMillis ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : Number(ts);
  const diff = exp - Date.now();
  if (diff <= 0) return 'Expirado';
  const days = Math.ceil(diff / (24*60*60*1000));
  return `${days} dia${days>1?'s':''}`;
}

export function TrustedDevicesSection(){
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try{
      const user = getFirebaseAuth().currentUser;
      if(!user){ setLoading(false); return; }
      const token = await user.getIdToken();
      const res = await fetch('/api/trusted-device/list', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      const data: any = await res.json();
      if(res.ok) setDevices(data.devices || []);
    }catch{}
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const revoke = async (deviceId: string) => {
    if(!confirm('Remover este dispositivo confiável? Você precisará inserir o código 2FA novamente neste navegador.')) return;
    setRevoking(deviceId);
    try{
      const user = getFirebaseAuth().currentUser;
      const token = await user!.getIdToken();
      const res = await fetch('/api/trusted-device/revoke', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deviceId }),
      });
      if(!res.ok) throw new Error('falha');
      toast.success('Dispositivo removido');
      await load();
    }catch(e:any){ toast.error('Erro ao remover'); }
    setRevoking(null);
  };

  const revokeAll = async () => {
    if(!confirm('Remover TODOS os dispositivos confiáveis? Todos os navegadores precisarão de 2FA novamente.')) return;
    setRevoking('ALL');
    try{
      const user = getFirebaseAuth().currentUser;
      const token = await user!.getIdToken();
      const res = await fetch('/api/trusted-device/revoke-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if(!res.ok) throw new Error('falha');
      toast.success('Todos os dispositivos removidos');
      await load();
    }catch{ toast.error('Erro'); }
    setRevoking(null);
  };

  if(loading) return <div className="flex items-center gap-2 text-muted text-sm"><Loader2 size={16} className="animate-spin"/> Carregando dispositivos...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white flex items-center gap-2"><Monitor size={14}/> Dispositivos confiáveis</h4>
        {devices.length>0 && (
          <button onClick={revokeAll} disabled={!!revoking} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 flex items-center gap-1"><Trash2 size={12}/> Remover todos</button>
        )}
      </div>
      {devices.length===0 ? (
        <p className="text-xs text-muted p-3 rounded-lg bg-[#050912] border border-[rgba(38,51,86,0.3)]">Nenhum navegador confiável. Ao fazer login você pode marcar “Não solicitar novamente neste navegador por 30 dias”.</p>
      ) : (
        <div className="space-y-2">
          {devices.map(d=> (
            <div key={d.deviceId} className="flex items-center justify-between p-3 rounded-lg bg-[#050912] border border-[rgba(38,51,86,0.3)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  {String(d.deviceLabel).toLowerCase().includes('iphone') || String(d.deviceLabel).toLowerCase().includes('android') ? <Smartphone size={14} className="text-accent"/> : <Monitor size={14} className="text-accent"/>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{d.deviceLabel}</p>
                  <p className="text-[11px] text-muted">Criado: {formatDate(d.createdAt)} • Último uso: {formatDate(d.lastUsedAt)} • Expira em: {expiresIn(d.expiresAt)}</p>
                </div>
              </div>
              <button onClick={()=>revoke(d.deviceId)} disabled={revoking===d.deviceId} className="p-1.5 rounded border border-[rgba(38,51,86,0.5)] text-muted hover:text-red-400 disabled:opacity-50">
                {revoking===d.deviceId ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
              </button>
            </div>
          ))}
          <p className="text-[11px] text-muted flex items-center gap-1"><ShieldAlert size={12}/> Não utilize dispositivos confiáveis em computadores públicos.</p>
        </div>
      )}
    </div>
  );
}
