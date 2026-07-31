'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Globe, Search, Save, Edit3, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';

const languages = [
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷', progress: 100 },
  { code: 'en', name: 'English', flag: '🇺🇸', progress: 100 },
  { code: 'es', name: 'Español', flag: '🇪🇸', progress: 72 },
  { code: 'ko', name: '한국어', flag: '🇰🇷', progress: 45 },
  { code: 'ja', name: '日本語', flag: '🇯🇵', progress: 38 },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', progress: 51 },
  { code: 'zh', name: '中文', flag: '🇨🇳', progress: 33 },
];

const namespaceKeys = [
  'Header.resources', 'Header.games', 'Header.prices', 'Header.blog',
  'Home.heroEyebrow', 'Home.heroFirst', 'Home.heroText', 'Home.startFree',
  'Signup.formTitle', 'Signup.submit', 'Login.formTitle', 'Login.submit',
  'Guilds.heroTitle1', 'Guilds.createGuild',
  'Terms.heroTitle', 'Privacy.heroTitle',
  'ForgotPassword.formTitle', 'ForgotPassword.submit',
];

export default function TranslationsPage() {
  const [activeLang, setActiveLang] = useState('pt-BR');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (key: string) => {
    setEditingKey(key);
    setEditValue(`Valor traduzido para "${key}"`);
  };

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Traduções</h1>
            <p className="text-muted text-sm mt-1">Gerencie todos os textos em múltiplos idiomas</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
            <Save size={18} />
            Salvar Todas
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-4 space-y-2">
            <h3 className="text-white font-heading font-bold text-sm mb-3 px-2">Idiomas</h3>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setActiveLang(lang.code)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                  activeLang === lang.code
                    ? 'bg-accent/15 text-white border border-accent/30'
                    : 'text-muted hover:text-white hover:bg-[rgba(109,40,217,0.08)]',
                )}
              >
                <span className="text-base">{lang.flag}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{lang.name}</p>
                  <p className="text-xs text-muted">{lang.code}</p>
                </div>
                <span className={cn('text-xs font-medium', lang.progress === 100 ? 'text-emerald-400' : 'text-yellow-400')}>
                  {lang.progress}%
                </span>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[rgba(38,51,86,0.5)]">
              <h3 className="text-white font-heading font-bold text-sm">
                Chaves — {languages.find((l) => l.code === activeLang)?.name}
              </h3>
            </div>
            <div className="divide-y divide-[rgba(38,51,86,0.3)]">
              {namespaceKeys.map((key) => (
                <div key={key} className="px-4 py-3 hover:bg-[rgba(109,40,217,0.04)] transition-colors">
                  {editingKey === key ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 h-9 px-3 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-sm focus:outline-none focus:border-accent/50"
                        autoFocus
                      />
                      <button onClick={() => setEditingKey(null)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded"><Check size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted font-mono">{key}</p>
                        <p className="text-white text-sm mt-0.5 truncate">Valor traduzido para "{key.split('.').pop()}"</p>
                      </div>
                      <button onClick={() => startEdit(key)} className="p-1.5 text-muted hover:text-accent transition-colors flex-shrink-0">
                        <Edit3 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
