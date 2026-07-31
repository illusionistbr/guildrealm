'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ChevronDown, Filter, Gamepad2, Globe2, Grid2X2, List, Plus, Search, ShieldCheck, Swords, Trophy, UsersRound } from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { PrimaryButton } from '@/components/ui/primary-button';

const filterIcons = [Gamepad2, Globe2, UsersRound, Swords] as const;

type GuildData = {
  name: string; tag: string; rank: number; game: string; gm: string; members: number;
  tone: string; statusType: string; status: string; tags: string[]; description: string;
};

type FilterData = { label: string; value: string };

export default function GuildsPage() {
  const t = useTranslations('Guilds');
  const guilds = t.raw('guilds') as GuildData[];
  const selectFilters = t.raw('selectFilters') as FilterData[];

  return (
    <main className="guilds-page">
      <SiteHeader />
      <section className="catalogue-hero">
        <div className="catalogue-art" />
        <div className="shell catalogue-heading">
          <div><p className="catalogue-kicker"><ShieldCheck /> {t('heroEyebrow')}</p><h1>{t('heroTitle1')} <em>{t('heroTitle2')}</em></h1><p>{t('heroText')}</p></div>
          <PrimaryButton className="create-guild"><Plus size={19} /> {t('createGuild')}</PrimaryButton>
        </div>
      </section>
      <section className="shell catalogue-content">
        <div className="filter-panel">
          <label className="search-field"><Search size={21} /><input placeholder={t('searchPlaceholder')} /></label>
          <div className="filter-row">
            {selectFilters.map(({ label, value }, index) => {
              const Icon = filterIcons[index];
              return <label className="select-filter" key={label}><span>{label}</span><button><Icon size={18} />{value}<ChevronDown size={17} /></button></label>;
            })}
            <button className="advanced-filter"><Filter size={19} />{t('advancedFilters')}</button>
          </div>
        </div>
        <div className="results-toolbar"><p>{t('resultsFound', { count: '1.248' })}</p><div><span>{t('sortBy')}</span><button className="sort">{t('popularity')} <ChevronDown size={17} /></button><button className="view active"><Grid2X2 /></button><button className="view"><List /></button></div></div>
        <div className="guild-grid">
          {guilds.map((guild, index) => (
            <motion.article key={guild.tag} className={`guild-card ${guild.tone}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .08 }}>
              <div className="guild-art"><span><Trophy size={13} /> {t('rank', { rank: guild.rank })}</span></div>
              <div className="guild-body">
                <div className="guild-symbol"><ShieldCheck /></div>
                <span className={`recruitment ${guild.statusType === 'open' ? 'open' : ''}`}>{guild.status}</span>
                <h2>{guild.name} <em>[{guild.tag}]</em></h2>
                <p className="guild-meta"><Gamepad2 size={14} /> {guild.game} <i /> {t('gmLabel', { name: guild.gm })}</p>
                <p className="guild-description">{guild.description}</p>
                <p className="guild-members"><UsersRound size={15} /> {t('members', { count: guild.members })} <b /> <span>●</span> {t('onlineNow')}</p>
                <div className="guild-tags">{guild.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className="guild-actions"><button>{t('viewGuild')}</button><PrimaryButton>{t('apply')}</PrimaryButton></div>
              </div>
            </motion.article>
          ))}
        </div>
        <nav className="pagination"><button>‹</button><button className="current">1</button><button>2</button><button>3</button><span>···</span><button>42</button><button>›</button></nav>
      </section>
    </main>
  );
}
