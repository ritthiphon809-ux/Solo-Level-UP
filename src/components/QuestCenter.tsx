import React, { useState } from 'react';
import {
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Zap,
  Flame,
  BookOpen,
  Heart,
  Compass,
  Filter,
} from 'lucide-react';
import { FullPlayerData, Quest, QuestObjective, QuestType } from '../types';
import { playActionVerified, playQuestComplete, playSystemAlert, playSystemBeep } from '../utils/audio';
import { useLanguage } from '../utils/LanguageContext';

interface QuestCenterProps {
  playerData: FullPlayerData;
  onUpdateObjective: (questId: string, objectiveId: string, delta: number) => void;
  onCompleteQuest: (questId: string) => void;
  onFailQuest: (questId: string) => void;
  onRequestNewQuest: (type: QuestType) => void;
}

const typeBadges: Record<QuestType, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  DAILY: { bg: 'bg-cyan-950/40', text: 'text-cyan-300', border: 'border-cyan-500/40', icon: Flame },
  WEEKLY: { bg: 'bg-indigo-950/40', text: 'text-indigo-300', border: 'border-indigo-500/40', icon: Award },
  SPECIAL: { bg: 'bg-yellow-950/40', text: 'text-yellow-300', border: 'border-yellow-500/40', icon: Award },
  EMERGENCY: { bg: 'bg-red-950/60', text: 'text-red-300', border: 'border-red-500/50', icon: AlertTriangle },
  DISCIPLINE: { bg: 'bg-purple-950/40', text: 'text-purple-300', border: 'border-purple-500/40', icon: Compass },
  PHYSICAL: { bg: 'bg-orange-950/40', text: 'text-orange-300', border: 'border-orange-500/40', icon: Flame },
  LEARNING: { bg: 'bg-blue-950/40', text: 'text-blue-300', border: 'border-blue-500/40', icon: BookOpen },
  LIFESTYLE: { bg: 'bg-emerald-950/40', text: 'text-emerald-300', border: 'border-emerald-500/40', icon: Heart },
  RECOVERY: { bg: 'bg-teal-950/40', text: 'text-teal-300', border: 'border-teal-500/40', icon: Heart },
  PENALTY: { bg: 'bg-red-950/70', text: 'text-red-400', border: 'border-red-500/60', icon: AlertTriangle },
};

export const QuestCenter: React.FC<QuestCenterProps> = ({
  playerData,
  onUpdateObjective,
  onCompleteQuest,
  onFailQuest,
  onRequestNewQuest,
}) => {
  const { t, lang } = useLanguage();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [requesting, setRequesting] = useState(false);
  const quests = playerData.activeQuests || [];

  const filteredQuests = quests.filter((q) => {
    if (filter === 'ACTIVE') return q.status === 'INCOMPLETE';
    if (filter === 'COMPLETED') return q.status === 'COMPLETED';
    return true;
  });

  const handleRequestQuest = (type: QuestType) => {
    playSystemBeep(1100);
    setRequesting(true);
    onRequestNewQuest(type);
    setTimeout(() => setRequesting(false), 500);
  };

  const getFilterName = (mode: 'ACTIVE' | 'ALL' | 'COMPLETED') => {
    if (lang === 'th') {
      if (mode === 'ACTIVE') return 'กำลังดำเนินการ';
      if (mode === 'ALL') return 'ทั้งหมด';
      if (mode === 'COMPLETED') return 'สำเร็จแล้ว';
    }
    return mode;
  };

  const getQuestTypeDisplay = (type: QuestType) => {
    if (lang === 'th') {
      switch (type) {
        case 'DAILY': return 'เควสต์ประจำวัน [DAILY]';
        case 'EMERGENCY': return 'เควสต์ฉุกเฉิน [EMERGENCY]';
        case 'SPECIAL': return 'เควสต์พิเศษ [SPECIAL]';
        case 'RECOVERY': return 'โปรโตคอลฟื้นฟู [RECOVERY]';
        case 'PENALTY': return 'บทลงโทษ [PENALTY]';
        case 'WEEKLY': return 'เควสต์ประจำสัปดาห์ [WEEKLY]';
        case 'DISCIPLINE': return 'เควสต์วินัย [DISCIPLINE]';
        default: return `${type} QUEST`;
      }
    }
    return `[${type} QUEST]`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-hud text-cyan-400">
            <span>{t.questMissionRegistry}</span>
            <span>•</span>
            <span>{t.systemAssignedProtocols}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-rajdhani font-bold text-white tracking-wide mt-0.5">
            {t.questHeadquarters}
          </h2>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 bg-[#080d18] border border-cyan-500/30 p-1 rounded font-mono-hud text-xs">
          {(['ACTIVE', 'ALL', 'COMPLETED'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                playSystemBeep();
                setFilter(mode);
              }}
              className={`px-3 py-1 rounded transition-colors ${
                filter === mode
                  ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {getFilterName(mode)}
            </button>
          ))}
        </div>
      </div>

      {/* System Generation Command Bar */}
      <div className="rounded-lg bg-[#070b14] border border-cyan-500/30 p-4 font-mono-hud">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-cyan-400 flex items-center gap-1.5 font-bold">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            {t.requestAdaptiveAssignment}
          </span>
          <span className="text-[11px] text-zinc-500">{t.systemGeneratesBasedOnProfile}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            disabled={requesting}
            onClick={() => handleRequestQuest('DAILY')}
            className="p-2.5 rounded bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition-all text-left flex items-center gap-2"
          >
            <Flame className="w-4 h-4 text-cyan-400" />
            <div>
              <p>{lang === 'th' ? 'เควสต์ประจำวัน' : 'DAILY QUEST'}</p>
              <p className="text-[10px] text-zinc-400 font-normal">+100-150 EXP</p>
            </div>
          </button>

          <button
            disabled={requesting}
            onClick={() => handleRequestQuest('EMERGENCY')}
            className="p-2.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/50 text-red-300 text-xs font-bold transition-all text-left flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <div>
              <p>{lang === 'th' ? 'เควสต์ฉุกเฉิน' : 'EMERGENCY QUEST'}</p>
              <p className="text-[10px] text-zinc-400 font-normal">+300 EXP</p>
            </div>
          </button>

          <button
            disabled={requesting}
            onClick={() => handleRequestQuest('SPECIAL')}
            className="p-2.5 rounded bg-yellow-950/40 hover:bg-yellow-900/60 border border-yellow-500/40 text-yellow-300 text-xs font-bold transition-all text-left flex items-center gap-2"
          >
            <Award className="w-4 h-4 text-yellow-400" />
            <div>
              <p>{lang === 'th' ? 'เควสต์พิเศษ' : 'SPECIAL QUEST'}</p>
              <p className="text-[10px] text-zinc-400 font-normal">+250 EXP</p>
            </div>
          </button>

          <button
            disabled={requesting}
            onClick={() => handleRequestQuest('RECOVERY')}
            className="p-2.5 rounded bg-teal-950/40 hover:bg-teal-900/60 border border-teal-500/40 text-teal-300 text-xs font-bold transition-all text-left flex items-center gap-2"
          >
            <Heart className="w-4 h-4 text-teal-400" />
            <div>
              <p>{lang === 'th' ? 'โปรโตคอลฟื้นฟู' : 'RECOVERY PROTOCOL'}</p>
              <p className="text-[10px] text-zinc-400 font-normal">+120 EXP</p>
            </div>
          </button>
        </div>
      </div>

      {/* Quests Listing */}
      <div className="space-y-4">
        {filteredQuests.length > 0 ? (
          filteredQuests.map((quest) => {
            const badge = typeBadges[quest.type] || typeBadges.DAILY;
            const Icon = badge.icon;
            const isEmergency = quest.type === 'EMERGENCY';
            const isPenalty = quest.type === 'PENALTY';

            return (
              <div
                key={quest.id}
                className={`rounded-lg p-5 transition-all font-mono-hud border ${
                  isEmergency
                    ? 'hud-border-alert bg-[#0f0507]'
                    : isPenalty
                    ? 'hud-border-alert bg-[#120904]'
                    : quest.status === 'COMPLETED'
                    ? 'bg-[#050912]/80 border-zinc-800 opacity-80'
                    : 'hud-border bg-[#080f1d]'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/10 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold border flex items-center gap-1.5 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {getQuestTypeDisplay(quest.type)}
                    </span>
                    <span
                      className={`text-xs ${
                        quest.status === 'COMPLETED'
                          ? 'text-cyan-400'
                          : quest.status === 'FAILED'
                          ? 'text-red-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {lang === 'th' ? 'สถานะ: ' : 'STATUS: '}
                      {quest.status === 'COMPLETED'
                        ? (lang === 'th' ? 'สำเร็จแล้ว' : 'COMPLETED')
                        : quest.status === 'FAILED'
                        ? (lang === 'th' ? 'ล้มเหลว' : 'FAILED')
                        : (lang === 'th' ? 'ยังไม่เสร็จสิ้น' : 'INCOMPLETE')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t.timeLimit}: {quest.timeLimit}</span>
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div className="mb-4">
                  <h3 className="text-xl font-rajdhani font-bold text-white tracking-wide">
                    {quest.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{quest.subtitle}</p>
                </div>

                {/* Objectives */}
                <div className="space-y-2.5 mb-4">
                  {quest.objectives.map((obj: QuestObjective) => {
                    const progress = Math.min(100, Math.round((obj.current / obj.target) * 100));
                    return (
                      <div
                        key={obj.id}
                        className={`p-3 rounded border text-xs ${
                          obj.completed
                            ? 'bg-cyan-950/20 border-cyan-500/30'
                            : 'bg-black/40 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={obj.completed ? 'text-zinc-400 line-through' : 'text-zinc-200'}>
                            {obj.description}
                          </span>
                          <span className="font-bold text-cyan-300">
                            {obj.current} / {obj.target} {obj.unit} ({progress}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full transition-all duration-300 ${
                              obj.completed ? 'bg-cyan-400' : 'bg-cyan-600'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        {/* Incrementers */}
                        {quest.status === 'INCOMPLETE' && !obj.completed && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                playActionVerified();
                                onUpdateObjective(quest.id, obj.id, 5);
                              }}
                              className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-[11px] text-cyan-300 transition-colors"
                            >
                              +5 {obj.unit}
                            </button>
                            <button
                              onClick={() => {
                                playActionVerified();
                                onUpdateObjective(quest.id, obj.id, obj.target - obj.current);
                              }}
                              className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400 text-[11px] text-cyan-200 font-bold transition-colors"
                            >
                              {t.verifyComplete}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer and Rewards */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-cyan-500/10 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-300 font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-cyan-400" />
                      +{quest.expReward} EXP
                    </span>
                    {quest.statRewards && (
                      <span className="text-zinc-400">
                        {t.statRewards}:{' '}
                        {Object.entries(quest.statRewards)
                          .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
                          .join(', ')}
                      </span>
                    )}
                  </div>

                  {quest.status === 'INCOMPLETE' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          playSystemAlert();
                          onFailQuest(quest.id);
                        }}
                        className="px-3 py-1.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs transition-colors"
                      >
                        {t.abandonPenalty}
                      </button>
                      <button
                        onClick={() => {
                          playQuestComplete();
                          onCompleteQuest(quest.id);
                        }}
                        className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_10px_rgba(6,182,212,0.6)] transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t.completeQuest}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center rounded-lg bg-[#070b14] border border-cyan-500/20 font-mono-hud text-zinc-500 text-sm">
            {lang === 'th'
              ? `ไม่พบเควสต์ในหมวด [${getFilterName(filter)}]`
              : `NO QUESTS FOUND UNDER FILTER [${filter}].`}
          </div>
        )}
      </div>
    </div>
  );
};
