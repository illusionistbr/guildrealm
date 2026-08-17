'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock3,
  ClipboardList,
  Crown,
  Gamepad2,
  Globe2,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { FeatureCard } from '@/components/cards/feature-card';
import { StatCard } from '@/components/cards/stat-card';
import { SiteHeader } from '@/components/layout/site-header';
import { PrimaryButton } from '@/components/ui/primary-button';

const featureIcons = [UsersRound, ShieldCheck, Trophy, MessageSquareMore, Globe2, BarChart3] as const;
const painIcons = [Clock3, ClipboardList, Swords, MessageSquareMore] as const;

export default function Home() {
  const t = useTranslations('Home');
  const features = t.raw('features') as { title: string; text: string }[];
  const leaderPains = t.raw('leaderPains') as { title: string; text: string }[];
  const supportedGames = t.raw('supportedGames') as { name: string; abbreviation: string; genre: string; description: string }[];
  const plans = t.raw('plans') as { name: string; price: string; description: string; features: string[]; cta: string; isFree?: boolean; featured?: boolean }[];
  const stats = [
    { icon: UsersRound, value: '250K+', label: t('activePlayers') },
    { icon: ShieldCheck, value: '45K+', label: t('guildsCreated') },
    { icon: Trophy, value: '1.2M+', label: t('achievements') },
    { icon: Gamepad2, value: '150+', label: t('gamesSupported') },
    { icon: Globe2, value: '50+', label: t('countries') },
  ];

  return (
    <main>
      <SiteHeader />
      <section className="hero">
        <div className="hero-art" />
        <div className="hero-shade" />
        <div className="shell hero-content" id="inicio">
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="eyebrow">{t('heroEyebrow')}</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}>
            {t('heroFirst')} <em>{t('heroRealm')}</em><br />{t('heroSecond')} <em>{t('heroGuild')}</em> {t('heroSecond')} <em>{t('heroLegend')}</em>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="hero-copy">{t('heroText')}</motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }} className="hero-ctas">
            <PrimaryButton className="primary-cta" href="/signup">{t('startFree')} <ArrowRight size={19} /></PrimaryButton>
            <a className="secondary-cta" href="#guilds">{t('exploreGuilds')}</a>
          </motion.div>
          <div className="benefits">
            <span><ShieldCheck /> <b>{t('free')}</b><small>{t('freeCaption')}</small></span>
            <span><UsersRound /> <b>{t('globalCommunity')}</b><small>{t('playersCaption')}</small></span>
            <span><Sparkles /> <b>{t('tools')}</b><small>{t('toolsCaption')}</small></span>
          </div>
        </div>
      </section>

      <section className="shell stats" aria-label={t('statsAriaLabel')}>
        {stats.map((stat, index) => <StatCard key={stat.label} {...stat} index={index} />)}
      </section>

      <section className="leader-pains shell">
        <div className="pains-heading">
          <p className="eyebrow">{t('leaderEyebrow')}</p>
          <h2>{t('leaderTitle')}</h2>
          <p>{t('leaderText')}</p>
        </div>
        <div className="pain-grid">
          {leaderPains.map(({ title, text }, index) => {
            const Icon = painIcons[index];
            return (
              <motion.article
                className="pain-card"
                key={title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <span className="pain-icon"><Icon /></span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="features shell" id="recursos">
        <p className="eyebrow">{t('featuresEyebrow')}</p>
        <h2>{t('featuresTitle')}</h2>
        <p className="section-intro">{t('featuresText')}</p>
        <div className="feature-grid">
          {features.map((feature, index) => <FeatureCard key={feature.title} icon={featureIcons[index]} title={feature.title} text={feature.text} index={index} />)}
        </div>
      </section>

      <section className="games-section" id="jogos">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">{t('gamesEyebrow')}</p>
            <h2>{t('gamesTitle')}</h2>
            <p>{t('gamesText')}</p>
          </div>
          <div className="game-grid">
            {supportedGames.map((game, index) => (
              <article className={`game-card game-${index + 1}`} key={game.name}>
                <div className="game-overlay" />
                <span className="game-badge">{t('available')}</span>
                <div className="game-content"><span className="game-monogram">{game.abbreviation}</span><p>{game.genre}</p><h3>{game.name}</h3><p className="game-description">{game.description}</p><a href="#precos">{t('viewTools')} <ArrowRight size={16} /></a></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pricing-section shell" id="precos">
        <div className="section-heading">
          <p className="eyebrow">{t('pricingEyebrow')}</p>
          <h2>{t('pricingTitle')}</h2>
          <p>{t('pricingText')}</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article className={`pricing-card ${plan.featured ? 'featured' : ''}`} key={plan.name}>
              {plan.featured && <span className="popular-plan"><Crown size={13} /> {t('mostPopular')}</span>}
              <h3>{plan.name}</h3><p className="plan-description">{plan.description}</p>
              <p className="plan-price">{plan.price}<small>{plan.isFree ? '' : t('perMonth')}</small></p>
              <ul>{plan.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
              <PrimaryButton className="plan-cta">{plan.cta}</PrimaryButton>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
