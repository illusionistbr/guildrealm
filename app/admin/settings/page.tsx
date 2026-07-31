'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Settings, Save, Image, Globe, Mail, Shield, CreditCard, Palette, Link, Key } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';

const tabs = [
  { id: 'general', label: 'Geral', icon: Settings },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'social', label: 'Redes Sociais', icon: Link },
  { id: 'email', label: 'E-mail', icon: Mail },
  { id: 'security', label: 'Segurança', icon: Shield },
  { id: 'integrations', label: 'Integrações', icon: Key },
  { id: 'billing', label: 'Faturamento', icon: CreditCard },
  { id: 'seo', label: 'SEO Global', icon: Globe },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Configurações</h1>
            <p className="text-muted text-sm mt-1">Gerencie todas as configurações globais da plataforma</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={18} />
            {saved ? 'Salvo!' : 'Salvar Alterações'}
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  activeTab === tab.id
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-white hover:bg-[rgba(109,40,217,0.08)]',
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-5">
          {activeTab === 'general' && (
            <>
              <Field label="Nome da Plataforma" value="GuildRealm" />
              <Field label="URL Base" value="https://guildrealm.com" />
              <Field label="Idioma Padrão" value="pt-BR" type="select" options={['pt-BR', 'en', 'es', 'ko', 'ja', 'ru', 'zh']} />
              <Field label="Timezone" value="America/Sao_Paulo" type="select" options={['America/Sao_Paulo', 'America/New_York', 'Europe/London', 'Asia/Tokyo']} />
              <Field label="Modo Manutenção" value="Desativado" type="select" options={['Ativado', 'Desativado']} />
            </>
          )}
          {activeTab === 'branding' && (
            <>
              <Field label="Logo" type="image" />
              <Field label="Favicon" type="image" />
              <Field label="Cor Primária" value="#6D28D9" />
              <Field label="Cor Secundária" value="#8B5CF6" />
              <Field label="Cor de Fundo" value="#050912" />
            </>
          )}
          {activeTab === 'social' && (
            <>
              <Field label="Discord" value="https://discord.gg/guildrealm" />
              <Field label="Twitter / X" value="https://x.com/guildrealm" />
              <Field label="Instagram" value="https://instagram.com/guildrealm" />
              <Field label="YouTube" value="https://youtube.com/@guildrealm" />
              <Field label="TikTok" value="https://tiktok.com/@guildrealm" />
            </>
          )}
          {(activeTab === 'email' || activeTab === 'security' || activeTab === 'integrations' || activeTab === 'billing' || activeTab === 'seo') && (
            <div className="text-center py-12 text-muted">
              <Settings size={40} className="mx-auto mb-3 opacity-30" />
              <p>Configurações de {tabs.find((t) => t.id === activeTab)?.label} disponíveis em breve.</p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function Field({ label, value, type, options }: {
  label: string;
  value?: string;
  type?: 'text' | 'select' | 'image';
  options?: string[];
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-muted font-medium min-w-[160px]">{label}</label>
      {type === 'select' && options ? (
        <select className="flex-1 max-w-md h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-sm focus:outline-none focus:border-accent/50">
          {options.map((opt) => <option key={opt}>{opt}</option>)}
        </select>
      ) : type === 'image' ? (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[rgba(38,51,86,0.4)] flex items-center justify-center">
            <Image size={20} className="text-muted" />
          </div>
          <button className="px-3 py-1.5 bg-[rgba(109,40,217,0.1)] text-accent text-xs rounded-lg hover:bg-[rgba(109,40,217,0.2)] transition-colors">
            Upload
          </button>
        </div>
      ) : (
        <input
          type="text"
          defaultValue={value}
          className="flex-1 max-w-md h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-sm focus:outline-none focus:border-accent/50"
        />
      )}
    </div>
  );
}
