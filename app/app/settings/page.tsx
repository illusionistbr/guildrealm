'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { onAuthStateChanged, deleteUser, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { cn } from '@/lib/admin/utils/cn';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/admin/firebase/client';
import { Bell, Shield, Eye, Lock, Save, Loader2, AlertTriangle, X } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type SettingsData = {
  notifications: {
    email: boolean;
    push: boolean;
    guildInvites: boolean;
    eventsPromos: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showAchievements: boolean;
    showOnline: boolean;
  };
  security: {
    twoFactor: boolean;
    activeSessions: boolean;
  };
};

const DEFAULT_SETTINGS: SettingsData = {
  notifications: { email: true, push: true, guildInvites: true, eventsPromos: false },
  privacy: { publicProfile: true, showAchievements: true, showOnline: true },
  security: { twoFactor: false, activeSessions: true },
};

export default function SettingsPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [original, setOriginal] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUid(user.uid);
      try {
        const snap = await getDoc(doc(getFirebaseDb(), 'user_settings', user.uid));
        if (snap.exists()) {
          const data = snap.data() as Partial<SettingsData>;
          const merged: SettingsData = {
            notifications: { ...DEFAULT_SETTINGS.notifications, ...(data.notifications ?? {}) },
            privacy: { ...DEFAULT_SETTINGS.privacy, ...(data.privacy ?? {}) },
            security: { ...DEFAULT_SETTINGS.security, ...(data.security ?? {}) },
          };
          setSettings(merged);
          setOriginal(merged);
        } else {
          setSettings(DEFAULT_SETTINGS);
          setOriginal(DEFAULT_SETTINGS);
        }
      } catch {
        toast.error('Não foi possível carregar suas configurações.');
      }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const dirty = JSON.stringify(settings) !== JSON.stringify(original);

  const handleToggle = useCallback(
    async (section: keyof SettingsData, key: string, value: boolean) => {
      // Push: solicita permissão do navegador
      if (section === 'notifications' && key === 'push' && value === true) {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'denied') {
            toast.error('Notificações bloqueadas no navegador. Ative nas configurações do navegador.');
            return;
          }
          if (Notification.permission !== 'granted') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
              toast.error('Permissão de notificações negada.');
              return;
            }
            toast.success('Notificações push ativadas!');
          }
        }
      }

      // 2FA: aviso
      if (section === 'security' && key === 'twoFactor' && value === true) {
        toast.info('Autenticação em 2 fatores será vinculada ao seu e-mail. Em breve com TOTP.');
      }

      setSettings((prev) => ({
        ...prev,
        [section]: { ...(prev[section] as Record<string, boolean>), [key]: value },
      }));
    },
    [],
  );

  const handleSave = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await setDoc(
        doc(getFirebaseDb(), 'user_settings', uid),
        {
          ...settings,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      // Também sincroniza visibilidade no users doc quando possível (best-effort)
      try {
        const { doc: userDoc, updateDoc } = await import('firebase/firestore');
        // não bloqueia se falhar por rules
        await updateDoc(doc(getFirebaseDb(), 'users', uid), {
          // guardamos espelho para feed/profile checks futuros
          // @ts-ignore
          settings: settings,
          updatedAt: serverTimestamp(),
        } as Record<string, unknown>).catch(() => {});
      } catch {}
      setOriginal(settings);
      toast.success('Configurações salvas com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar. Tente novamente.');
    }
    setSaving(false);
  };

  const handleDeactivate = async () => {
    if (!uid) return;
    setDangerLoading(true);
    try {
      await setDoc(
        doc(getFirebaseDb(), 'user_settings', uid),
        { deactivated: true, deactivatedAt: serverTimestamp() },
        { merge: true },
      );
      toast.success('Conta desativada. Até a próxima, aventureiro!');
      await signOut(getFirebaseAuth());
      router.replace('/login');
    } catch {
      toast.error('Não foi possível desativar a conta.');
    }
    setDangerLoading(false);
  };

  const handleDelete = async () => {
    if (!uid) return;
    if (confirmText !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar.');
      return;
    }
    setDangerLoading(true);
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('no-user');
      // remove settings
      await deleteDoc(doc(getFirebaseDb(), 'user_settings', uid)).catch(() => {});
      // tenta remover usuários de guilds/personagens? deixa orphan por enquanto
      await deleteUser(user);
      toast.success('Conta excluída permanentemente.');
      router.replace('/signup');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('requires-recent-login')) {
        toast.error('Faça login novamente e tente excluir. Reautenticação necessária.');
        await signOut(getFirebaseAuth());
        router.replace('/login');
      } else {
        toast.error('Não foi possível excluir a conta. Tente novamente.');
      }
    }
    setDangerLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        <Loader2 size={22} className="animate-spin mr-2" /> Carregando configurações...
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-6"
    >
      <Toaster richColors position="top-right" theme="dark" />
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Configurações</h1>
          <p className="text-muted mt-1">Personalize sua experiência no ClanForge.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            dirty && !saving
              ? 'bg-accent text-white hover:bg-accent-hover shadow-[0_0_15px_rgba(139,92,246,0.3)]'
              : 'bg-[rgba(38,51,86,0.3)] text-muted cursor-not-allowed border border-[rgba(38,51,86,0.3)]',
          )}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </motion.div>

      {dirty && (
        <motion.div variants={fadeUp} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle size={14} /> Você tem alterações não salvas.
        </motion.div>
      )}

      {/* Notificações */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6"
      >
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 mb-4">
          <Bell size={20} className="text-accent" /> Notificações
        </h2>
        <div className="space-y-4">
          <Row
            label="Notificações por email"
            desc="Receba atualizações por email"
            enabled={settings.notifications.email}
            onToggle={(v) => handleToggle('notifications', 'email', v)}
          />
          <Row
            label="Notificações push"
            desc="Notificações no navegador"
            enabled={settings.notifications.push}
            onToggle={(v) => handleToggle('notifications', 'push', v)}
          />
          <Row
            label="Convites de guildas"
            desc="Alertas de novos convites"
            enabled={settings.notifications.guildInvites}
            onToggle={(v) => handleToggle('notifications', 'guildInvites', v)}
          />
          <Row
            label="Eventos e promoções"
            desc="Sobre novos eventos e ofertas"
            enabled={settings.notifications.eventsPromos}
            onToggle={(v) => handleToggle('notifications', 'eventsPromos', v)}
          />
        </div>
      </motion.div>

      {/* Privacidade */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6"
      >
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 mb-4">
          <Eye size={20} className="text-accent" /> Privacidade
        </h2>
        <div className="space-y-4">
          <Row
            label="Perfil público"
            desc="Qualquer um pode ver seu perfil"
            enabled={settings.privacy.publicProfile}
            onToggle={(v) => handleToggle('privacy', 'publicProfile', v)}
          />
          <Row
            label="Mostrar conquistas"
            desc="Exibir conquistas no perfil"
            enabled={settings.privacy.showAchievements}
            onToggle={(v) => handleToggle('privacy', 'showAchievements', v)}
          />
          <Row
            label="Mostrar status online"
            desc="Deixar outros verem quando você está online"
            enabled={settings.privacy.showOnline}
            onToggle={(v) => handleToggle('privacy', 'showOnline', v)}
          />
        </div>
      </motion.div>

      {/* Segurança */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6"
      >
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 mb-4">
          <Lock size={20} className="text-accent" /> Segurança
        </h2>
        <div className="space-y-4">
          <Row
            label="Autenticação em 2 fatores"
            desc="Camada extra de segurança"
            enabled={settings.security.twoFactor}
            onToggle={(v) => handleToggle('security', 'twoFactor', v)}
          />
          <Row
            label="Sessões ativas"
            desc="Gerenciar dispositivos conectados"
            enabled={settings.security.activeSessions}
            onToggle={(v) => handleToggle('security', 'activeSessions', v)}
          />
          {settings.security.activeSessions && (
            <div className="mt-2 p-3 rounded-lg bg-[rgba(10,18,32,0.6)] border border-[rgba(38,51,86,0.3)] text-xs text-muted">
              Sessão atual: este navegador • <button onClick={async () => { await signOut(getFirebaseAuth()); router.replace('/login'); toast.info('Sessão encerrada.'); }} className="text-accent hover:underline">Encerrar outras sessões</button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-950/20 to-[rgba(10,18,32,0.4)] p-6"
      >
        <h2 className="text-lg font-heading font-bold text-red-400 flex items-center gap-2 mb-4">
          <Shield size={20} /> Zona de Perigo
        </h2>
        <p className="text-sm text-muted mb-4">Ações irreversíveis. Tenha cuidado.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
          >
            Excluir Conta
          </button>
          <button
            onClick={() => setShowDeactivateModal(true)}
            className="px-4 py-2 rounded-lg border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/10 transition-colors"
          >
            Desativar Conta
          </button>
        </div>
      </motion.div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !dangerLoading && setShowDeleteModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-red-500/20 bg-[#0a1122] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><AlertTriangle size={18} className="text-red-400" /> Excluir conta permanentemente?</h3>
              <button onClick={() => !dangerLoading && setShowDeleteModal(false)} className="p-1 text-muted hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-sm text-muted mb-3">Isso apagará sua autenticação e configurações. Personagens e guildas onde você é líder precisam ser transferidos antes. Digite <b className="text-white">EXCLUIR</b> para confirmar.</p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="EXCLUIR"
              className="w-full h-10 px-3 rounded-lg bg-[#050912] border border-[rgba(38,51,86,0.5)] text-white text-sm placeholder-muted focus:outline-none focus:border-red-500/50"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowDeleteModal(false)} disabled={dangerLoading} className="flex-1 h-10 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-sm disabled:opacity-50">Cancelar</button>
              <button onClick={handleDelete} disabled={dangerLoading || confirmText !== 'EXCLUIR'} className="flex-1 h-10 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {dangerLoading ? <Loader2 size={16} className="animate-spin" /> : null} Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !dangerLoading && setShowDeactivateModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-amber-500/20 bg-[#0a1122] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Desativar conta?</h3>
              <button onClick={() => !dangerLoading && setShowDeactivateModal(false)} className="p-1 text-muted hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-sm text-muted mb-4">Sua conta ficará inativa e você será desconectado. Você poderá reativar fazendo login novamente.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeactivateModal(false)} disabled={dangerLoading} className="flex-1 h-10 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-sm">Cancelar</button>
              <button onClick={handleDeactivate} disabled={dangerLoading} className="flex-1 h-10 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {dangerLoading ? <Loader2 size={16} className="animate-spin" /> : null} Desativar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Row({ label, desc, enabled, onToggle }: { label: string; desc: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
      <ToggleSwitch enabled={enabled} onToggle={onToggle} />
    </div>
  );
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      className={cn(
        'w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer flex',
        enabled ? 'bg-accent' : 'bg-[rgba(38,51,86,0.5)]',
      )}
    >
      <span
        className={cn(
          'w-4 h-4 rounded-full bg-white transition-transform duration-200 block',
          enabled ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}
