'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { FileText, Plus, Eye, Edit3, Globe, Save } from 'lucide-react';
import { usePermission } from '@/lib/admin/rbac/hooks';
import { cn } from '@/lib/admin/utils/cn';

type CmsSection = {
  id: string;
  name: string;
  key: string;
  status: 'published' | 'draft' | 'review';
  lastEdited: string;
  author: string;
};

const cmsSections: CmsSection[] = [
  { id: 'hero', name: 'Hero', key: 'landing.hero', status: 'published', lastEdited: '2h atrás', author: 'Admin' },
  { id: 'features', name: 'Features', key: 'landing.features', status: 'published', lastEdited: '1d atrás', author: 'Admin' },
  { id: 'leader-pains', name: 'Dores dos Líderes', key: 'landing.leaderPains', status: 'published', lastEdited: '3d atrás', author: 'Editor' },
  { id: 'games', name: 'Jogos Suportados', key: 'landing.games', status: 'published', lastEdited: '5d atrás', author: 'Admin' },
  { id: 'pricing', name: 'Planos e Preços', key: 'landing.pricing', status: 'draft', lastEdited: '1h atrás', author: 'Editor' },
  { id: 'faq', name: 'FAQ', key: 'landing.faq', status: 'review', lastEdited: '30min atrás', author: 'Editor' },
  { id: 'footer', name: 'Footer', key: 'landing.footer', status: 'published', lastEdited: '1sem atrás', author: 'Admin' },
  { id: 'navbar', name: 'Navbar', key: 'landing.navbar', status: 'published', lastEdited: '2sem atrás', author: 'Admin' },
  { id: 'banners', name: 'Banners', key: 'landing.banners', status: 'draft', lastEdited: '4h atrás', author: 'Editor' },
  { id: 'popups', name: 'Popups', key: 'landing.popups', status: 'draft', lastEdited: '1d atrás', author: 'Editor' },
];

export default function CMSPage() {
  const canManage = usePermission('cms:manage');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [content, setContent] = useState('');

  const statusConfig = {
    published: { label: 'Publicado', class: 'bg-emerald-500/10 text-emerald-400' },
    draft: { label: 'Rascunho', class: 'bg-muted/10 text-muted' },
    review: { label: 'Revisão', class: 'bg-yellow-500/10 text-yellow-400' },
  };

  const openEditor = (section: CmsSection) => {
    setEditingSection(section.id);
    setContent(`Conteúdo atual da seção "${section.name}"...`);
  };

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">CMS</h1>
            <p className="text-muted text-sm mt-1">Gerencie todo o conteúdo da plataforma</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" className="flex items-center gap-2 px-3 py-2 bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-lg text-muted hover:text-white text-sm transition-colors">
              <Globe size={16} />
              Ver Site
            </a>
            {canManage && (
              <button className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
                <Plus size={18} />
                Nova Seção
              </button>
            )}
          </div>
        </div>

        {editingSection ? (
          <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-heading font-bold text-lg">
                Editando: {cmsSections.find((s) => s.id === editingSection)?.name}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSection(null)}
                  className="px-3 py-2 bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-lg text-muted hover:text-white text-sm"
                >
                  Cancelar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm transition-colors">
                  <Save size={16} />
                  Salvar
                </button>
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[300px] p-4 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-accent/50 resize-y"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cmsSections.map((section) => (
              <div
                key={section.id}
                className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-5 hover:border-[rgba(168,100,255,0.3)] transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                      <FileText size={18} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm">{section.name}</h3>
                      <p className="text-xs text-muted">{section.key}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig[section.status].class)}>
                      {statusConfig[section.status].label}
                    </span>
                    <span className="text-xs text-muted">{section.lastEdited}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditor(section)}
                      className="p-1.5 text-muted hover:text-accent transition-colors"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button className="p-1.5 text-muted hover:text-white transition-colors">
                      <Eye size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
