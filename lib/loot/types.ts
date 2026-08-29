export type LootType = 'AUCTION' | 'RAFFLE';
export type LootStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'FINISHED' | 'CANCELLED' | 'PENDING_RESOLUTION';
export type EligibilityType = 'ALL' | 'CLASSES';

export type DkpTransactionType =
  | 'EVENT_REWARD'
  | 'MANUAL_ADD'
  | 'MANUAL_REMOVE'
  | 'AUCTION_PAYMENT'
  | 'RAFFLE_ENTRY'
  | 'DECAY'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT';

export type ReferenceType = 'EVENT' | 'LOOT' | 'MANUAL' | 'SYSTEM' | 'DECAY';

export interface LootSettings {
  dkpEnabled: boolean;
  allowNegativeDKP: boolean;
  decay: {
    enabled: boolean;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    percentage: number;
    resetDay: number; // 0-6 weekly, 1-31 monthly, days since epoch for biweekly ref
    resetTime: string; // "HH:mm"
    lastProcessedAt: FirebaseFirestore.Timestamp | null;
    nextProcessAt: FirebaseFirestore.Timestamp | null;
    timezone?: string;
  };
  antiSnipingDefault: {
    enabled: boolean;
    thresholdSeconds: number;
    extensionSeconds: number;
  };
}

export interface LootItem {
  name: string;
  image: string;
  description?: string;
}

export interface LootDoc {
  id: string;
  guildId: string;
  type: LootType;
  item: LootItem;
  status: LootStatus;
  startsAt: FirebaseFirestore.Timestamp;
  endsAt: FirebaseFirestore.Timestamp;
  eligibility: { type: EligibilityType; allowedClasses: string[] };
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  // auction
  auction?: {
    startingBid: number;
    minimumIncrement: number;
    currentBid: number;
    highestBidderId: string | null; // characterId
    bidCount: number;
    antiSniping: { enabled: boolean; thresholdSeconds: number; extensionSeconds: number };
    winnerId: string | null;
    winningBid: number | null;
    paymentProcessed: boolean;
  };
  // raffle
  raffle?: {
    entryCost: number;
    allowMultipleTickets: boolean;
    maxTicketsPerUser: number;
    totalTickets: number;
    winnerId: string | null; // characterId
    winningTicketNumber: number | null;
    drawProcessed: boolean;
  };
}

export interface BidDoc {
  id: string;
  characterId: string;
  userId: string;
  amount: number;
  createdAt: FirebaseFirestore.Timestamp;
  characterName?: string;
  characterClass?: string;
}

export interface TicketDoc {
  id: string;
  ticketNumber: number;
  characterId: string;
  userId: string;
  purchasedAt: FirebaseFirestore.Timestamp;
  purchaseTxId: string;
}

export interface ParticipantDoc {
  characterId: string;
  userId: string;
  ticketCount: number;
  totalDkpSpent: number;
  ticketNumbers: number[];
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface DkpBalanceDoc {
  characterId: string;
  userId: string;
  guildId: string;
  dkpBalance: number;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface DkpTransactionDoc {
  id: string;
  guildId: string;
  characterId: string;
  userId: string;
  amount: number;
  type: DkpTransactionType;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: ReferenceType;
  referenceId: string;
  description: string;
  createdAt: FirebaseFirestore.Timestamp;
  createdBy: string; // uid or SYSTEM
}

export const LOOT_PERMISSIONS = {
  viewLoot: 'viewLoot',
  participateLoot: 'participateLoot',
  createLoot: 'createLoot',
  editLoot: 'editLoot',
  cancelLoot: 'cancelLoot',
  manageDkp: 'manageDkp',
  manageLootSettings: 'manageLootSettings',
} as const;

export type LootPermission = typeof LOOT_PERMISSIONS[keyof typeof LOOT_PERMISSIONS];

export const DEFAULT_LOOT_SETTINGS: LootSettings = {
  dkpEnabled: true,
  allowNegativeDKP: false,
  decay: {
    enabled: false,
    frequency: 'weekly',
    percentage: 15,
    resetDay: 1, // Monday
    resetTime: '00:00',
    lastProcessedAt: null,
    nextProcessAt: null,
  },
  antiSnipingDefault: { enabled: true, thresholdSeconds: 60, extensionSeconds: 60 },
};
