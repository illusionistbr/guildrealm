'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, ExternalLink, Sparkles, Clock3, Gift, Percent, Star, ArrowRight, ShieldCheck, Copy, Check } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type Promotion = {
  id: string;
  partner: string;
  category: string;
  title: string;
  description: string;
  discount: string;
  image: string;
  href: string;
  badge: string;
  expiresAt: string;
  coupon?: string;
  featured?: boolean;
};

const promotions: Promotion[] = [
  {
    id: '1',
    partner: 'ExitLag',
    category: 'Otimizador de conexão',
    title: 'Ping baixo, vitória garantida',
    description: 'Melhore o ping no seu MMORPG favorito. Domine o PvP.',
    discount: '54% OFF anual • 34% OFF trimestral',
    image: '/images/guild-catalogue.png',
    href: 'https://www.exitlag.com/refer/10343552',
    badge: 'Parceiro Oficial',
    expiresAt: '',
    coupon: '10343552',
    featured: true,
  },
  {
    id: '2',
    partner: 'Nuuvem',
    category: 'Loja de jogos',
    title: 'Aion 2 — Pacote Fundador com desconto',
    description: 'Garanta itens exclusivos de pré-venda com preço especial para membros ClanForge.',
    discount: '20% OFF',
    image: '/images/clanforge-hero.png',
    href: 'https://www.nuuvem.com/?utm_source=clanforge',
    badge: 'Oferta Limitada',
    expiresAt: 'Expira em 5 dias',
    coupon: 'FORGE20',
  },
  {
    id: '3',
    partner: 'HyperX',
    category: 'Periféricos',
    title: 'Setup lendário com preço épico',
    description: 'Headsets, teclados e mouses gamer com frete grátis e parcelamento em 12x.',
    discount: 'Até 25% OFF',
    image: '/images/guild-catalogue.png',
    href: 'https://www.hyperxgaming.com/br?utm_source=clanforge',
    badge: 'Frete Grátis',
    expiresAt: 'Expira em 20 dias',
  },
  {
    id: '4',
    partner: 'Discord Nitro',
    category: 'Comunicação',
    title: 'Turbo para sua guilda',
    description: '3 meses de Nitro grátis para impulsionar o servidor da sua guilda.',
    discount: '3 meses grátis',
    image: '/images/clanforge-hero.png',
    href: 'https://discord.com/nitro?utm_source=clanforge',
    badge: 'Benefício Exclusivo',
    expiresAt: 'Vagas limitadas',
  },
  {
    id: '5',
    partner: 'Logitech G',
    category: 'Periféricos',
    title: 'Precisão de campeão',
    description: 'Combo G502 + G915 com desconto progressivo para guildas ClanForge.',
    discount: 'R$ 400 OFF',
    image: '/images/guild-catalogue.png',
    href: 'https://www.logitechg.com/pt-br?utm_source=clanforge',
    badge: 'Desconto Progressivo',
    expiresAt: 'Expira em 8 dias',
    coupon: 'FORGE400',
  },
  {
    id: '6',
    partner: 'Opera GX',
    category: 'Navegador gamer',
    title: 'Navegador feito para gamers',
    description: 'Controle RAM, CPU e integre Twitch/Discord direto no navegador.',
    discount: 'Recompensa exclusiva',
    image: '/images/clanforge-hero.png',
    href: 'https://www.opera.com/gx?utm_source=clanforge',
    badge: 'Grátis',
    expiresAt: 'Sem expiração',
  },
];

const categories = ['Todas', ...Array.from(new Set(promotions.map((p) => p.category)))] as const;

export default function PromotionsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todas');

  const handleCopy = async (e: React.MouseEvent, promo: Promotion) => {
    e.preventDefault();
    e.stopPropagation();
    if (!promo.coupon) return;
    try {
      await navigator.clipboard.writeText(promo.coupon);
      setCopiedId(promo.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback: cria input temporário
      const el = document.createElement('input');
      el.value = promo.coupon;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedId(promo.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Tag size={20} className="text-accent" />
          </span>
          <p className="text-xs font-bold tracking-widest text-accent uppercase">Benefícios Exclusivos</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">Promoções</h1>
        <p className="text-muted mt-2 max-w-2xl">
          Ofertas curadas dos nossos parceiros para sua jornada. Cada banner leva direto ao desconto — use o cupom quando disponível e economize.
        </p>
      </motion.div>

      {/* Info bar */}
      <motion.div
        variants={fadeUp}
        className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-accent/20 bg-accent/5"
      >
        <div className="flex items-center gap-2 text-sm text-white">
          <ShieldCheck size={16} className="text-accent" />
          Parceiros verificados pela ClanForge
        </div>
        <span className="hidden sm:block w-px h-4 bg-[rgba(38,51,86,0.5)]" />
        <span className="text-xs text-muted flex items-center gap-1.5">
          <Gift size={14} className="text-accent" /> Cupons exclusivos
        </span>
        <span className="text-xs text-muted flex items-center gap-1.5">
          <Percent size={14} className="text-accent" /> Descontos reais
        </span>
        <span className="ml-auto text-xs text-muted flex items-center gap-1">
          <Star size={12} className="text-yellow-400" /> Novos parceiros toda semana
        </span>
      </motion.div>

      {/* Categories */}
      <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium border transition-all ${
              activeCategory === cat
                ? 'bg-accent border-accent text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                : 'bg-[rgba(19,29,48,0.6)] border-[rgba(38,51,86,0.5)] text-muted hover:text-white hover:border-accent/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Featured */}
      {promotions
        .filter((p) => p.featured && (activeCategory === 'Todas' || p.category === activeCategory))
        .map((promo) => (
        <motion.a
          key={promo.id}
          variants={fadeUp}
          href={promo.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-[rgba(109,40,217,0.15)] to-[rgba(10,18,32,0.6)] block hover:border-accent/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]"
        >
          <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity" style={{ background: `url('${promo.image}') center/cover` }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050912] via-[#050912]/85 to-transparent" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6 p-6 md:p-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-white/80">{promo.partner}</span>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent font-medium">
                  {promo.category}
                </span>
                {promo.expiresAt && (
                  <span className="text-xs text-muted flex items-center gap-1"><Clock3 size={11} />{promo.expiresAt}</span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-heading font-bold text-white">{promo.title}</h2>
              <p className="text-sm text-muted mt-2 max-w-lg">{promo.description}</p>
              {promo.coupon && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-accent/40 bg-accent/10">
                  <Gift size={14} className="text-accent" />
                  <span className="text-xs text-muted">Cupom:</span>
                  <span className="text-sm font-bold tracking-wider text-white">{promo.coupon}</span>
                  <button
                    onClick={(e) => handleCopy(e, promo)}
                    title={copiedId === promo.id ? 'Copiado!' : 'Copiar cupom'}
                    className="ml-1 p-1 rounded-md bg-[#050912]/40 hover:bg-accent/20 border border-white/10 hover:border-accent/30 text-white/70 hover:text-accent transition-all"
                  >
                    {copiedId === promo.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
              <span className="text-3xl font-heading font-black text-accent">{promo.discount}</span>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium group-hover:bg-accent-hover transition-colors">
                Resgatar oferta <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
              <span className="text-[11px] text-muted flex items-center gap-1">
                <ExternalLink size={11} /> Abre em nova aba
              </span>
            </div>
          </div>
        </motion.a>
      ))}

      {/* Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions
          .filter((p) => !p.featured && (activeCategory === 'Todas' || p.category === activeCategory))
          .map((promo, i) => (
          <motion.a
            key={promo.id}
            href={promo.href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative overflow-hidden rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] hover:border-accent/30 hover:shadow-[0_8px_30px_rgba(109,40,217,0.12)] transition-all duration-300 flex flex-col"
          >
            {/* Banner image */}
            <div className="relative h-36 overflow-hidden">
              <div className="absolute inset-0" style={{ background: `url('${promo.image}') center/cover` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1122] via-[#0a1122]/40 to-transparent" />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded-full bg-accent/90 text-white border border-accent">
                  {promo.badge}
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white text-[#050912] shadow">
                  {promo.discount}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-white/90 bg-black/30 backdrop-blur px-2 py-1 rounded-full border border-white/10">
                    {promo.partner}
                  </span>
                  <span className="hidden sm:inline text-[10px] font-medium text-accent bg-accent/20 backdrop-blur px-2 py-1 rounded-full border border-accent/30">
                    {promo.category}
                  </span>
                </div>
                {promo.expiresAt && (
                  <span className="text-[11px] text-white/70 flex items-center gap-1 shrink-0">
                    <Clock3 size={11} /> {promo.expiresAt}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-sm font-heading font-bold text-white group-hover:text-accent transition-colors line-clamp-2">
                {promo.title}
              </h3>
              <p className="text-xs text-muted mt-1.5 line-clamp-2 leading-relaxed">{promo.description}</p>

              {promo.coupon && (
                <div className="mt-3 inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg border border-dashed border-accent/30 bg-accent/10">
                  <Tag size={12} className="text-accent" />
                  <span className="text-[11px] font-bold tracking-wider text-white">{promo.coupon}</span>
                  <button
                    onClick={(e) => handleCopy(e, promo)}
                    title={copiedId === promo.id ? 'Copiado!' : 'Copiar cupom'}
                    className="ml-1 p-1 rounded bg-[#050912]/40 hover:bg-accent/20 text-white/70 hover:text-accent transition-colors"
                  >
                    {copiedId === promo.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-[rgba(38,51,86,0.3)] flex items-center justify-between">
                <span className="text-xs text-muted flex items-center gap-1">
                  <ExternalLink size={12} /> Ver oferta
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent group-hover:gap-1.5 transition-all">
                  Acessar <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </motion.a>
        ))}
      </motion.div>

      {/* Footer CTA */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl border border-dashed border-[rgba(38,51,86,0.4)] p-6 text-center bg-[rgba(10,18,32,0.3)]"
      >
        <p className="text-sm text-white font-medium flex items-center justify-center gap-2">
          <Sparkles size={16} className="text-accent" /> Quer ver sua marca aqui?
        </p>
        <p className="text-xs text-muted mt-1 max-w-lg mx-auto">
          Somos abertos a parcerias com marcas que elevam a experiência dos jogadores. Entre em contato e apareça para milhares de guildas.
        </p>
        <a
          href="mailto:parcerias@clanforge.com"
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg border border-[rgba(38,51,86,0.5)] text-sm text-muted hover:text-white hover:border-accent/30 transition-colors"
        >
          Falar com parcerias <ArrowRight size={14} />
        </a>
      </motion.div>
    </motion.div>
  );
}
