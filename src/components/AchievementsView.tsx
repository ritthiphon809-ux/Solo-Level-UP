import React from 'react';
import { Award, Lock, CheckCircle2, Trophy, Zap, Flame, Shield, Sparkles } from 'lucide-react';
import { FullPlayerData } from '../types';
import { useLanguage } from '../utils/LanguageContext';

interface AchievementsViewProps {
  playerData: FullPlayerData;
}

const ACHIEVEMENT_THAI: Record<string, { title: string; description: string }> = {
  FIRST_QUEST: {
    title: 'ก้าวแรกของผู้เล่น (First Quest Cleared)',
    description: 'เริ่มต้นเส้นทางชีวิตจริง ทำภารกิจแรกของระบบสำเร็จเรียบร้อย',
  },
  STREAK_7: {
    title: 'ผู้รอดชีวิต 7 วัน (7-Day Survivor)',
    description: 'รักษาความต่อเนื่องในการทำภารกิจทุกวันติดต่อกันครบ 7 วัน',
  },
  STREAK_30: {
    title: 'เจตจำนงเหล็กกล้า (Iron Will)',
    description: 'รักษาความสม่ำเสมอในการพัฒนาตนเองต่อเนื่องครบ 30 วัน',
  },
  PUSHUP_CENTURY: {
    title: 'เจ้าแห่งการวิดพื้น (Century Push-Ups)',
    description: 'สะสมการวิดพื้นผ่านการตรวจสอบของระบบครบ 100 ครั้ง',
  },
  SHADOW_MONARCH: {
    title: 'การกำเนิดของราชันเงา (Shadow Monarch Awakening)',
    description: 'ก้าวข้ามขีดจำกัดทางกายภาพและจิตใจ บรรลุระดับเลเวล 50',
  },
};

export const AchievementsView: React.FC<AchievementsViewProps> = ({ playerData }) => {
  const { t, lang } = useLanguage();
  const achievements = playerData.achievements || [];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4 font-mono-hud">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <span>{t.systemFeats}</span>
            <span>•</span>
            <span>{t.protagonistGrowth}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-rajdhani font-bold text-white tracking-wide mt-0.5">
            {t.achievementsTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-[#080d18] border border-cyan-500/30 px-3 py-1.5 rounded text-xs">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-zinc-400">{t.unlockedLabel}:</span>
          <span className="text-cyan-300 font-bold">
            {unlockedCount} / {achievements.length}
          </span>
        </div>
      </div>

      {/* Grid of Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono-hud">
        {achievements.map((ach) => {
          const isShadowMonarch = ach.id === 'SHADOW_MONARCH';
          const thInfo = ACHIEVEMENT_THAI[ach.id];
          const displayTitle = lang === 'th' && thInfo ? thInfo.title : ach.title;
          const displayDesc = lang === 'th' && thInfo ? thInfo.description : ach.description;

          return (
            <div
              key={ach.id}
              className={`p-4 rounded-lg border transition-all relative overflow-hidden ${
                ach.unlocked
                  ? isShadowMonarch
                    ? 'bg-gradient-to-r from-purple-950/60 to-black border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                    : 'bg-[#071324] border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'bg-[#040812]/70 border-zinc-800 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded flex items-center justify-center text-lg border ${
                    ach.unlocked
                      ? isShadowMonarch
                        ? 'bg-purple-900/40 border-purple-400 text-purple-300'
                        : 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-600'
                  }`}
                >
                  {isShadowMonarch ? (
                    <Sparkles className="w-5 h-5 text-purple-300" />
                  ) : ach.unlocked ? (
                    <Trophy className="w-5 h-5 text-cyan-300" />
                  ) : (
                    <Lock className="w-4 h-4 text-zinc-600" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm font-bold tracking-wider ${
                        ach.unlocked
                          ? isShadowMonarch
                            ? 'text-purple-300'
                            : 'text-white'
                          : 'text-zinc-500'
                      }`}
                    >
                      {displayTitle}
                    </h3>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                        ach.unlocked
                          ? isShadowMonarch
                            ? 'bg-purple-900/40 text-purple-300 border-purple-500/40'
                            : 'bg-cyan-950/50 text-cyan-300 border-cyan-500/40'
                          : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                      }`}
                    >
                      {ach.unlocked ? t.clearedBadge : t.lockedBadge}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 mt-1">{displayDesc}</p>

                  {/* Reward & Progress */}
                  <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-cyan-500/10">
                    <span className="text-cyan-400/90 font-medium">+{ach.expReward} EXP</span>

                    {ach.unlocked && ach.unlockedAt ? (
                      <span className="text-[10px] text-zinc-500">
                        {new Date(ach.unlockedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>
                          {ach.progress} / {ach.maxProgress}
                        </span>
                        <div className="w-16 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-600 h-full"
                            style={{ width: `${Math.min(100, (ach.progress / ach.maxProgress) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
