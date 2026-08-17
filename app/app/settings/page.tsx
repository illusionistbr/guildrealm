'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/admin/utils/cn';
import { Bell, Shield, Eye, Lock, Globe, Volume2, Moon, Save } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const sections = [
  {
    title: 'Notificações',
    icon: Bell,
    items: [
      { label: 'Notificações por email', desc: 'Receba atualizações por email', enabled: true },
      { label: 'Notificações push', desc: 'Notificações no navegador', enabled: true },
      { label: 'Convites de guildas', desc: 'Alertas de novos convites', enabled: true },
      { label: 'Eventos e promoções', desc: 'Sobre novos eventos e ofertas', enabled: false },
    ],
  },
  {
    title: 'Privacidade',
    icon: Eye,
    items: [
      { label: 'Perfil público', desc: 'Qualquer um pode ver seu perfil', enabled: true },
      { label: 'Mostrar conquistas', desc: 'Exibir conquistas no perfil', enabled: true },
      { label: 'Mostrar status online', desc: 'Deixar outros verem quando você está online', enabled: true },
    ],
  },
  {
    title: 'Segurança',
    icon: Lock,
    items: [
      { label: 'Autenticação em 2 fatores', desc: 'Camada extra de segurança', enabled: false },
      { label: 'Sessões ativas', desc: 'Gerenciar dispositivos conectados', enabled: true },
    ],
  },
];

export default function SettingsPage() {
  return (
    <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.05 } } }} className="space-y-6">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Configurações</h1>
          <p className="text-muted mt-1">Personalize sua experiência no ClanForge.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors">
          <Save size={16} /> Salvar
        </button>
      </motion.div>

      {sections.map((section) => (
        <motion.div
          key={section.title}
          variants={fadeUp}
          className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6"
        >
          <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 mb-4">
            <section.icon size={20} className="text-accent" /> {section.title}
          </h2>
          <div className="space-y-4">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{item.label}</p>
                  <p className="text-xs text-muted">{item.desc}</p>
                </div>
                <ToggleSwitch enabled={item.enabled} />
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Danger Zone */}
      <motion.div variants={fadeUp} className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-950/20 to-[rgba(10,18,32,0.4)] p-6">
        <h2 className="text-lg font-heading font-bold text-red-400 flex items-center gap-2 mb-4">
          <Shield size={20} /> Zona de Perigo
        </h2>
        <p className="text-sm text-muted mb-4">Ações irreversíveis. Tenha cuidado.</p>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">
            Excluir Conta
          </button>
          <button className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">
            Desativar Conta
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ToggleSwitch({ enabled }: { enabled: boolean }) {
  return (
    <div className={cn(
      'w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer',
      enabled ? 'bg-accent' : 'bg-[rgba(38,51,86,0.5)]',
    )}>
      <div className={cn(
        'w-4 h-4 rounded-full bg-white transition-transform duration-200',
        enabled ? 'translate-x-5' : 'translate-x-0',
      )} />
    </div>
  );
}
