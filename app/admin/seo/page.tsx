'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { Search, Globe, Save, FileText, Image } from 'lucide-react';

export default function SEOPage() {
  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">SEO</h1>
            <p className="text-muted text-sm mt-1">Gerencie SEO global e por página</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
            <Save size={18} />
            Salvar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {['Home', 'Guildas', 'Login', 'Cadastro', 'Termos', 'Privacidade'].map((page) => (
            <div key={page} className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-5 space-y-3 hover:border-[rgba(168,100,255,0.3)] transition-colors">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-accent" />
                <h3 className="text-white font-medium text-sm">{page}</h3>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Meta Title"
                  className="w-full h-9 px-3 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-xs focus:outline-none focus:border-accent/50"
                />
                <textarea
                  placeholder="Meta Description"
                  rows={2}
                  className="w-full p-3 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-xs focus:outline-none focus:border-accent/50 resize-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <Globe size={14} />
                <span>/pt/{page.toLowerCase()}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-6 space-y-4">
          <h3 className="text-white font-heading font-bold text-base">Open Graph / Twitter Card</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">OG Title</label>
              <input type="text" defaultValue="GuildRealm — Seu reino. Sua guilda. Sua lenda." className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-sm focus:outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">OG Description</label>
              <input type="text" defaultValue="A plataforma definitiva para guildas de MMORPG." className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-sm focus:outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">OG Image</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-10 rounded-lg bg-[rgba(38,51,86,0.4)] flex items-center justify-center">
                  <Image size={20} className="text-muted" />
                </div>
                <button className="px-3 py-1.5 bg-[rgba(109,40,217,0.1)] text-accent text-xs rounded-lg">Upload</button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Twitter Card Type</label>
              <select className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white text-sm focus:outline-none focus:border-accent/50">
                <option>summary_large_image</option>
                <option>summary</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
