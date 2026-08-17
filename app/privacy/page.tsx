'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, ArrowUp, Calendar, ChevronRight, Clock, FileText, History, Home, Info, ShieldCheck, Share2, Tag, User, Lock, Globe, Mail, Database, Eye, Settings, Shield, Users, AlertTriangle, Link2, Cookie, Trash2 } from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { PrimaryButton } from '@/components/ui/primary-button';

const sectionIcons = [Info, Users, Database, Settings, Shield, Globe, Link2, Cookie, Trash2, User, Trash2, Lock, Users, Globe, FileText, Mail, Shield] as const;

type PrivacySection = { id: string; num: string; title: string; content: string };

const tocItems = [
  { num: '1', label: 'Introdução' },
  { num: '2', label: 'Quem somos' },
  { num: '3', label: 'Quais dados coletamos' },
  { num: '4', label: 'Como utilizamos seus dados' },
  { num: '5', label: 'Base legal (LGPD)' },
  { num: '6', label: 'Compartilhamento de dados' },
  { num: '7', label: 'Serviços de terceiros' },
  { num: '8', label: 'Cookies' },
  { num: '9', label: 'Retenção dos dados' },
  { num: '10', label: 'Seus direitos (LGPD)' },
  { num: '11', label: 'Exclusão da conta' },
  { num: '12', label: 'Segurança dos dados' },
  { num: '13', label: 'Crianças e adolescentes' },
  { num: '14', label: 'Transferência internacional' },
  { num: '15', label: 'Alterações desta política' },
  { num: '16', label: 'Contato' },
  { num: '17', label: 'Lei aplicável' },
];

const companyInfo = [
  { label: 'Razão Social', value: 'ClanForge Serviços Digitais LTDA' },
  { label: 'CNPJ', value: '12.345.678/0001-90' },
  { label: 'Endereço', value: 'Rua das Laranjeiras, 123, Sala 1001 – Centro\nNovo Hamburgo/RS – Brasil – CEP 93510-000' },
  { label: 'E-mail', value: 'privacy@clanforge.com' },
  { label: 'DPO / Encarregado', value: 'privacy@clanforge.com' },
];

const dataCategories = [
  { icon: User, titleKey: 'catUserTitle', descKey: 'catUserDesc', linkKey: 'catUserLink' },
  { icon: Database, titleKey: 'catGeneratedTitle', descKey: 'catGeneratedDesc', linkKey: 'catGeneratedLink' },
  { icon: Eye, titleKey: 'catAutoTitle', descKey: 'catAutoDesc', linkKey: 'catAutoLink' },
];

export default function PrivacyPolicyPage() {
  const t = useTranslations('Privacy');
  const sections = t.raw('sections') as PrivacySection[];

  return (
    <main className="terms-page">
      <SiteHeader />
      <section className="terms-hero">
        <div className="terms-hero-art" />
        <div className="terms-hero-shade" />
        <div className="shell terms-hero-content">
          <p className="eyebrow"><ShieldCheck /> {t('heroEyebrow')}</p>
          <h1>{t('heroTitle')}</h1>
          <p className="terms-hero-text">{t('heroText')}</p>
          <div className="terms-meta">
            <span><Calendar size={15} /> {t('metaDate')} <b>25 de maio de 2026</b></span>
            <span><Tag size={15} /> {t('metaVersion')} <b>1.0.0</b></span>
            <span><Clock size={15} /> {t('metaRead')} <b>~12 min</b></span>
          </div>
        </div>
      </section>

      <div className="terms-layout shell">
        <aside className="terms-sidebar">
          <div className="terms-toc">
            <h3>{t('tocTitle')}</h3>
            <nav>
              {tocItems.map((item) => (
                <a href={`#section-${item.num}`} key={item.num} className="toc-link">
                  <span className="toc-num">{item.num}.</span> {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="terms-contact-card">
            <Shield size={28} />
            <h4>{t('contactCardTitle')}</h4>
            <p>{t('contactCardText')}</p>
            <PrimaryButton className="terms-contact-btn">{t('contactCardBtn')} <ArrowRight size={16} /></PrimaryButton>
          </div>
        </aside>

        <article className="terms-content">
          <nav className="terms-breadcrumb">
            <a href="/"><Home size={14} /></a>
            <ChevronRight size={14} />
            <span>{t('breadcrumbLegal')}</span>
            <ChevronRight size={14} />
            <span>{t('breadcrumbTitle')}</span>
            <button className="terms-share"><Share2 size={16} /></button>
          </nav>

          {sections.map((section, index) => {
            const Icon = sectionIcons[index] || Info;
            return (
              <section key={section.id} id={`section-${section.num}`} className="terms-section">
                <h2><span className="section-num">{section.num}.</span> {section.title}</h2>
                <div className="terms-section-content" dangerouslySetInnerHTML={{ __html: section.content }} />
                {index === 0 && (
                  <div className="terms-info-card">
                    <span className="info-card-icon"><Shield size={20} /></span>
                    <div>
                      <b>{t('infoCardTitle')}</b>
                      <p>{t('infoCardText')}</p>
                    </div>
                  </div>
                )}
                {index === 2 && (
                  <div className="privacy-data-categories">
                    {dataCategories.map((cat) => {
                      const CatIcon = cat.icon;
                      return (
                        <div key={cat.titleKey} className="privacy-data-card">
                          <span className="privacy-data-icon"><CatIcon size={22} /></span>
                          <h3>{t(cat.titleKey)}</h3>
                          <p>{t(cat.descKey)}</p>
                          <a href={`#section-${section.num}`} className="privacy-data-link">{t(cat.linkKey)} <ArrowRight size={14} /></a>
                        </div>
                      );
                    })}
                  </div>
                )}
                {index === 2 && (
                  <div className="terms-info-card">
                    <span className="info-card-icon"><Lock size={20} /></span>
                    <div>
                      <b>{t('importantTitle')}</b>
                      <p>{t('importantText')}</p>
                    </div>
                  </div>
                )}
              </section>
            );
          })}

          <nav className="terms-pagination">
            <a href="/terms" className="terms-prev">
              <ArrowLeft size={18} />
              <div><span>{t('prev')}</span><b>{t('prevTitle')}</b></div>
            </a>
            <div className="terms-next">
              <div><span>{t('next')}</span><b>{t('nextTitle')}</b></div>
              <ArrowRight size={18} />
            </div>
          </nav>

          <button className="terms-back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp size={20} />
          </button>
        </article>
      </div>
    </main>
  );
}
