import React, { useState } from 'react';
import {
  Clock,
  Flame,
  Award,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Send,
  Zap,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { FullPlayerData, Quest, QuestObjective } from '../types';
import { playActionVerified, playQuestComplete, playSystemBeep } from '../utils/audio';
import { useLanguage } from '../utils/LanguageContext';

interface SystemWindowProps {
  playerData: FullPlayerData;
  onUpdateObjective: (questId: string, objectiveId: string, delta: number) => void;
  onCompleteQuest: (questId: string) => void;
  onFailQuest: (questId: string) => void;
  onNavigateToQuests: () => void;
  onNavigateToStatus: () => void;
  onNavigateToChat: () => void;
  onNavigateToLineBot?: () => void;
  onQuickReport: (text: string) => void;
}

export const SystemWindow: React.FC<SystemWindowProps> = ({
  playerData,
  onUpdateObjective,
  onCompleteQuest,
  onFailQuest,
  onNavigateToQuests,
  onNavigateToStatus,
  onNavigateToChat,
  onNavigateToLineBot,
  onQuickReport,
}) => {
  const { t, lang } = useLanguage();
  const [quickInput, setQuickInput] = useState('');
  const activeQuests = playerData.activeQuests || [];
  
  // Find primary priority quest (Emergency first, then Penalty, then Daily, then any Incomplete)
  const primaryQuest =
    activeQuests.find((q) => q.status === 'INCOMPLETE' && q.type === 'EMERGENCY') ||
    activeQuests.find((q) => q.status === 'INCOMPLETE' && q.type === 'PENALTY') ||
    activeQuests.find((q) => q.status === 'INCOMPLETE' && q.type === 'DAILY') ||
    activeQuests.find((q) => q.status === 'INCOMPLETE') ||
    activeQuests[0];

  const recentNotifications = (playerData.notifications || []).slice(0, 3);
  const expPercentage = Math.min(
    100,
    Math.max(2, (playerData.level.currentExp / playerData.level.nextLevelExp) * 100)
  );

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    playSystemBeep(1000);
    onQuickReport(quickInput.trim());
    setQuickInput('');
  };

  const getQuestTypeLabel = (type: string) => {
    if (lang === 'th') {
      switch (type) {
        case 'DAILY': return 'เควสต์ประจำวัน [DAILY]';
        case 'EMERGENCY': return 'เควสต์ฉุกเฉิน [EMERGENCY]';
        case 'SPECIAL': return 'เควสต์พิเศษ [SPECIAL]';
        case 'RECOVERY': return 'โปรโตคอลฟื้นฟู [RECOVERY]';
        case 'PENALTY': return 'บทลงโทษ [PENALTY]';
        default: return `${type} QUEST`;
      }
    }
    return `[${type} QUEST]`;
  };

  return (
    <div className="space-y-6">
      {/* Top Protocol Status HUD Banner */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#061426] via-[#091b34] to-[#061426] border border-cyan-500/40 p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-hud text-cyan-400">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>{t.systemDirective}</span>
              <span>//</span>
              <span>{t.rankClassification}: RANK {playerData.level.rank}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-rajdhani font-bold text-white tracking-wide mt-1">
              {t.welcomePlayer} <span className="text-cyan-300 hud-glow-text">{playerData.profile.name}</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-mono-hud mt-0.5">
              {t.titleLabel}: <span className="text-cyan-400 font-medium">{playerData.profile.title}</span> • {t.streakLabel}:{' '}
              <span className="text-amber-400 font-bold">{playerData.profile.currentStreak} {t.days}</span>
            </p>
          </div>

          {/* Level & EXP Gauge Block */}
          <div className="w-full lg:w-80 bg-[#050a14]/80 border border-cyan-500/30 p-3 rounded">
            <div className="flex items-center justify-between text-xs font-mono-hud mb-1.5">
              <span className="text-zinc-400">{t.levelProgression}</span>
              <span className="text-cyan-300 font-bold">
                {t.level} {playerData.level.currentLevel} → {playerData.level.currentLevel + 1}
              </span>
            </div>

            {/* EXP Bar */}
            <div className="w-full bg-zinc-900 h-3 rounded-sm overflow-hidden border border-cyan-500/20 p-0.5 relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-300 rounded-sm transition-all duration-700 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                style={{ width: `${expPercentage}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] font-mono-hud text-zinc-400 mt-1">
              <span>{t.exp} {playerData.level.currentExp.toLocaleString()}</span>
              <span className="text-cyan-400/90 font-medium">{Math.round(expPercentage)}%</span>
              <span>{t.reqExp} {playerData.level.nextLevelExp.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CORE SYSTEM QUESTION & ACTIVE QUEST */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-cyan-400 transform rotate-45" />
            <h3 className="font-rajdhani font-bold text-lg sm:text-xl text-white tracking-wider">
              {t.coreQuestion}
            </h3>
          </div>
          <button
            onClick={onNavigateToQuests}
            className="flex items-center gap-1 text-xs font-mono-hud text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {t.viewAllQuests} ({activeQuests.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {primaryQuest ? (
          <div
            className={`relative rounded-lg p-5 sm:p-6 transition-all ${
              primaryQuest.type === 'EMERGENCY'
                ? 'hud-border-alert bg-gradient-to-b from-[#18080a] to-[#0a0507]'
                : primaryQuest.type === 'PENALTY'
                ? 'hud-border-alert bg-gradient-to-b from-[#1a0f05] to-[#080504]'
                : primaryQuest.type === 'SPECIAL'
                ? 'hud-border-gold bg-gradient-to-b from-[#171408] to-[#080705]'
                : 'hud-border-cyan bg-[#080f1d]'
            }`}
          >
            {/* Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold font-mono-hud tracking-wider rounded ${
                    primaryQuest.type === 'EMERGENCY'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                      : primaryQuest.type === 'PENALTY'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : primaryQuest.type === 'SPECIAL'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  }`}
                >
                  {getQuestTypeLabel(primaryQuest.type)}
                </span>
                <span className="text-xs font-mono-hud text-zinc-400">
                  {lang === 'th' ? 'สถานะ: ' : 'STATUS: '}
                  {primaryQuest.status === 'COMPLETED' ? (lang === 'th' ? 'สำเร็จแล้ว' : 'COMPLETED') : (lang === 'th' ? 'ยังไม่เสร็จสิ้น' : 'INCOMPLETE')}
                </span>
              </div>

              {/* Countdown / Time Limit */}
              <div className="flex items-center gap-1.5 text-xs font-mono-hud text-cyan-300 bg-black/40 px-2.5 py-1 rounded border border-cyan-500/30">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.timeLimit}: {primaryQuest.timeLimit}</span>
              </div>
            </div>

            {/* Quest Title */}
            <div className="mb-4">
              <h4 className="text-xl sm:text-2xl font-rajdhani font-bold text-white tracking-wide">
                {primaryQuest.title}
              </h4>
              <p className="text-xs text-zinc-400 font-mono-hud mt-0.5">{primaryQuest.subtitle}</p>
            </div>

            {/* Objectives List */}
            <div className="space-y-3 mb-5">
              <p className="text-[11px] font-mono-hud text-cyan-400 tracking-wider">{t.mandatedObjectives}</p>
              {primaryQuest.objectives.map((obj: QuestObjective) => {
                const progressPct = Math.min(100, Math.round((obj.current / obj.target) * 100));
                return (
                  <div
                    key={obj.id}
                    className={`p-3 rounded border transition-all ${
                      obj.completed
                        ? 'bg-cyan-950/20 border-cyan-500/40'
                        : 'bg-[#050912] border-zinc-800 hover:border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border ${
                            obj.completed
                              ? 'bg-cyan-500 border-cyan-400 text-black font-bold'
                              : 'border-zinc-700 text-zinc-600'
                          }`}
                        >
                          {obj.completed ? '✓' : ''}
                        </span>
                        <span className={`font-mono-hud text-sm ${obj.completed ? 'text-zinc-400 line-through' : 'text-white'}`}>
                          {obj.description}
                        </span>
                      </div>
                      <div className="text-xs font-mono-hud text-right">
                        <span className={obj.completed ? 'text-cyan-400 font-bold' : 'text-zinc-300'}>
                          {obj.current}
                        </span>{' '}
                        <span className="text-zinc-500">/ {obj.target} {obj.unit}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full transition-all duration-300 ${
                          obj.completed ? 'bg-cyan-400' : 'bg-cyan-600'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Action Increment Buttons */}
                    {primaryQuest.status === 'INCOMPLETE' && !obj.completed && (
                      <div className="flex items-center gap-1.5 justify-end pt-1">
                        <button
                          onClick={() => {
                            playActionVerified();
                            onUpdateObjective(primaryQuest.id, obj.id, 5);
                          }}
                          className="px-2 py-0.5 text-[11px] font-mono-hud rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 transition-colors"
                        >
                          +5 {obj.unit}
                        </button>
                        <button
                          onClick={() => {
                            playActionVerified();
                            onUpdateObjective(primaryQuest.id, obj.id, 10);
                          }}
                          className="px-2 py-0.5 text-[11px] font-mono-hud rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 transition-colors"
                        >
                          +10 {obj.unit}
                        </button>
                        <button
                          onClick={() => {
                            playActionVerified();
                            onUpdateObjective(primaryQuest.id, obj.id, obj.target - obj.current);
                          }}
                          className="px-2 py-0.5 text-[11px] font-mono-hud rounded bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-200 transition-colors font-bold"
                        >
                          {t.verifyComplete}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Reward and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-cyan-500/20">
              <div className="flex items-center gap-3 text-xs font-mono-hud">
                <div className="flex items-center gap-1 text-cyan-300">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold">+{primaryQuest.expReward} EXP</span>
                </div>
                {primaryQuest.statRewards && (
                  <div className="text-zinc-400">
                    {t.statRewards}:{' '}
                    {Object.entries(primaryQuest.statRewards)
                      .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
                      .join(', ')}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {primaryQuest.status === 'INCOMPLETE' ? (
                  <>
                    <button
                      onClick={() => {
                        playSystemBeep();
                        onFailQuest(primaryQuest.id);
                      }}
                      className="px-3 py-1.5 text-xs font-mono-hud rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 transition-colors"
                    >
                      {t.abandonPenalty}
                    </button>
                    <button
                      onClick={() => {
                        playQuestComplete();
                        onCompleteQuest(primaryQuest.id);
                      }}
                      className="px-4 py-1.5 text-xs font-mono-hud font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t.completeQuest}
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-1 text-xs font-mono-hud rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold">
                    {t.questCleared}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-cyan-500/30 bg-[#080f1d] p-8 text-center">
            <p className="text-zinc-400 font-mono-hud text-sm">{t.allQuestsCleared}</p>
            <button
              onClick={onNavigateToQuests}
              className="mt-3 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-mono-hud font-bold rounded text-xs transition-colors"
            >
              {t.requestSystemAssignment}
            </button>
          </div>
        )}
      </div>

      {/* QUICK TRANSMISSION TO SYSTEM */}
      <div className="rounded-lg bg-[#070b14] border border-cyan-500/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono-hud text-cyan-400 flex items-center gap-1.5">
            <Send className="w-3 h-3" />
            {t.quickActionReport}
          </span>
          <div className="flex items-center gap-3">
            {onNavigateToLineBot && (
              <button
                type="button"
                onClick={onNavigateToLineBot}
                className="text-[11px] font-mono-hud text-[#06C755] hover:text-[#05b34c] transition-colors flex items-center gap-1 font-bold"
              >
                <span>📱 {lang === 'th' ? 'เชื่อมต่อ LINE BOT' : 'LINE BOT'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateToChat}
              className="text-[11px] font-mono-hud text-zinc-400 hover:text-cyan-300 transition-colors"
            >
              {t.openTerminalChat}
            </button>
          </div>
        </div>

        <form onSubmit={handleQuickSubmit} className="flex gap-2">
          <input
            id="quick-report-input"
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder={t.quickInputPlaceholder}
            className="flex-1 bg-black/60 border border-cyan-500/30 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 font-mono-hud"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-900/50 hover:bg-cyan-800/80 border border-cyan-500/50 rounded text-cyan-300 font-mono-hud text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            {t.transmit}
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <span className="text-[10px] font-mono-hud text-zinc-500 self-center">{t.quickSignals}</span>
          {[
            lang === 'th' ? 'ทำ push-up 30 ครั้ง' : 'Did 30 push-ups',
            lang === 'th' ? 'ทำ squat 50 ครั้ง' : 'Did 50 squats',
            lang === 'th' ? 'เดินออกกำลังกาย 30 นาที' : 'Walked 30 min',
            lang === 'th' ? 'วันนี้เหนื่อยมาก ขอ protocol ฟื้นฟู' : 'Exhausted, request recovery',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                playSystemBeep();
                onQuickReport(suggestion);
              }}
              className="text-[10px] font-mono-hud px-2 py-0.5 rounded bg-zinc-900/80 hover:bg-cyan-950/60 border border-zinc-800 hover:border-cyan-500/30 text-zinc-400 hover:text-cyan-300 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* RECENT SYSTEM NOTIFICATIONS & TELEMETRY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Event Log */}
        <div className="rounded-lg bg-[#070b14] border border-cyan-500/20 p-4">
          <div className="flex items-center justify-between mb-3 border-b border-cyan-500/10 pb-2">
            <span className="text-xs font-mono-hud text-zinc-400">{t.systemNotifications}</span>
            <span className="text-[10px] font-mono-hud text-cyan-400">{t.realtime}</span>
          </div>
          <div className="space-y-2.5">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="text-xs font-mono-hud p-2.5 rounded bg-black/40 border border-cyan-500/10 flex items-start gap-2"
                >
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <div>
                    <p className="font-bold text-cyan-200">{notif.title}</p>
                    <p className="text-zinc-400 text-[11px] whitespace-pre-line mt-0.5">{notif.message}</p>
                    <span className="text-[10px] text-zinc-600 block mt-1">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs font-mono-hud text-zinc-600">
                {lang === 'th' ? 'ไม่มีการแจ้งเตือนล่าสุด' : 'No recent system notifications.'}
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats Summary Card */}
        <div className="rounded-lg bg-[#070b14] border border-cyan-500/20 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-cyan-500/10 pb-2">
              <span className="text-xs font-mono-hud text-zinc-400">{t.biometricSnapshot}</span>
              <button
                onClick={onNavigateToStatus}
                className="text-[11px] font-mono-hud text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                {t.statusWindowLink}
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center font-mono-hud">
              <div className="p-2 rounded bg-black/40 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">STR</span>
                <span className="text-base font-bold text-white">{playerData.stats.str}</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">AGI</span>
                <span className="text-base font-bold text-white">{playerData.stats.agi}</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">VIT</span>
                <span className="text-base font-bold text-white">{playerData.stats.vit}</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">END</span>
                <span className="text-base font-bold text-white">{playerData.stats.end}</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">DISC</span>
                <span className="text-base font-bold text-cyan-300">{playerData.stats.disc}</span>
              </div>
            </div>

            {playerData.stats.unallocatedPoints > 0 && (
              <div className="mt-3 p-2 bg-cyan-950/40 border border-cyan-500/50 rounded flex items-center justify-between text-xs font-mono-hud text-cyan-300 animate-pulse">
                <span>{t.unallocatedPoints}: {playerData.stats.unallocatedPoints}</span>
                <button
                  onClick={onNavigateToStatus}
                  className="px-2 py-0.5 bg-cyan-500 text-black font-bold rounded text-[10px]"
                >
                  {t.allocate}
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-cyan-500/10 mt-3 flex items-center justify-between text-xs font-mono-hud text-zinc-400">
            <span>{t.totalQuestsCleared}: {playerData.profile.totalQuestsCompleted}</span>
            <span>{t.bestStreak}: {playerData.profile.bestStreak} {t.days}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
