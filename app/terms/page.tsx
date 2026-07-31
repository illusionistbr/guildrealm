'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, ArrowUp, BookOpen, Calendar, ChevronRight, Clock, FileText, History, Home, Info, Mail, MessageSquare, Shield, ShieldCheck, Share2, Tag, Users, UserCheck, Swords, Award, Settings, Flag, AlertTriangle, Lock, Globe, Ban, Scale, MailCheck } from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { PrimaryButton } from '@/components/ui/primary-button';

const sectionIcons = [Info, Tag, UserCheck, Users, ShieldCheck, Globe, Swords, FileText, MessageSquare, AlertTriangle, Shield, Award, History, Settings, Ban, Globe, Lock, Scale, FileText, MailCheck, Mail] as const;

type TermSection = { id: string; num: string; title: string; content: string };

const tocItems = [
  { num: '1', label: 'Introdução' },
  { num: '2', label: 'Definições' },
  { num: '3', label: 'Aceitação dos Termos' },
  { num: '4', label: 'Elegibilidade e Cadastro' },
  { num: '5', label: 'Conta do Usuário' },
  { num: '6', label: 'Perfil Público' },
  { num: '7', label: 'Guilds' },
  { num: '8', label: 'Conteúdo do Usuário' },
  { num: '9', label: 'Mensagens Privadas' },
  { num: '10', label: 'Conduta da Comunidade' },
  { num: '11', label: 'Denúncias e Moderação' },
  { num: '12', label: 'Conquistas e Rankings' },
  { num: '13', label: 'Sorteios e Eventos' },
  { num: '14', label: 'Propriedade Intelectual' },
  { num: '15', label: 'Jogos de Terceiros' },
  { num: '16', label: 'Disponibilidade da Plataforma' },
  { num: '17', label: 'Suspensão e Encerramento' },
  { num: '18', label: 'Limitação de Responsabilidade' },
  { num: '19', label: 'Alterações dos Termos' },
  { num: '20', label: 'Lei Aplicável e Foro' },
  { num: '21', label: 'Contato' },
];

export default function TermsPage() {
  const t = useTranslations('Terms');
  const sections = t.raw('sections') as TermSection[];

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
            <span><Clock size={15} /> {t('metaRead')} <b>~18 min</b></span>
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
                    <span className="info-card-icon"><Info size={20} /></span>
                    <div>
                      <b>{t('infoCardTitle')}</b>
                      <p>{t('infoCardText')}</p>
                    </div>
                  </div>
                )}
              </section>
            );
          })}

          <div className="terms-notice">
            <div className="notice-icon"><FileText size={24} /></div>
            <b>{t('noticeTitle')}</b>
            <p>{t('noticeText')}</p>
            <a href="#" className="notice-btn"><History size={16} /> {t('noticeBtn')}</a>
          </div>

          <nav className="terms-pagination">
            <div className="terms-prev">
              <ArrowLeft size={18} />
              <div><span>{t('prev')}</span><b>{t('prevTitle')}</b></div>
            </div>
            <a href="#section-2" className="terms-next">
              <div><span>{t('next')}</span><b>{t('nextTitle')}</b></div>
              <ArrowRight size={18} />
            </a>
          </nav>

          <button className="terms-back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp size={20} />
          </button>
        </article>
      </div>
    </main>
  );
}
