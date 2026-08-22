'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/admin/firebase/client';
import { cn } from '@/lib/admin/utils/cn';
import { ANALYSIS_TYPE_CONFIG, type AnalysisRequest, type AnalysisSubmission } from '@/lib/analyses/types';
import { UploadView } from './UploadView';
import { RequestView } from './RequestView';
import { ReviewListView } from './ReviewListView';
import {
  BarChart3,
  Send,
  ClipboardList,
  Eye,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type AnalysisTabId = 'submit' | 'request' | 'review';

interface AnalysisTabsProps {
  guildId: string;
  isLeader: boolean;
  canManageEvents: boolean;
  canManageMembers: boolean;
  memberIds: string[];
  memberNames: Record<string, string>;
}

export function AnalysisTabs({
  guildId,
  isLeader,
  canManageEvents,
  canManageMembers,
  memberIds,
  memberNames,
}: AnalysisTabsProps) {
  const t = useTranslations('GuildPanel');
  const [activeTab, setActiveTab] = useState<AnalysisTabId>('submit');
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setUid(user?.uid ?? null);
    });
    return unsub;
  }, []);

  const tabs = useMemo(() => {
    const items: { id: AnalysisTabId; label: string; icon: React.ReactNode; show: boolean }[] = [
      {
        id: 'submit',
        label: t('analysisTabSubmit'),
        icon: <Send size={18} />,
        show: true,
      },
      {
        id: 'request',
        label: t('analysisTabRequest'),
        icon: <ClipboardList size={18} />,
        show: isLeader || canManageEvents || canManageMembers,
      },
      {
        id: 'review',
        label: t('analysisTabReview'),
        icon: <Eye size={18} />,
        show: isLeader || canManageEvents || canManageMembers,
      },
    ];
    return items.filter((item) => item.show);
  }, [isLeader, canManageEvents, canManageMembers, t]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[rgba(38,51,86,0.5)] pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-accent/15 text-white border border-accent/30'
                : 'text-muted hover:text-white hover:bg-[rgba(109,40,217,0.08)]'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial="initial"
        animate="animate"
        variants={fadeUp}
      >
        {activeTab === 'submit' && (
          <UploadView
            guildId={guildId}
            uid={uid}
            memberIds={memberIds}
          />
        )}
        {activeTab === 'request' && (
          <RequestView
            guildId={guildId}
            uid={uid}
            isLeader={isLeader}
          />
        )}
        {activeTab === 'review' && (
          <ReviewListView
            guildId={guildId}
            uid={uid}
            isLeader={isLeader}
            memberNames={memberNames}
          />
        )}
      </motion.div>
    </div>
  );
}
