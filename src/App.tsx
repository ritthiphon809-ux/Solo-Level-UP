import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  LayoutDashboard,
  User,
  CheckSquare,
  MessageSquare,
  MessageCircle,
  History,
  Trophy,
  Loader2,
  Terminal,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { FullPlayerData, LevelUpEvent, Quest, QuestType, User as UserType } from './types';
import { SystemHeader } from './components/SystemHeader';
import { SystemWindow } from './components/SystemWindow';
import { PlayerStatusWindow } from './components/PlayerStatusWindow';
import { QuestCenter } from './components/QuestCenter';
import { LineSystemChat } from './components/LineSystemChat';
import { LineIntegrationHub } from './components/LineIntegrationHub';
import { SystemHistoryView } from './components/SystemHistoryView';
import { AchievementsView } from './components/AchievementsView';
import { SystemAwakening } from './components/SystemAwakening';
import { LevelUpModal } from './components/LevelUpModal';
import { PenaltyModal } from './components/PenaltyModal';
import { playSystemBeep } from './utils/audio';
import { useLanguage } from './utils/LanguageContext';

type ActiveTab = 'SYSTEM_WINDOW' | 'PLAYER_STATUS' | 'QUESTS' | 'LINE_BOT' | 'LINE_CHAT' | 'HISTORY' | 'ACHIEVEMENTS';

export default function App() {
  const { t, lang } = useLanguage();
  const [currentUserId, setCurrentUserId] = useState<string>('user_ohm');
  const [users, setUsers] = useState<UserType[]>([]);
  const [playerData, setPlayerData] = useState<FullPlayerData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('SYSTEM_WINDOW');
  const [loading, setLoading] = useState<boolean>(true);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [levelUpQueue, setLevelUpQueue] = useState<LevelUpEvent[]>([]);
  const [currentLevelUp, setCurrentLevelUp] = useState<LevelUpEvent | null>(null);
  const [penaltyQuest, setPenaltyQuest] = useState<Quest | null>(null);
  const [isAwakeningOpen, setIsAwakeningOpen] = useState<boolean>(false);

  // 1. Fetch available users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch system players');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  }, []);

  // 2. Fetch full player data
  const fetchPlayerData = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/player/${userId}`);
      if (!res.ok) throw new Error(`Player ${userId} could not be retrieved from System`);
      const json = await res.json();
      setPlayerData(json.data);
    } catch (err: any) {
      console.error('Error fetching player data:', err);
      setError(err.message || 'System connection failure');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchUsers();
    fetchPlayerData(currentUserId);
  }, [fetchUsers, fetchPlayerData, currentUserId]);

  // Level up queue monitor
  useEffect(() => {
    if (!currentLevelUp && levelUpQueue.length > 0) {
      setCurrentLevelUp(levelUpQueue[0]);
      setLevelUpQueue((prev) => prev.slice(1));
    }
  }, [levelUpQueue, currentLevelUp]);

  // Handle Objective Update
  const handleUpdateObjective = async (questId: string, objectiveId: string, increment: number) => {
    try {
      const res = await fetch(`/api/quests/${currentUserId}/${questId}/objective`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectiveId, increment }),
      });
      if (!res.ok) throw new Error('Failed to update objective');
      const json = await res.json();
      setPlayerData(json.data);

      if (json.levelUps && json.levelUps.length > 0) {
        setLevelUpQueue((prev) => [...prev, ...json.levelUps]);
      }
    } catch (err: any) {
      console.error('Error updating objective:', err);
    }
  };

  // Handle Quest Complete
  const handleCompleteQuest = async (questId: string) => {
    try {
      const res = await fetch(`/api/quests/${currentUserId}/${questId}/complete`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to complete quest');
      const json = await res.json();
      setPlayerData(json.data);

      if (json.levelUps && json.levelUps.length > 0) {
        setLevelUpQueue((prev) => [...prev, ...json.levelUps]);
      }
    } catch (err: any) {
      console.error('Error completing quest:', err);
    }
  };

  // Handle Quest Fail / Penalty Trigger
  const handleFailQuest = async (questId: string) => {
    try {
      const res = await fetch(`/api/quests/${currentUserId}/${questId}/fail`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to report quest failure');
      const json = await res.json();
      setPlayerData(json.data);

      if (json.penaltyQuest) {
        setPenaltyQuest(json.penaltyQuest);
      }
    } catch (err: any) {
      console.error('Error failing quest:', err);
    }
  };

  // Handle Stat Allocation
  const handleAllocateStat = async (stat: 'str' | 'vit' | 'agi' | 'end' | 'disc') => {
    try {
      const res = await fetch(`/api/player/${currentUserId}/allocate-stat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stat, points: 1 }),
      });
      if (!res.ok) throw new Error('Failed to allocate stat points');
      const json = await res.json();
      setPlayerData(json.data);
    } catch (err: any) {
      console.error('Error allocating stat points:', err);
    }
  };

  // Handle Request New Adaptive Quest
  const handleRequestNewQuest = async (type: QuestType) => {
    try {
      const res = await fetch(`/api/quests/${currentUserId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error('Failed to generate new quest');
      const json = await res.json();
      setPlayerData(json.data);
    } catch (err: any) {
      console.error('Error requesting quest:', err);
    }
  };

  // Handle LINE Chat Message Transmission
  const handleSendMessage = async (message: string) => {
    try {
      setChatLoading(true);
      const res = await fetch(`/api/chat/${currentUserId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('Failed to send transmission');
      const json = await res.json();
      setPlayerData(json.data);

      if (json.levelUps && json.levelUps.length > 0) {
        setLevelUpQueue((prev) => [...prev, ...json.levelUps]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  // Handle New Player Awakening Creation
  const handleAwakenComplete = async (calibrationData: any) => {
    try {
      const res = await fetch('/api/player/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calibrationData),
      });
      if (!res.ok) throw new Error('Awakening creation failed');
      const json = await res.json();
      const newBundle = json.data;

      await fetchUsers();
      setCurrentUserId(newBundle.profile.id);
      setPlayerData(newBundle);
      setIsAwakeningOpen(false);
      setActiveTab('SYSTEM_WINDOW');
    } catch (err: any) {
      console.error('Awakening error:', err);
    }
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'SYSTEM_WINDOW', label: t.navSystemWindow, icon: LayoutDashboard },
    { id: 'PLAYER_STATUS', label: t.navStatus, icon: User },
    { id: 'QUESTS', label: t.navQuests, icon: CheckSquare },
    { id: 'LINE_BOT', label: t.navLineBot, icon: MessageCircle },
    { id: 'LINE_CHAT', label: t.navLineChat, icon: MessageSquare },
    { id: 'HISTORY', label: t.navHistory, icon: History },
    { id: 'ACHIEVEMENTS', label: t.navAchievements, icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-[#03060f] text-zinc-200 flex flex-col font-mono-hud selection:bg-cyan-500 selection:text-black">
      {/* Top HUD Header */}
      <SystemHeader
        playerData={playerData}
        users={users}
        currentUserId={currentUserId}
        onSwitchUser={(newUserId) => {
          setCurrentUserId(newUserId);
          fetchPlayerData(newUserId);
        }}
        onOpenAwakening={() => setIsAwakeningOpen(true)}
      />

      {/* Main Navigation Bar */}
      <nav className="border-b border-cyan-500/20 bg-[#060b17]/80 backdrop-blur-md sticky top-0 z-20 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 sm:gap-2 py-1.5 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id.toLowerCase()}`}
                onClick={() => {
                  playSystemBeep();
                  setActiveTab(item.id);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono-hud tracking-wider transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'text-zinc-400 hover:text-white hover:bg-cyan-950/20 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {loading && !playerData ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm font-mono-hud text-cyan-300">
              {lang === 'th' ? 'กำลังเชื่อมต่อระบบประสาทเข้ากับ SYSTEM...' : 'ESTABLISHING NEURAL LINK TO SYSTEM...'}
            </p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-lg bg-red-950/40 border border-red-500/50 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <h2 className="text-xl font-rajdhani font-bold text-white">
              {lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ' : 'SYSTEM CONNECTION ANOMALY'}
            </h2>
            <p className="text-xs text-red-300 font-mono-hud">{error}</p>
            <button
              onClick={() => fetchPlayerData(currentUserId)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-mono-hud text-xs font-bold"
            >
              {lang === 'th' ? 'ลองเชื่อมต่อใหม่อีกครั้ง' : 'RETRY CONNECTION'}
            </button>
          </div>
        ) : playerData ? (
          <>
            {activeTab === 'SYSTEM_WINDOW' && (
              <SystemWindow
                playerData={playerData}
                onUpdateObjective={handleUpdateObjective}
                onCompleteQuest={handleCompleteQuest}
                onFailQuest={handleFailQuest}
                onNavigateToQuests={() => setActiveTab('QUESTS')}
                onNavigateToStatus={() => setActiveTab('PLAYER_STATUS')}
                onNavigateToChat={() => setActiveTab('LINE_CHAT')}
                onNavigateToLineBot={() => setActiveTab('LINE_BOT')}
                onQuickReport={handleSendMessage}
              />
            )}

            {activeTab === 'PLAYER_STATUS' && (
              <PlayerStatusWindow
                playerData={playerData}
                onAllocateStat={handleAllocateStat}
              />
            )}

            {activeTab === 'QUESTS' && (
              <QuestCenter
                playerData={playerData}
                onUpdateObjective={handleUpdateObjective}
                onCompleteQuest={handleCompleteQuest}
                onFailQuest={handleFailQuest}
                onRequestNewQuest={handleRequestNewQuest}
              />
            )}

            {activeTab === 'LINE_BOT' && (
              <LineIntegrationHub
                playerData={playerData}
                currentUserId={currentUserId}
                onRefreshPlayerData={async () => fetchPlayerData(currentUserId)}
                onLevelUp={(events) => setLevelUpQueue((prev) => [...prev, ...events])}
              />
            )}

            {activeTab === 'LINE_CHAT' && (
              <LineSystemChat
                playerData={playerData}
                onSendMessage={handleSendMessage}
                loading={chatLoading}
                onNavigateToLineBot={() => setActiveTab('LINE_BOT')}
              />
            )}

            {activeTab === 'HISTORY' && <SystemHistoryView playerData={playerData} />}

            {activeTab === 'ACHIEVEMENTS' && <AchievementsView playerData={playerData} />}
          </>
        ) : null}
      </main>

      {/* Level Up Modal */}
      {currentLevelUp && (
        <LevelUpModal
          event={currentLevelUp}
          onClose={() => setCurrentLevelUp(null)}
        />
      )}

      {/* Penalty Warning Modal */}
      {penaltyQuest && (
        <PenaltyModal
          penaltyQuest={penaltyQuest}
          onClose={() => setPenaltyQuest(null)}
        />
      )}

      {/* System Awakening Modal */}
      {isAwakeningOpen && (
        <SystemAwakening
          onAwakenComplete={handleAwakenComplete}
          onCancel={() => setIsAwakeningOpen(false)}
        />
      )}

      {/* Bottom Telemetry Ticker */}
      <footer className="border-t border-cyan-500/10 bg-[#02050c] px-4 py-2 text-[10px] font-mono-hud text-zinc-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>SOLO LEVEL UP SYSTEM v1.0.0</span>
          <span>•</span>
          <span>{lang === 'th' ? 'สถานะเซิร์ฟเวอร์: AUTHORITATIVE STATE' : 'BACKEND ENGINE: AUTHORITATIVE STATE'}</span>
        </div>
        <div>
          <span>{lang === 'th' ? 'ผู้ใช้ทุกคนคือตัวเอก (THE PROTAGONIST). ชีวิตจริง. เควสต์จริง. EXP จริง.' : 'EVERY USER IS THE PROTAGONIST. REAL LIFE. REAL QUESTS. REAL EXP.'}</span>
        </div>
      </footer>
    </div>
  );
}
