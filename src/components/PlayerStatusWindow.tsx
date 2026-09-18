import React from 'react';
import { Shield, Zap, Heart, Flame, Compass, Plus, Award, Activity, HelpCircle } from 'lucide-react';
import { FullPlayerData, PlayerStats } from '../types';
import { playSystemBeep } from '../utils/audio';
import { useLanguage } from '../utils/LanguageContext';

interface PlayerStatusWindowProps {
  playerData: FullPlayerData;
  onAllocateStat: (statKey: keyof Omit<PlayerStats, 'unallocatedPoints'>) => void;
}

interface StatDef {
  key: keyof Omit<PlayerStats, 'unallocatedPoints'>;
  label: string;
  fullName: string;
  fullNameTh: string;
  icon: React.ElementType;
  descriptionTh: string;
  descriptionEn: string;
  systemImpactTh: string;
  systemImpactEn: string;
}

const STAT_DEFINITIONS: StatDef[] = [
  {
    key: 'str',
    label: 'STR',
    fullName: 'STRENGTH',
    fullNameTh: 'ความแข็งแกร่ง',
    icon: Flame,
    descriptionTh: 'พละกำลังกล้ามเนื้อ แรงต้านทาน และขีดความสามารถของน้ำหนักตัว',
    descriptionEn: 'Muscular power, physical resistance, and bodyweight output capacity.',
    systemImpactTh: 'ปลดล็อกจำนวนการวิดพื้น/แรงต้าน และการพัฒนาพลังกาย',
    systemImpactEn: 'Unlocks higher push-up/resistance rep targets and power progression.',
  },
  {
    key: 'agi',
    label: 'AGI',
    fullName: 'AGILITY',
    fullNameTh: 'ความว่องไว',
    icon: Zap,
    descriptionTh: 'ความเร็วในการตอบสนอง ความตื่นตัวยามเช้า และการเริ่มลงมือทำทันที',
    descriptionEn: 'Reaction speed, morning readiness, and swift task execution.',
    systemImpactTh: 'ส่งผลต่อความเร็วการเคลื่อนไหวและภารกิจเตรียมพร้อมยามเช้า',
    systemImpactEn: 'Affects speed of movement objectives and morning foundation protocols.',
  },
  {
    key: 'vit',
    label: 'VIT',
    fullName: 'VITALITY',
    fullNameTh: 'พลังชีวิตและการฟื้นฟู',
    icon: Heart,
    descriptionTh: 'อัตราการฟื้นตัวของเซลล์ ความทนทานต่อความล้า และสุขภาพโดยรวม',
    descriptionEn: 'Biological recovery rate, cellular resistance, and fatigue threshold.',
    systemImpactTh: 'ลดความเสี่ยงบาดเจ็บ เร่งประสิทธิภาพการฟื้นตัวจากความเหนื่อยล้า',
    systemImpactEn: 'Lowers injury risk, accelerates recovery quest efficiency, and boosts health.',
  },
  {
    key: 'end',
    label: 'END',
    fullName: 'ENDURANCE',
    fullNameTh: 'ความทนทาน',
    icon: Shield,
    descriptionTh: 'ความอึดของระบบหัวใจและปอด การออกกำลังกายแบบต่อเนื่อง',
    descriptionEn: 'Aerobic stamina, sustained aerobic capacity, and cardiovascular resilience.',
    systemImpactTh: 'ช่วยให้ทำคาร์ดิโอได้นานขึ้น (30-60 นาที) และทำสควอทได้มากขึ้น',
    systemImpactEn: 'Enables longer cardio durations (30-60 min) and higher volume squat sets.',
  },
  {
    key: 'disc',
    label: 'DISC',
    fullName: 'DISCIPLINE',
    fullNameTh: 'วินัยจิตใจ',
    icon: Compass,
    descriptionTh: 'ความแน่วแน่ ความสม่ำเสมอ การเอาชนะการผัดวันประกันพรุ่ง',
    descriptionEn: 'Mental grit, daily adherence, resistance to procrastination and distractions.',
    systemImpactTh: 'ทวีคูณคะแนน Streak ควบคุมความต่อเนื่อง และลดผลกระทบบทลงโทษ',
    systemImpactEn: 'Governs streak multipliers, high-focus deep work tasks, and penalty mitigation.',
  },
];

export const PlayerStatusWindow: React.FC<PlayerStatusWindowProps> = ({
  playerData,
  onAllocateStat,
}) => {
  const { t, lang } = useLanguage();
  const { profile, stats, level } = playerData;
  const unallocated = stats.unallocatedPoints || 0;

  const handleAllocate = (key: keyof Omit<PlayerStats, 'unallocatedPoints'>) => {
    playSystemBeep(1200, 0.05);
    onAllocateStat(key);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Authentic System Status Window Frame */}
      <div className="relative rounded-lg bg-[#060b17] border border-cyan-500/50 p-6 sm:p-8 shadow-[0_0_30px_rgba(6,182,212,0.15)] corner-bracket">
        {/* Top Header */}
        <div className="text-center border-b border-cyan-500/30 pb-5 mb-6">
          <p className="text-xs font-mono-hud text-cyan-400 tracking-[0.25em] uppercase">
            {t.biometricEvaluation}
          </p>
          <h2 className="text-3xl sm:text-4xl font-rajdhani font-bold text-white tracking-widest mt-1 hud-glow-text">
            {t.playerStatusTitle}
          </h2>
        </div>

        {/* Identity & Core Hierarchy */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded bg-black/40 border border-cyan-500/20 font-mono-hud mb-6">
          <div className="text-center sm:text-left">
            <span className="text-[11px] text-zinc-500 block">{t.name}</span>
            <span className="text-lg sm:text-xl font-bold text-white tracking-wider">{profile.name}</span>
            <span className="text-[10px] text-cyan-400/80 block">{profile.title}</span>
          </div>
          <div className="text-center sm:text-left">
            <span className="text-[11px] text-zinc-500 block">{t.level}</span>
            <span className="text-lg sm:text-xl font-bold text-cyan-300">
              {level.currentLevel.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] text-zinc-400 block">{t.protagonist}</span>
          </div>
          <div className="text-center sm:text-left">
            <span className="text-[11px] text-zinc-500 block">{t.rank}</span>
            <span className="text-lg sm:text-xl font-bold text-cyan-400">{level.rank}</span>
            <span className="text-[10px] text-zinc-400 block">{t.systemClass}</span>
          </div>
          <div className="text-center sm:text-left">
            <span className="text-[11px] text-zinc-500 block">{t.expGauge}</span>
            <span className="text-sm font-bold text-white block">
              {level.currentExp.toLocaleString()} / {level.nextLevelExp.toLocaleString()}
            </span>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-cyan-400"
                style={{ width: `${Math.min(100, (level.currentExp / level.nextLevelExp) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Unallocated Points Alert Banner */}
        {unallocated > 0 && (
          <div className="mb-6 p-3 rounded bg-cyan-950/60 border border-cyan-400 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse font-mono-hud">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-xs sm:text-sm font-bold text-cyan-200">
                {lang === 'th' ? `มีแต้มสเตตัสที่ยังไม่ได้จัดสรร: ${unallocated} แต้ม` : `UNALLOCATED ATTRIBUTE POINTS AVAILABLE: ${unallocated}`}
              </span>
            </div>
            <span className="text-xs text-zinc-300">
              {lang === 'th' ? 'กดปุ่ม +1 ด้านล่างเพื่อเพิ่มค่าพลังของตัวเอก' : 'Assign points to reinforce Player attributes.'}
            </span>
          </div>
        )}

        {/* STATS SECTION */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-mono-hud text-cyan-400 border-b border-cyan-500/20 pb-2 mb-4">
            <span className="tracking-wider">{t.coreAttributes}</span>
            <span>{t.systemValue}</span>
          </div>

          <div className="space-y-3">
            {STAT_DEFINITIONS.map((def) => {
              const val = stats[def.key];
              const Icon = def.icon;
              const maxGauge = 40;
              const barPercent = Math.min(100, Math.round((val / maxGauge) * 100));
              const displayName = lang === 'th' ? `${def.fullNameTh} (${def.fullName})` : def.fullName;
              const displayImpact = lang === 'th' ? def.systemImpactTh : def.systemImpactEn;

              return (
                <div
                  key={def.key}
                  className="p-3.5 rounded bg-black/50 border border-cyan-500/20 hover:border-cyan-500/40 transition-all font-mono-hud"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white tracking-wider">{def.label}</span>
                          <span className="text-xs text-zinc-400 font-medium">({displayName})</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{displayImpact}</p>
                      </div>
                    </div>

                    {/* Numeric Value & Allocate Button */}
                    <div className="flex items-center justify-end gap-3 self-end sm:self-center">
                      <div className="w-24 sm:w-32 bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
                          style={{ width: `${barPercent}%` }}
                        />
                      </div>
                      <span className="text-lg font-bold text-cyan-300 w-8 text-right">{val}</span>
                      
                      {unallocated > 0 && (
                        <button
                          onClick={() => handleAllocate(def.key)}
                          className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                        >
                          <Plus className="w-3 h-3" />
                          +1
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full border-t border-cyan-500/30 my-6" />

        {/* Bottom Metrics (Quests Completed & Streak) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono-hud text-center">
          <div className="p-4 rounded bg-black/40 border border-cyan-500/20">
            <span className="text-xs text-zinc-500 block mb-1">
              {lang === 'th' ? 'เควสต์ที่สำเร็จแล้ว' : 'QUESTS COMPLETED'}
            </span>
            <span className="text-2xl font-bold text-white tracking-wider">
              {profile.totalQuestsCompleted}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">{t.verifiedExecutions}</span>
          </div>

          <div className="p-4 rounded bg-black/40 border border-cyan-500/20">
            <span className="text-xs text-zinc-500 block mb-1">
              {lang === 'th' ? 'ความต่อเนื่อง' : 'CURRENT STREAK'}
            </span>
            <span className="text-2xl font-bold text-amber-400 tracking-wider">
              {profile.currentStreak} {t.days}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">
              {lang === 'th' ? `สถิติสูงสุด: ${profile.bestStreak} วัน` : `BEST: ${profile.bestStreak} DAYS`}
            </span>
          </div>

          <div className="p-4 rounded bg-black/40 border border-cyan-500/20">
            <span className="text-xs text-zinc-500 block mb-1">
              {lang === 'th' ? 'ดัชนีวินัยของระบบ' : 'DISCIPLINE RATING'}
            </span>
            <span className="text-2xl font-bold text-cyan-300 tracking-wider">
              {Math.min(99, Math.round(stats.disc * 3.8))}%
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">{t.systemConsistencyIndex}</span>
          </div>
        </div>

        {/* Biometric Baseline Parameters */}
        <div className="mt-6 pt-4 border-t border-cyan-500/10 text-xs font-mono-hud text-zinc-400 flex flex-wrap justify-between gap-2">
          <span>{t.ageYrs}: {profile.age} {lang === 'th' ? 'ปี' : 'YRS'}</span>
          <span>{t.heightCm}: {profile.height} ซม.</span>
          <span>{t.weightKg}: {profile.weight} กก.</span>
          <span>{t.activityBase}: {profile.activityLevel}</span>
          <span>{t.penaltyRecord}: {profile.penaltyCount} {lang === 'th' ? 'ครั้ง' : ''}</span>
        </div>
      </div>
    </div>
  );
};
