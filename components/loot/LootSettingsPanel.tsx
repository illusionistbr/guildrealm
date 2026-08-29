'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, getFirebaseDb } from '@/lib/admin/firebase/client';
import { DEFAULT_LOOT_SETTINGS, LootSettings } from '@/lib/loot/types';
import { Loader2, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export function LootSettingsPanel({ guildId }: { guildId: string }) {
  const [settings, setSettings] = useState<LootSettings>(DEFAULT_LOOT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(getFirebaseDb(), 'guilds', guildId, 'settings', 'loot'));
      if (snap.exists()) {
        const data = snap.data() as LootSettings;
        setSettings({ ...DEFAULT_LOOT_SETTINGS, ...data, decay: { ...DEFAULT_LOOT_SETTINGS.decay, ...(data.decay ?? {}) }, antiSnipingDefault: { ...DEFAULT_LOOT_SETTINGS.antiSnipingDefault, ...(data.antiSnipingDefault ?? {}) } });
      }
      setLoading(false);
    };
    load();
  }, [guildId]);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const fn = httpsCallable(getFunctions(getFirebaseApp()), 'saveLootSettings');
      await fn({
        guildId,
        dkpEnabled: settings.dkpEnabled,
        allowNegativeDKP: settings.allowNegativeDKP,
        decay: settings.decay,
        antiSnipingDefault: settings.antiSnipingDefault,
      });
      toast.success('Configurações de Loot & DKP salvas!');
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar');
      toast.error('Erro ao salvar configurações');
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-8 text-muted"><Loader2 className="animate-spin mr-2" size={18}/>Carregando...</div>;

  return (
    <div className="space-y-6">
      <Toaster richColors theme="dark" position="top-right" />
      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><AlertTriangle size={16}/>{error}</div>}

      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Sistema DKP</h3>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-muted">Ativar sistema DKP</span>
          <input type="checkbox" checked={settings.dkpEnabled} onChange={e => setSettings(s => ({ ...s, dkpEnabled: e.target.checked }))} className="w-10 h-5 accent-accent" />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-muted">Permitir DKP negativo</span>
          <input type="checkbox" checked={settings.allowNegativeDKP} onChange={e => setSettings(s => ({ ...s, allowNegativeDKP: e.target.checked }))} className="w-10 h-5 accent-accent" />
        </label>
      </div>

      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Decaimento de DKP</h3>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-muted">Ativar decaimento</span>
          <input type="checkbox" checked={settings.decay.enabled} onChange={e => setSettings(s => ({ ...s, decay: { ...s.decay, enabled: e.target.checked } }))} className="w-10 h-5 accent-accent" />
        </label>
        {settings.decay.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Frequência</label>
              <select value={settings.decay.frequency} onChange={e => setSettings(s => ({ ...s, decay: { ...s.decay, frequency: e.target.value as any } }))} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white">
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quinzenal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Percentual %</label>
              <input type="number" min={0} max={100} value={settings.decay.percentage} onChange={e => setSettings(s => ({ ...s, decay: { ...s.decay, percentage: Number(e.target.value) } }))} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Horário reset</label>
              <input type="time" value={settings.decay.resetTime} onChange={e => setSettings(s => ({ ...s, decay: { ...s.decay, resetTime: e.target.value } }))} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Dia reset</label>
              <input type="number" value={settings.decay.resetDay} onChange={e => setSettings(s => ({ ...s, decay: { ...s.decay, resetDay: Number(e.target.value) } }))} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" placeholder={settings.decay.frequency==='monthly' ? '1-31' : '0 Dom - 6 Sab'} />
            </div>
          </div>
        )}
        {settings.decay.nextProcessAt && (
          <p className="text-xs text-muted">Próximo processamento: {new Date((settings.decay.nextProcessAt as any).seconds ? (settings.decay.nextProcessAt as any).seconds*1000 : settings.decay.nextProcessAt as any).toLocaleString('pt-BR')}</p>
        )}
      </div>

      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Anti-sniping padrão</h3>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-muted">Ativar anti-sniping (60s padrão)</span>
          <input type="checkbox" checked={settings.antiSnipingDefault.enabled} onChange={e => setSettings(s => ({ ...s, antiSnipingDefault: { ...s.antiSnipingDefault, enabled: e.target.checked } }))} className="w-10 h-5 accent-accent" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Janela (s)</label>
            <input type="number" value={settings.antiSnipingDefault.thresholdSeconds} onChange={e => setSettings(s => ({ ...s, antiSnipingDefault: { ...s.antiSnipingDefault, thresholdSeconds: Number(e.target.value) } }))} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Extensão (s)</label>
            <input type="number" value={settings.antiSnipingDefault.extensionSeconds} onChange={e => setSettings(s => ({ ...s, antiSnipingDefault: { ...s.antiSnipingDefault, extensionSeconds: Number(e.target.value) } }))} className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white" />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover disabled:opacity-50 flex items-center justify-center gap-2">
        {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Salvar configurações
      </button>
    </div>
  );
}
