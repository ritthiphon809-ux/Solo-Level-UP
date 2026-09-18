export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface PlayerStats {
  str: number; // Strength
  agi: number; // Agility
  vit: number; // Vitality
  end: number; // Endurance
  disc: number; // Discipline
  unallocatedPoints: number;
}

export interface PlayerProfile {
  id: string;
  userId: string;
  name: string;
  title: string;
  age: number;
  height: number;
  weight: number;
  activityLevel: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'HIGH' | 'EXTREME';
  goal: string;
  availableTime: string;
  currentStreak: number;
  bestStreak: number;
  totalQuestsCompleted: number;
  awakenedAt: string;
  penaltyCount: number;
  isAwakened: boolean;
  lineUserId?: string;
  lineDisplayName?: string;
  linePairingCode?: string;
  lineLinkedAt?: string;
  lineNotifyEnabled?: boolean;
}

export interface LevelState {
  currentLevel: number;
  currentExp: number;
  nextLevelExp: number;
  rank: Rank;
  prevLevelExp?: number;
}

export interface QuestObjective {
  id: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  completed: boolean;
}

export type QuestType =
  | 'DAILY'
  | 'WEEKLY'
  | 'SPECIAL'
  | 'EMERGENCY'
  | 'DISCIPLINE'
  | 'PHYSICAL'
  | 'LEARNING'
  | 'LIFESTYLE'
  | 'RECOVERY'
  | 'PENALTY';

export interface Quest {
  id: string;
  userId: string;
  type: QuestType;
  title: string;
  subtitle: string;
  objectives: QuestObjective[];
  timeLimit: string;
  deadline: string; // ISO string
  expReward: number;
  statRewards?: Partial<Record<'str' | 'agi' | 'vit' | 'end' | 'disc', number>>;
  status: 'INCOMPLETE' | 'COMPLETED' | 'FAILED';
  penaltyQuest?: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface ExpTransaction {
  id: string;
  userId: string;
  amount: number;
  source: string;
  questId?: string;
  description: string;
  timestamp: string;
  balanceAfter: number;
}

export interface SystemNotification {
  id: string;
  userId: string;
  type: 'ASSIGNED' | 'WARNING' | 'ALERT' | 'COMPLETED' | 'LEVEL_UP' | 'RANK_UP' | 'PENALTY';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'FOUNDATION' | 'STREAK' | 'MASTERY' | 'SPECIAL';
  expReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
}

export interface SystemLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'PLAYER' | 'SYSTEM';
  text: string;
  timestamp: string;
  actionDetected?: boolean;
  questActionSummary?: string;
  expAwarded?: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
}

export interface LevelUpEvent {
  oldLevel: number;
  newLevel: number;
  statGains: {
    str: number;
    agi: number;
    vit: number;
    end: number;
    disc: number;
  };
  pointsGranted: number;
  rankChanged?: {
    oldRank: Rank;
    newRank: Rank;
  };
}

export interface LineAccountInfo {
  linked: boolean;
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  pairingCode: string;
  linkedAt?: string;
  notifyEnabled: boolean;
  webhookUrl: string;
  hasChannelSecret: boolean;
  hasAccessToken: boolean;
}

export interface LineWebhookLog {
  id: string;
  timestamp: string;
  eventType: string;
  lineUserId?: string;
  senderName?: string;
  text?: string;
  replyText?: string;
  status: 'SUCCESS' | 'UNLINKED_PROMPT' | 'ACTION_VERIFIED' | 'QUEST_COMPLETE' | 'ERROR';
  signatureVerified: boolean;
}

export interface FullPlayerData {
  user: User;
  profile: PlayerProfile;
  stats: PlayerStats;
  level: LevelState;
  activeQuests: Quest[];
  recentTransactions: ExpTransaction[];
  notifications: SystemNotification[];
  achievements: Achievement[];
  systemLogs: SystemLog[];
  chatMessages: ChatMessage[];
  lineInfo?: LineAccountInfo;
}
