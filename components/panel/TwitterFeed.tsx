'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';

interface TwitterFeedProps {
  account?: string;
}

export function TwitterFeed({ account = 'Aion2Global' }: TwitterFeedProps) {
  const t = useTranslations('GuildPanel');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const anchor = document.createElement('a');
    anchor.className = "twitter-timeline";
    anchor.setAttribute('data-height', '500');
    anchor.setAttribute('data-theme', 'dark');
    anchor.setAttribute('data-chrome', 'nofooter noborders transparent');
    anchor.setAttribute('data-tweet-limit', '5');
    anchor.href = `https://twitter.com/${account}?ref_src=twsrc%5Etfw`;
    anchor.textContent = `@${account}`;
    container.appendChild(anchor);

    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    document.body.appendChild(script);

    return () => {
      if (container.contains(anchor)) {
        container.innerHTML = '';
      }
    };
  }, [account]);

  return (
    <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-accent">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <h3 className="text-white font-heading font-semibold">{t('newsFeed')}</h3>
        </div>
        <a
          href={`https://twitter.com/${account}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
        >
          <ExternalLink size={12} />
          @{account}
        </a>
      </div>

      <div ref={containerRef} className="min-h-[200px] [&_iframe]:!border-none [&_iframe]:!bg-transparent" />

      <div className="mt-3 pt-3 border-t border-[rgba(38,51,86,0.3)]">
        <p className="text-muted text-xs text-center">
          {t('twitterFeedNote')}
        </p>
      </div>
    </div>
  );
}
