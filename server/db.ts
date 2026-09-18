import fs from 'fs';
import path from 'path';
import {
  User,
  PlayerProfile,
  PlayerStats,
  LevelState,
  Rank,
  Quest,
  ExpTransaction,
  SystemNotification,
  Achievement,
  SystemLog,
  ChatMessage,
  LevelUpEvent,
  FullPlayerData,
  LineAccountInfo,
  LineWebhookLog,
} from '../src/types.js';

interface DatabaseSchema {
  users: Record<string, User>;
  profiles: Record<string, PlayerProfile>;
  stats: Record<string, PlayerStats>;
  levels: Record<string, LevelState>;
  quests: Record<string, Quest[]>;
  expTransactions: Record<string, ExpTransaction[]>;
  notifications: Record<string, SystemNotification[]>;
  achievements: Record<string, Achievement[]>;
  systemLogs: Record<string, SystemLog[]>;
  chatMessages: Record<string, ChatMessage[]>;
  lineBindings?: Record<string, string>; // lineUserId -> userId
  linePairingCodes?: Record<string, string>; // pairingCode -> userId
  lineWebhookLogs?: LineWebhookLog[];
}

const DB_FILE = process.env.VERCEL
  ? path.join('/tmp', 'system_data.json')
  : path.join(process.cwd(), 'system_data.json');

// Default initial achievements catalog
const INITIAL_ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'progress' | 'unlockedAt'>[] = [
  {
    id: 'ach_first_awakening',
    code: 'AWAKENING',
    title: 'THE AWAKENING',
    description: 'Received the System and completed Player Identification.',
    category: 'FOUNDATION',
    expReward: 100,
    maxProgress: 1,
  },
  {
    id: 'ach_first_quest',
    code: 'FIRST_QUEST',
    title: 'FIRST STEP',
    description: 'Complete your first assigned System Quest.',
    category: 'FOUNDATION',
    expReward: 150,
    maxProgress: 1,
  },
  {
    id: 'ach_streak_7',
    code: 'SURVIVOR_7',
    title: '7-DAY SURVIVOR',
    description: 'Complete quests for 7 consecutive days without failing.',
    category: 'STREAK',
    expReward: 350,
    maxProgress: 7,
  },
  {
    id: 'ach_streak_30',
    code: 'IRON_WILL_30',
    title: 'IRON WILL',
    description: 'Maintain a 30-day continuous System streak.',
    category: 'STREAK',
    expReward: 1000,
    maxProgress: 30,
  },
  {
    id: 'ach_disc_50',
    code: 'DISCIPLINED_50',
    title: 'DISCIPLINED',
    description: 'Successfully fulfill 50 System quests.',
    category: 'MASTERY',
    expReward: 500,
    maxProgress: 50,
  },
  {
    id: 'ach_disc_100',
    code: 'CENTURION_100',
    title: 'CENTURION',
    description: 'Successfully fulfill 100 System quests.',
    category: 'MASTERY',
    expReward: 1200,
    maxProgress: 100,
  },
  {
    id: 'ach_rank_c',
    code: 'RANK_C_PROMOTION',
    title: 'ADVANCED PROTAGONIST',
    description: 'Achieve System Rank C classification.',
    category: 'MASTERY',
    expReward: 400,
    maxProgress: 1,
  },
  {
    id: 'ach_emergency',
    code: 'LIMIT_BREAKER',
    title: 'LIMIT BREAKER',
    description: 'Overcome a high-stress Emergency Quest before expiration.',
    category: 'SPECIAL',
    expReward: 600,
    maxProgress: 1,
  },
];

export function calculateExpRequirement(level: number): number {
  if (level <= 1) return 100;
  // Formula: base 100 * (level ^ 1.42)
  return Math.floor(100 * Math.pow(level, 1.42));
}

export function calculateRank(level: number, totalQuests: number): Rank {
  if (level >= 45 && totalQuests >= 200) return 'S';
  if (level >= 30 && totalQuests >= 120) return 'A';
  if (level >= 18 && totalQuests >= 60) return 'B';
  if (level >= 10 && totalQuests >= 25) return 'C';
  if (level >= 5) return 'D';
  return 'E';
}

class SystemDatabase {
  private data: DatabaseSchema = {
    users: {},
    profiles: {},
    stats: {},
    levels: {},
    quests: {},
    expTransactions: {},
    notifications: {},
    achievements: {},
    systemLogs: {},
    chatMessages: {},
  };

  constructor() {
    this.load();
    this.seedDefaultsIfNeeded();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else if (process.env.VERCEL) {
        const seedFile = path.join(process.cwd(), 'system_data.json');
        if (fs.existsSync(seedFile)) {
          const raw = fs.readFileSync(seedFile, 'utf-8');
          this.data = JSON.parse(raw);
          try {
            fs.writeFileSync(DB_FILE, raw, 'utf-8');
          } catch {
            // Ignore /tmp write warning
          }
        }
      }
    } catch (err) {
      console.error('Failed to load system_data.json, initializing fresh memory state', err);
    }
    this.data.lineBindings = this.data.lineBindings || {};
    this.data.linePairingCodes = this.data.linePairingCodes || {};
    this.data.lineWebhookLogs = this.data.lineWebhookLogs || [];
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save system_data.json', err);
    }
  }

  private seedDefaultsIfNeeded() {
    // Seed OHM (matching user prompt example)
    if (!this.data.users['user_ohm']) {
      const ohmUser: User = { id: 'user_ohm', username: 'ohm', name: 'OHM' };
      this.data.users['user_ohm'] = ohmUser;
      this.data.profiles['user_ohm'] = {
        id: 'prof_ohm',
        userId: 'user_ohm',
        name: 'OHM',
        title: 'SHADOW PROTAGONIST',
        age: 26,
        height: 178,
        weight: 73,
        activityLevel: 'HIGH',
        goal: 'Complete Physical & Mental Transformation',
        availableTime: '60-90 min/day',
        currentStreak: 17,
        bestStreak: 21,
        totalQuestsCompleted: 128,
        awakenedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
        penaltyCount: 1,
        isAwakened: true,
      };
      this.data.stats['user_ohm'] = {
        str: 18,
        agi: 15,
        vit: 20,
        end: 17,
        disc: 24,
        unallocatedPoints: 2,
      };
      this.data.levels['user_ohm'] = {
        currentLevel: 12,
        currentExp: 2450,
        nextLevelExp: 3000,
        rank: 'C',
      };
      this.data.quests['user_ohm'] = [
        {
          id: 'quest_ohm_daily_1',
          userId: 'user_ohm',
          type: 'DAILY',
          title: 'THE FOUNDATION PROTOCOL',
          subtitle: 'Daily Physical Calibration',
          objectives: [
            { id: 'obj_1', description: 'Push-ups', target: 50, current: 30, unit: 'reps', completed: false },
            { id: 'obj_2', description: 'Bodyweight Squats', target: 80, current: 80, unit: 'reps', completed: true },
            { id: 'obj_3', description: 'Zone 2 Brisk Walk / Run', target: 30, current: 15, unit: 'min', completed: false },
          ],
          timeLimit: '23:59:59',
          deadline: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
          expReward: 150,
          statRewards: { str: 1, end: 1 },
          status: 'INCOMPLETE',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'quest_ohm_disc_1',
          userId: 'user_ohm',
          type: 'DISCIPLINE',
          title: 'NEURAL CONCENTRATION',
          subtitle: 'High Focus Deep Work Session',
          objectives: [
            { id: 'obj_4', description: 'Zero Phone Distraction Work', target: 45, current: 45, unit: 'min', completed: true },
            { id: 'obj_5', description: 'Read Technical / Knowledge Material', target: 20, current: 0, unit: 'pages', completed: false },
          ],
          timeLimit: '23:59:59',
          deadline: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
          expReward: 120,
          statRewards: { disc: 1 },
          status: 'INCOMPLETE',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'quest_ohm_emerg_1',
          userId: 'user_ohm',
          type: 'EMERGENCY',
          title: 'SUDDEN OVERCOMING',
          subtitle: 'System Fatigue Override Protocol',
          objectives: [
            { id: 'obj_6', description: 'Cold Water Hydration & Electrolytes', target: 1000, current: 1000, unit: 'ml', completed: true },
            { id: 'obj_7', description: 'Spinal Mobility & Stretching', target: 15, current: 15, unit: 'min', completed: true },
          ],
          timeLimit: '02:00:00',
          deadline: new Date(Date.now() + 2 * 3600000).toISOString(),
          expReward: 300,
          statRewards: { vit: 1, disc: 1 },
          status: 'COMPLETED',
          completedAt: new Date(Date.now() - 3600000).toISOString(),
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ];
      this.data.expTransactions['user_ohm'] = [
        {
          id: 'tx_ohm_1',
          userId: 'user_ohm',
          amount: 300,
          source: 'EMERGENCY_QUEST',
          questId: 'quest_ohm_emerg_1',
          description: 'EMERGENCY QUEST OVERCOME: Sudden Overcoming',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          balanceAfter: 2450,
        },
        {
          id: 'tx_ohm_2',
          userId: 'user_ohm',
          amount: 150,
          source: 'DAILY_QUEST',
          description: 'DAILY QUEST COMPLETE: Foundation Day 16',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          balanceAfter: 2150,
        },
        {
          id: 'tx_ohm_3',
          userId: 'user_ohm',
          amount: 250,
          source: 'SPECIAL_QUEST',
          description: 'SPECIAL QUEST: Weekend Endurance Milestone',
          timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
          balanceAfter: 2000,
        },
      ];
      this.data.notifications['user_ohm'] = [
        {
          id: 'notif_ohm_1',
          userId: 'user_ohm',
          type: 'ALERT',
          title: 'QUEST DEADLINE APPROACHING',
          message: 'Foundation Protocol remaining objectives pending verification. Deadline: 23:59.',
          timestamp: new Date().toISOString(),
          read: false,
        },
        {
          id: 'notif_ohm_2',
          userId: 'user_ohm',
          type: 'COMPLETED',
          title: 'EMERGENCY QUEST CLEARED',
          message: 'Sudden Overcoming verified. +300 EXP recorded.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: true,
        },
      ];
      this.initUserAchievements('user_ohm', 128, 17, 12, 'C');
      this.data.systemLogs['user_ohm'] = [
        { id: 'log_1', userId: 'user_ohm', action: 'SYSTEM_BOOT', details: 'Player Ohm system session active.', timestamp: new Date().toISOString() },
        { id: 'log_2', userId: 'user_ohm', action: 'QUEST_VERIFIED', details: 'Push-ups 30/50 logged via action verification.', timestamp: new Date(Date.now() - 1800000).toISOString() },
      ];
      this.data.chatMessages['user_ohm'] = [
        {
          id: 'msg_ohm_1',
          sender: 'SYSTEM',
          text: '[SYSTEM]\nDAILY QUEST ASSIGNED.\nPLAYER: OHM\nLEVEL: 12\nRANK: C\n\nOBJECTIVES:\n- PUSH-UP × 50\n- SQUAT × 80\n- WALK × 30 MIN\n\nCOMPLETE BEFORE 23:59.',
          timestamp: new Date(Date.now() - 28800000).toISOString(),
        },
        {
          id: 'msg_ohm_2',
          sender: 'PLAYER',
          text: 'วันนี้ทำ push-up ไปแล้ว 30 ครั้ง',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'msg_ohm_3',
          sender: 'SYSTEM',
          text: '[SYSTEM]\nACTION DETECTED.\n\nPUSH-UP: 30 / 50\nREMAINING: 20 REPS\n\nSTATUS: IN PROGRESS.\nMAINTAIN DISCIPLINE.',
          timestamp: new Date(Date.now() - 1795000).toISOString(),
          actionDetected: true,
          questActionSummary: 'PUSH-UP: 30 / 50',
        },
      ];
    }

    // Seed JANE (matching user prompt example: brand new level 1 player, 0/100 EXP)
    if (!this.data.users['user_jane']) {
      const janeUser: User = { id: 'user_jane', username: 'jane', name: 'JANE' };
      this.data.users['user_jane'] = janeUser;
      this.data.profiles['user_jane'] = {
        id: 'prof_jane',
        userId: 'user_jane',
        name: 'JANE',
        title: 'ROOKIE PROTAGONIST',
        age: 23,
        height: 165,
        weight: 56,
        activityLevel: 'LIGHT',
        goal: 'Build Daily Habit & Endurance',
        availableTime: '30-45 min/day',
        currentStreak: 1,
        bestStreak: 1,
        totalQuestsCompleted: 0,
        awakenedAt: new Date().toISOString(),
        penaltyCount: 0,
        isAwakened: true,
      };
      this.data.stats['user_jane'] = {
        str: 10,
        agi: 10,
        vit: 10,
        end: 10,
        disc: 10,
        unallocatedPoints: 0,
      };
      this.data.levels['user_jane'] = {
        currentLevel: 1,
        currentExp: 0,
        nextLevelExp: 100,
        rank: 'E',
      };
      this.data.quests['user_jane'] = [
        {
          id: 'quest_jane_daily_1',
          userId: 'user_jane',
          type: 'DAILY',
          title: 'INITIAL AWAKENING PROTOCOL',
          subtitle: 'Baseline Physical Assessment',
          objectives: [
            { id: 'obj_j1', description: 'Wall or Knee Push-ups', target: 15, current: 0, unit: 'reps', completed: false },
            { id: 'obj_j2', description: 'Bodyweight Squats', target: 20, current: 0, unit: 'reps', completed: false },
            { id: 'obj_j3', description: 'Gentle Stride Walk', target: 20, current: 0, unit: 'min', completed: false },
          ],
          timeLimit: '23:59:59',
          deadline: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
          expReward: 100,
          statRewards: { str: 1, vit: 1 },
          status: 'INCOMPLETE',
          createdAt: new Date().toISOString(),
        },
      ];
      this.data.expTransactions['user_jane'] = [];
      this.data.notifications['user_jane'] = [
        {
          id: 'notif_jane_1',
          userId: 'user_jane',
          type: 'ASSIGNED',
          title: 'SYSTEM INITIALIZATION COMPLETE',
          message: 'WELCOME, PLAYER JANE. Level 01 [Rank E] assigned. Your first quest awaits.',
          timestamp: new Date().toISOString(),
          read: false,
        },
      ];
      this.initUserAchievements('user_jane', 0, 1, 1, 'E');
      this.data.systemLogs['user_jane'] = [
        { id: 'log_j1', userId: 'user_jane', action: 'SYSTEM_INITIALIZED', details: 'Player JANE initialized.', timestamp: new Date().toISOString() },
      ];
      this.data.chatMessages['user_jane'] = [
        {
          id: 'msg_jane_1',
          sender: 'SYSTEM',
          text: '[SYSTEM]\nPLAYER IDENTIFICATION COMPLETE.\n\nPLAYER: JANE\nLEVEL: 01\nRANK: E\nEXP: 0 / 100\n\nSYSTEM INITIALIZATION COMPLETE.\nWELCOME, PLAYER.',
          timestamp: new Date().toISOString(),
        },
      ];
    }

    this.save();
  }

  private initUserAchievements(userId: string, questsDone: number, streak: number, level: number, rank: Rank) {
    this.data.achievements[userId] = INITIAL_ACHIEVEMENTS.map((tpl) => {
      let progress = 0;
      let unlocked = false;

      if (tpl.code === 'AWAKENING') {
        progress = 1;
        unlocked = true;
      } else if (tpl.code === 'FIRST_QUEST') {
        progress = questsDone >= 1 ? 1 : 0;
        unlocked = questsDone >= 1;
      } else if (tpl.code === 'SURVIVOR_7') {
        progress = Math.min(streak, 7);
        unlocked = streak >= 7;
      } else if (tpl.code === 'IRON_WILL_30') {
        progress = Math.min(streak, 30);
        unlocked = streak >= 30;
      } else if (tpl.code === 'DISCIPLINED_50') {
        progress = Math.min(questsDone, 50);
        unlocked = questsDone >= 50;
      } else if (tpl.code === 'CENTURION_100') {
        progress = Math.min(questsDone, 100);
        unlocked = questsDone >= 100;
      } else if (tpl.code === 'RANK_C_PROMOTION') {
        progress = rank !== 'E' && rank !== 'D' ? 1 : 0;
        unlocked = rank !== 'E' && rank !== 'D';
      } else if (tpl.code === 'LIMIT_BREAKER') {
        progress = questsDone >= 10 ? 1 : 0;
        unlocked = questsDone >= 10;
      }

      return {
        ...tpl,
        progress,
        unlocked,
        unlockedAt: unlocked ? new Date().toISOString() : undefined,
      };
    });
  }

  public getUsers(): User[] {
    return Object.values(this.data.users);
  }

  public getUser(userId: string): User | null {
    return this.data.users[userId] || null;
  }

  public createPlayer(payload: {
    name: string;
    age: number;
    height: number;
    weight: number;
    activityLevel: PlayerProfile['activityLevel'];
    goal: string;
    availableTime: string;
  }): FullPlayerData {
    const cleanName = payload.name.trim().toUpperCase() || 'PLAYER';
    const userId = `user_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}`;

    const user: User = {
      id: userId,
      username: cleanName.toLowerCase(),
      name: cleanName,
    };

    const profile: PlayerProfile = {
      id: `prof_${userId}`,
      userId,
      name: cleanName,
      title: 'AWAKENED PROTAGONIST',
      age: payload.age || 25,
      height: payload.height || 175,
      weight: payload.weight || 70,
      activityLevel: payload.activityLevel || 'MODERATE',
      goal: payload.goal || 'Physical & Mental Mastery',
      availableTime: payload.availableTime || '45 min/day',
      currentStreak: 1,
      bestStreak: 1,
      totalQuestsCompleted: 0,
      awakenedAt: new Date().toISOString(),
      penaltyCount: 0,
      isAwakened: true,
    };

    // Calculate baseline stats according to activity level
    const baseStat = payload.activityLevel === 'HIGH' || payload.activityLevel === 'EXTREME' ? 12 : 10;
    const stats: PlayerStats = {
      str: baseStat,
      agi: baseStat,
      vit: baseStat + 1,
      end: baseStat,
      disc: baseStat + 1,
      unallocatedPoints: 0,
    };

    const level: LevelState = {
      currentLevel: 1,
      currentExp: 0,
      nextLevelExp: 100,
      rank: 'E',
    };

    // Generate initial personalized quest
    const initialQuest = this.generateAdaptiveQuest(userId, level, stats, profile, 'DAILY');

    this.data.users[userId] = user;
    this.data.profiles[userId] = profile;
    this.data.stats[userId] = stats;
    this.data.levels[userId] = level;
    this.data.quests[userId] = [initialQuest];
    this.data.expTransactions[userId] = [];
    this.data.notifications[userId] = [
      {
        id: `notif_${Date.now()}`,
        userId,
        type: 'ASSIGNED',
        title: 'SYSTEM INITIALIZATION COMPLETE',
        message: `PLAYER IDENTIFICATION COMPLETE: ${cleanName}. LEVEL 01 [RANK E]. THE SYSTEM HAS BEEN ACTIVATED.`,
        timestamp: new Date().toISOString(),
        read: false,
      },
    ];
    this.initUserAchievements(userId, 0, 1, 1, 'E');
    this.data.systemLogs[userId] = [
      {
        id: `log_${Date.now()}`,
        userId,
        action: 'AWAKENING_COMPLETE',
        details: `Player ${cleanName} completed System Awakening calibration.`,
        timestamp: new Date().toISOString(),
      },
    ];
    this.data.chatMessages[userId] = [
      {
        id: `msg_${Date.now()}`,
        sender: 'SYSTEM',
        text: `[SYSTEM]\nPLAYER IDENTIFICATION COMPLETE.\n\nPLAYER: ${cleanName}\nLEVEL: 01\nRANK: E\nEXP: 0 / 100\n\nSYSTEM INITIALIZATION COMPLETE.\nWELCOME, PLAYER.`,
        timestamp: new Date().toISOString(),
      },
    ];

    this.save();
    return this.getFullPlayerData(userId)!;
  }

  public getFullPlayerData(userId: string): FullPlayerData | null {
    const user = this.data.users[userId];
    if (!user) return null;

    const profile = this.data.profiles[userId] || {
      id: `prof_${userId}`,
      userId,
      name: user.name,
      title: 'PROTAGONIST',
      age: 25,
      height: 175,
      weight: 70,
      activityLevel: 'MODERATE',
      goal: 'Self-Transcendence',
      availableTime: '45 min',
      currentStreak: 1,
      bestStreak: 1,
      totalQuestsCompleted: 0,
      awakenedAt: new Date().toISOString(),
      penaltyCount: 0,
      isAwakened: true,
    };

    const pairingCode = this.getOrCreatePairingCode(userId);
    const lineInfo: LineAccountInfo = {
      linked: !!profile.lineUserId,
      lineUserId: profile.lineUserId,
      lineDisplayName: profile.lineDisplayName,
      pairingCode,
      linkedAt: profile.lineLinkedAt,
      notifyEnabled: profile.lineNotifyEnabled ?? true,
      webhookUrl: `${process.env.APP_URL || ''}/api/line/webhook`,
      hasChannelSecret: !!process.env.LINE_CHANNEL_SECRET,
      hasAccessToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
    };

    return {
      user,
      profile,
      stats: this.data.stats[userId] || { str: 10, agi: 10, vit: 10, end: 10, disc: 10, unallocatedPoints: 0 },
      level: this.data.levels[userId] || { currentLevel: 1, currentExp: 0, nextLevelExp: 100, rank: 'E' },
      activeQuests: this.data.quests[userId] || [],
      recentTransactions: (this.data.expTransactions[userId] || []).slice(0, 20),
      notifications: this.data.notifications[userId] || [],
      achievements: this.data.achievements[userId] || [],
      systemLogs: (this.data.systemLogs[userId] || []).slice(0, 30),
      chatMessages: (this.data.chatMessages[userId] || []).slice(-40),
      lineInfo,
    };
  }

  public awardExp(
    userId: string,
    amount: number,
    source: string,
    description: string,
    questId?: string
  ): {
    newExp: number;
    newLevel: number;
    levelUpEvents: LevelUpEvent[];
  } {
    const levelState = this.data.levels[userId] || { currentLevel: 1, currentExp: 0, nextLevelExp: 100, rank: 'E' };
    const stats = this.data.stats[userId] || { str: 10, agi: 10, vit: 10, end: 10, disc: 10, unallocatedPoints: 0 };
    const profile = this.data.profiles[userId];

    let currentExp = levelState.currentExp + amount;
    let currentLevel = levelState.currentLevel;
    let nextLevelExp = levelState.nextLevelExp;
    const levelUpEvents: LevelUpEvent[] = [];

    while (currentExp >= nextLevelExp) {
      const oldLevel = currentLevel;
      currentExp -= nextLevelExp;
      currentLevel += 1;
      nextLevelExp = calculateExpRequirement(currentLevel);

      // Automated base stat gains + unallocated points
      const statGains = {
        str: currentLevel % 2 === 0 ? 1 : 0,
        agi: currentLevel % 3 === 0 ? 1 : 0,
        vit: 1,
        end: currentLevel % 2 === 1 ? 1 : 0,
        disc: 2,
      };

      stats.str += statGains.str;
      stats.agi += statGains.agi;
      stats.vit += statGains.vit;
      stats.end += statGains.end;
      stats.disc += statGains.disc;
      stats.unallocatedPoints += 3; // 3 free customizable attribute points per level!

      const oldRank = levelState.rank;
      const newRank = calculateRank(currentLevel, profile ? profile.totalQuestsCompleted : 0);
      const rankChanged = oldRank !== newRank ? { oldRank, newRank } : undefined;

      if (rankChanged) {
        levelState.rank = newRank;
        this.addNotification(
          userId,
          'RANK_UP',
          'RANK CLASSIFICATION ELEVATED',
          `[SYSTEM]\nRANK UP: ${oldRank} → ${newRank}\nPLAYER HAS ENTERED A NEW CLASSIFICATION.`
        );
      }

      levelUpEvents.push({
        oldLevel,
        newLevel: currentLevel,
        statGains,
        pointsGranted: 3,
        rankChanged,
      });

      this.addNotification(
        userId,
        'LEVEL_UP',
        'PLAYER LEVEL UP',
        `[SYSTEM]\nLEVEL UP: ${oldLevel} → ${currentLevel}\nPLAYER HAS GROWN STRONGER.\n+${statGains.str} STR, +${statGains.vit} VIT, +${statGains.disc} DISC.\n3 STAT POINTS GRANTED.`
      );

      this.addSystemLog(
        userId,
        'LEVEL_UP',
        `Level upgraded from ${oldLevel} to ${currentLevel}. Total points granted: 3.`
      );
    }

    levelState.currentExp = currentExp;
    levelState.currentLevel = currentLevel;
    levelState.nextLevelExp = nextLevelExp;

    // Record EXP Transaction
    const tx: ExpTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      amount,
      source,
      questId,
      description,
      timestamp: new Date().toISOString(),
      balanceAfter: currentExp,
    };
    if (!this.data.expTransactions[userId]) {
      this.data.expTransactions[userId] = [];
    }
    this.data.expTransactions[userId].unshift(tx);

    this.data.levels[userId] = levelState;
    this.data.stats[userId] = stats;
    this.save();

    return {
      newExp: currentExp,
      newLevel: currentLevel,
      levelUpEvents,
    };
  }

  public allocateStatPoint(userId: string, statKey: keyof Omit<PlayerStats, 'unallocatedPoints'>): boolean {
    const stats = this.data.stats[userId];
    if (!stats || stats.unallocatedPoints <= 0) return false;

    stats[statKey] += 1;
    stats.unallocatedPoints -= 1;
    this.data.stats[userId] = stats;

    this.addSystemLog(
      userId,
      'STAT_ALLOCATED',
      `Allocated 1 attribute point to ${statKey.toUpperCase()}. Current: ${stats[statKey]}. Remaining: ${stats.unallocatedPoints}.`
    );

    this.save();
    return true;
  }

  public updateQuestObjective(
    userId: string,
    questId: string,
    objectiveId: string,
    increment: number
  ): { quest: Quest | null; completedNow: boolean; expAwarded: number; levelUps: LevelUpEvent[] } {
    const quests = this.data.quests[userId] || [];
    const quest = quests.find((q) => q.id === questId);
    if (!quest || quest.status === 'COMPLETED') {
      return { quest: null, completedNow: false, expAwarded: 0, levelUps: [] };
    }

    const obj = quest.objectives.find((o) => o.id === objectiveId);
    if (!obj) return { quest: null, completedNow: false, expAwarded: 0, levelUps: [] };

    obj.current = Math.min(obj.target, Math.max(0, obj.current + increment));
    obj.completed = obj.current >= obj.target;

    const allCompleted = quest.objectives.every((o) => o.completed);
    let expAwarded = 0;
    let levelUps: LevelUpEvent[] = [];

    if (allCompleted) {
      quest.status = 'COMPLETED';
      quest.completedAt = new Date().toISOString();

      // Award EXP
      const expRes = this.awardExp(
        userId,
        quest.expReward,
        quest.type + '_QUEST',
        `QUEST COMPLETED: ${quest.title}`,
        quest.id
      );
      expAwarded = quest.expReward;
      levelUps = expRes.levelUpEvents;

      // Update Profile Metrics
      const profile = this.data.profiles[userId];
      if (profile) {
        profile.totalQuestsCompleted += 1;
        profile.currentStreak += 1;
        if (profile.currentStreak > profile.bestStreak) {
          profile.bestStreak = profile.currentStreak;
        }
      }

      // Check achievements
      this.checkAchievements(userId);

      // Notification
      this.addNotification(
        userId,
        'COMPLETED',
        'QUEST COMPLETE',
        `[SYSTEM]\nQUEST COMPLETE.\n${quest.title}\n+${quest.expReward} EXP REWARDED.`
      );

      this.addSystemLog(
        userId,
        'QUEST_COMPLETE',
        `Quest "${quest.title}" cleared. +${quest.expReward} EXP credited.`
      );
    }

    this.save();
    return {
      quest,
      completedNow: allCompleted,
      expAwarded,
      levelUps,
    };
  }

  public completeQuestDirectly(userId: string, questId: string): { quest: Quest | null; expAwarded: number; levelUps: LevelUpEvent[] } {
    const quests = this.data.quests[userId] || [];
    const quest = quests.find((q) => q.id === questId);
    if (!quest || quest.status === 'COMPLETED') {
      return { quest: null, expAwarded: 0, levelUps: [] };
    }

    quest.objectives.forEach((o) => {
      o.current = o.target;
      o.completed = true;
    });
    quest.status = 'COMPLETED';
    quest.completedAt = new Date().toISOString();

    const expRes = this.awardExp(
      userId,
      quest.expReward,
      quest.type + '_QUEST',
      `QUEST COMPLETED: ${quest.title}`,
      quest.id
    );

    const profile = this.data.profiles[userId];
    if (profile) {
      profile.totalQuestsCompleted += 1;
      profile.currentStreak += 1;
      if (profile.currentStreak > profile.bestStreak) {
        profile.bestStreak = profile.currentStreak;
      }
    }

    this.checkAchievements(userId);

    this.addNotification(
      userId,
      'COMPLETED',
      'QUEST COMPLETE',
      `[SYSTEM]\nQUEST COMPLETE.\n${quest.title}\n+${quest.expReward} EXP REWARDED.`
    );

    this.addSystemLog(userId, 'QUEST_COMPLETE', `Quest "${quest.title}" cleared directly.`);

    this.save();
    return {
      quest,
      expAwarded: quest.expReward,
      levelUps: expRes.levelUpEvents,
    };
  }

  public failQuestAndTriggerPenalty(userId: string, questId: string): { penaltyQuest: Quest | null; penaltyAssigned: boolean } {
    const quests = this.data.quests[userId] || [];
    const quest = quests.find((q) => q.id === questId);
    if (!quest || quest.status !== 'INCOMPLETE') {
      return { penaltyQuest: null, penaltyAssigned: false };
    }

    quest.status = 'FAILED';

    const profile = this.data.profiles[userId];
    if (profile) {
      profile.penaltyCount += 1;
      profile.currentStreak = Math.max(0, profile.currentStreak - 1);
    }

    // System creates a non-harmful disciplinary penalty recovery quest
    const penaltyQuest: Quest = {
      id: `quest_penalty_${Date.now()}`,
      userId,
      type: 'PENALTY',
      title: 'PENALTY PROTOCOL: SURVIVAL RESET',
      subtitle: 'System Discipline Re-Calibration',
      objectives: [
        { id: 'obj_p1', description: 'Immediate Hydration & Mental Reset', target: 800, current: 0, unit: 'ml', completed: false },
        { id: 'obj_p2', description: 'Discipline Walk / Movement', target: 20, current: 0, unit: 'min', completed: false },
        { id: 'obj_p3', description: 'Post-Failure Reflection Log', target: 1, current: 0, unit: 'entry', completed: false },
      ],
      timeLimit: '04:00:00',
      deadline: new Date(Date.now() + 4 * 3600000).toISOString(),
      expReward: 60,
      status: 'INCOMPLETE',
      penaltyQuest: true,
      createdAt: new Date().toISOString(),
    };

    quests.unshift(penaltyQuest);

    this.addNotification(
      userId,
      'PENALTY',
      'QUEST FAILED — PENALTY ASSIGNED',
      `[SYSTEM WARNING]\nQUEST FAILED: ${quest.title}.\nSTREAK DEBUFF APPLIED.\nPENALTY PROTOCOL INITIATED. COMPLETE RECOVERY OBJECTIVES BEFORE 04:00:00.`
    );

    this.addSystemLog(
      userId,
      'PENALTY_ISSUED',
      `Quest "${quest.title}" failed. Penalty Protocol survival reset assigned.`
    );

    this.save();
    return { penaltyQuest, penaltyAssigned: true };
  }

  public generateAdaptiveQuest(
    userId: string,
    level: LevelState,
    stats: PlayerStats,
    profile: PlayerProfile,
    type: Quest['type'] = 'DAILY'
  ): Quest {
    const lvl = level.currentLevel;
    const pushupBase = Math.min(70, Math.floor(15 + lvl * 2.5 + stats.str * 0.8));
    const squatBase = Math.min(100, Math.floor(25 + lvl * 3.5 + stats.end * 1.0));
    const walkBase = Math.min(45, Math.floor(20 + Math.floor(lvl * 1.2) + stats.vit * 0.5));

    if (type === 'EMERGENCY') {
      return {
        id: `quest_emerg_${Date.now()}`,
        userId,
        type: 'EMERGENCY',
        title: 'EMERGENCY PROTOCOL: BREAK THROUGH',
        subtitle: 'System Anomaly Response Required',
        objectives: [
          { id: `obj_em_1`, description: 'High-Paced Stride or Run', target: 15, current: 0, unit: 'min', completed: false },
          { id: `obj_em_2`, description: 'Deep Core Planks', target: 90, current: 0, unit: 'sec', completed: false },
          { id: `obj_em_3`, description: 'Mind Reset Breathing', target: 5, current: 0, unit: 'min', completed: false },
        ],
        timeLimit: '01:30:00',
        deadline: new Date(Date.now() + 90 * 60000).toISOString(),
        expReward: 300,
        statRewards: { vit: 1, disc: 1 },
        status: 'INCOMPLETE',
        createdAt: new Date().toISOString(),
      };
    }

    if (type === 'SPECIAL') {
      return {
        id: `quest_special_${Date.now()}`,
        userId,
        type: 'SPECIAL',
        title: 'SPECIAL ASSIGNMENT: THE TRIAL OF WILL',
        subtitle: 'Elevated Threshold Testing',
        objectives: [
          { id: `obj_sp_1`, description: 'Continuous Endurance Movement', target: 40, current: 0, unit: 'min', completed: false },
          { id: `obj_sp_2`, description: 'Bodyweight Mastery Sets', target: Math.floor(pushupBase * 1.3), current: 0, unit: 'reps', completed: false },
          { id: `obj_sp_3`, description: 'Zero Refined Sugar / Clean Day', target: 1, current: 0, unit: 'day', completed: false },
        ],
        timeLimit: '23:59:59',
        deadline: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
        expReward: 250,
        statRewards: { end: 2, disc: 1 },
        status: 'INCOMPLETE',
        createdAt: new Date().toISOString(),
      };
    }

    if (type === 'RECOVERY') {
      return {
        id: `quest_recov_${Date.now()}`,
        userId,
        type: 'RECOVERY',
        title: 'RECOVERY PROTOCOL: BIOMETRIC RESTORATION',
        subtitle: 'Fatigue Mitigation & Restoration',
        objectives: [
          { id: `obj_rc_1`, description: 'Pure Hydration Intake', target: 2000, current: 0, unit: 'ml', completed: false },
          { id: `obj_rc_2`, description: 'Full Body Mobility & Stretching', target: 20, current: 0, unit: 'min', completed: false },
          { id: `obj_rc_3`, description: 'Early Sleep Protocol (Pre-Midnight)', target: 1, current: 0, unit: 'session', completed: false },
        ],
        timeLimit: '23:59:59',
        deadline: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
        expReward: 120,
        statRewards: { vit: 2 },
        status: 'INCOMPLETE',
        createdAt: new Date().toISOString(),
      };
    }

    // Default DAILY
    return {
      id: `quest_daily_${Date.now()}`,
      userId,
      type: 'DAILY',
      title: 'PHYSICAL FOUNDATION',
      subtitle: `System Routine Calibration — Day ${profile.currentStreak + 1}`,
      objectives: [
        { id: `obj_d1`, description: 'Push-up', target: pushupBase, current: 0, unit: 'reps', completed: false },
        { id: `obj_d2`, description: 'Squat', target: squatBase, current: 0, unit: 'reps', completed: false },
        { id: `obj_d3`, description: 'Walking / Steady Cardio', target: walkBase, current: 0, unit: 'min', completed: false },
      ],
      timeLimit: '23:59:59',
      deadline: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
      expReward: 100 + Math.floor(lvl * 5),
      statRewards: { str: 1, end: 1 },
      status: 'INCOMPLETE',
      createdAt: new Date().toISOString(),
    };
  }

  public requestNewQuest(userId: string, type: Quest['type']): Quest {
    const level = this.data.levels[userId] || { currentLevel: 1, currentExp: 0, nextLevelExp: 100, rank: 'E' };
    const stats = this.data.stats[userId] || { str: 10, agi: 10, vit: 10, end: 10, disc: 10, unallocatedPoints: 0 };
    const profile = this.data.profiles[userId] || { currentStreak: 1 } as PlayerProfile;

    const quest = this.generateAdaptiveQuest(userId, level, stats, profile, type);
    if (!this.data.quests[userId]) {
      this.data.quests[userId] = [];
    }
    this.data.quests[userId].unshift(quest);

    this.addNotification(
      userId,
      'ASSIGNED',
      `${type} QUEST ASSIGNED`,
      `[SYSTEM]\n${type} QUEST HAS BEEN ASSIGNED.\n${quest.title}\nCOMPLETE THE QUEST BEFORE THE DEADLINE.`
    );

    this.addSystemLog(userId, 'QUEST_ASSIGNED', `New ${type} quest "${quest.title}" assigned by System.`);
    this.save();
    return quest;
  }

  public addChatMessage(userId: string, sender: 'PLAYER' | 'SYSTEM', text: string, extra?: Partial<ChatMessage>): ChatMessage {
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
      ...extra,
    };
    if (!this.data.chatMessages[userId]) {
      this.data.chatMessages[userId] = [];
    }
    this.data.chatMessages[userId].push(msg);
    this.save();
    return msg;
  }

  private addNotification(userId: string, type: SystemNotification['type'], title: string, message: string) {
    const notif: SystemNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      userId,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    if (!this.data.notifications[userId]) {
      this.data.notifications[userId] = [];
    }
    this.data.notifications[userId].unshift(notif);
  }

  private addSystemLog(userId: string, action: string, details: string) {
    const log: SystemLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    if (!this.data.systemLogs[userId]) {
      this.data.systemLogs[userId] = [];
    }
    this.data.systemLogs[userId].unshift(log);
  }

  private checkAchievements(userId: string) {
    const achievements = this.data.achievements[userId];
    const profile = this.data.profiles[userId];
    const level = this.data.levels[userId];
    if (!achievements || !profile || !level) return;

    achievements.forEach((ach) => {
      if (ach.unlocked) return;

      if (ach.code === 'FIRST_QUEST' && profile.totalQuestsCompleted >= 1) {
        ach.unlocked = true;
        ach.progress = 1;
        ach.unlockedAt = new Date().toISOString();
        this.awardExp(userId, ach.expReward, 'ACHIEVEMENT_UNLOCKED', `ACHIEVEMENT: ${ach.title}`);
        this.addNotification(userId, 'COMPLETED', 'ACHIEVEMENT UNLOCKED', `[SYSTEM]\nACHIEVEMENT UNLOCKED: ${ach.title}\n+${ach.expReward} EXP.`);
      } else if (ach.code === 'SURVIVOR_7') {
        ach.progress = Math.min(profile.currentStreak, 7);
        if (profile.currentStreak >= 7) {
          ach.unlocked = true;
          ach.unlockedAt = new Date().toISOString();
          this.awardExp(userId, ach.expReward, 'ACHIEVEMENT_UNLOCKED', `ACHIEVEMENT: ${ach.title}`);
          this.addNotification(userId, 'COMPLETED', 'ACHIEVEMENT UNLOCKED', `[SYSTEM]\nACHIEVEMENT UNLOCKED: ${ach.title}\n+${ach.expReward} EXP.`);
        }
      } else if (ach.code === 'DISCIPLINED_50') {
        ach.progress = Math.min(profile.totalQuestsCompleted, 50);
        if (profile.totalQuestsCompleted >= 50) {
          ach.unlocked = true;
          ach.unlockedAt = new Date().toISOString();
          this.awardExp(userId, ach.expReward, 'ACHIEVEMENT_UNLOCKED', `ACHIEVEMENT: ${ach.title}`);
          this.addNotification(userId, 'COMPLETED', 'ACHIEVEMENT UNLOCKED', `[SYSTEM]\nACHIEVEMENT UNLOCKED: ${ach.title}\n+${ach.expReward} EXP.`);
        }
      } else if (ach.code === 'RANK_C_PROMOTION' && (level.rank === 'C' || level.rank === 'B' || level.rank === 'A' || level.rank === 'S')) {
        ach.unlocked = true;
        ach.progress = 1;
        ach.unlockedAt = new Date().toISOString();
        this.awardExp(userId, ach.expReward, 'ACHIEVEMENT_UNLOCKED', `ACHIEVEMENT: ${ach.title}`);
        this.addNotification(userId, 'COMPLETED', 'ACHIEVEMENT UNLOCKED', `[SYSTEM]\nACHIEVEMENT UNLOCKED: ${ach.title}\n+${ach.expReward} EXP.`);
      }
    });
  }

  // --- LINE Integration Methods ---
  public getOrCreatePairingCode(userId: string): string {
    this.data.linePairingCodes = this.data.linePairingCodes || {};
    const profile = this.data.profiles[userId];
    if (profile?.linePairingCode) {
      this.data.linePairingCodes[profile.linePairingCode] = userId;
      return profile.linePairingCode;
    }

    const userName = (profile?.name || 'PLAYER').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5);
    const rand = Math.floor(1000 + Math.random() * 9000);
    const code = `SOLO-${userName}-${rand}`;
    if (profile) profile.linePairingCode = code;
    this.data.linePairingCodes[code] = userId;
    this.save();
    return code;
  }

  public getUserIdByLineUserId(lineUserId: string): string | null {
    this.data.lineBindings = this.data.lineBindings || {};
    return this.data.lineBindings[lineUserId] || null;
  }

  public getUserIdByPairingCode(code: string): string | null {
    this.data.linePairingCodes = this.data.linePairingCodes || {};
    const clean = code.trim().toUpperCase();
    if (this.data.linePairingCodes[clean]) {
      return this.data.linePairingCodes[clean];
    }
    for (const [uId, prof] of Object.entries(this.data.profiles)) {
      if (prof.linePairingCode && prof.linePairingCode.toUpperCase() === clean) {
        return uId;
      }
    }
    return null;
  }

  public bindLineUser(userId: string, lineUserId: string, displayName?: string, pictureUrl?: string): boolean {
    const user = this.data.users[userId];
    if (!user) return false;
    this.data.lineBindings = this.data.lineBindings || {};
    this.data.lineBindings[lineUserId] = userId;

    const prof = this.data.profiles[userId];
    if (prof) {
      prof.lineUserId = lineUserId;
      if (displayName) prof.lineDisplayName = displayName;
      prof.lineLinkedAt = new Date().toISOString();
      prof.lineNotifyEnabled = true;
    }

    this.addSystemLog(userId, 'LINE_BINDING', `Linked to LINE Account (${displayName || lineUserId})`);
    this.addNotification(
      userId,
      'COMPLETED',
      'LINE SYSTEM LINKED',
      `[SYSTEM]\nLINE ACCOUNT SYNCHRONIZED.\nUser: ${displayName || 'Protagonist'}\nYou may now report quests and receive telemetry in LINE.`
    );
    this.save();
    return true;
  }

  public unbindLineUser(userId: string): boolean {
    const prof = this.data.profiles[userId];
    if (!prof) return false;
    const oldLineId = prof.lineUserId;
    if (oldLineId && this.data.lineBindings) {
      delete this.data.lineBindings[oldLineId];
    }
    prof.lineUserId = undefined;
    prof.lineDisplayName = undefined;
    prof.lineLinkedAt = undefined;
    this.addSystemLog(userId, 'LINE_UNBINDING', 'Disconnected from LINE Account');
    this.save();
    return true;
  }

  public bindByPairingCode(code: string, lineUserId: string, displayName?: string): { success: boolean; playerBundle?: FullPlayerData; error?: string } {
    const userId = this.getUserIdByPairingCode(code);
    if (!userId) {
      return { success: false, error: 'INVALID_PAIRING_CODE' };
    }
    const bound = this.bindLineUser(userId, lineUserId, displayName);
    if (!bound) {
      return { success: false, error: 'PLAYER_NOT_FOUND' };
    }
    return { success: true, playerBundle: this.getFullPlayerData(userId)! };
  }

  public addLineWebhookLog(log: LineWebhookLog): void {
    this.data.lineWebhookLogs = this.data.lineWebhookLogs || [];
    this.data.lineWebhookLogs.unshift(log);
    if (this.data.lineWebhookLogs.length > 50) {
      this.data.lineWebhookLogs = this.data.lineWebhookLogs.slice(0, 50);
    }
    this.save();
  }

  public getLineWebhookLogs(): LineWebhookLog[] {
    return this.data.lineWebhookLogs || [];
  }
}

export const db = new SystemDatabase();
