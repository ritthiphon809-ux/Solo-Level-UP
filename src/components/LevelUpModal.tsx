import React, { useEffect } from 'react';
import { ArrowUp, Award, Sparkles, X, Flame } from 'lucide-react';
import { LevelUpEvent } from '../types';
import { playLevelUp } from '../utils/audio';
import { useLanguage } from '../utils/LanguageContext';

interface LevelUpModalProps {
  event: LevelUpEvent;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ event, onClose }) => {
  const { t, lang } = useLanguage();

  useEffect(() => {
    playLevelUp();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono-hud animate-fade-in">
      <div className="w-full max-w-md bg-[#050b18] border-2 border-cyan-400 rounded-lg p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.4)] text-center relative corner-bracket">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded hover:bg-cyan-950 text-cyan-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Level Up Burst Animation */}
        <div className="relative inline-block mb-3">
          <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto animate-ping" />
          <div className="w-16 h-16 rounded-full bg-cyan-950 border-2 border-cyan-300 flex items-center justify-center mx-auto absolute top-0 left-0 right-0 shadow-[0_0_25px_rgba(6,182,212,0.8)]">
            <ArrowUp className="w-8 h-8 text-cyan-300" />
          </div>
        </div>

        {/* Title */}
        <p className="text-xs text-cyan-400 tracking-[0.25em] uppercase font-bold">
          {t.systemNotificationModal}
        </p>
        <h2 className="text-4xl font-rajdhani font-bold text-white tracking-widest mt-1 hud-glow-text">
          {t.levelUpTitle}
        </h2>

        {/* Level Transition */}
        <div className="my-4 py-2 px-4 rounded bg-cyan-950/50 border border-cyan-500/40 inline-flex items-center gap-3 text-2xl font-rajdhani font-bold text-cyan-200">
          <span>{t.level} {event.oldLevel.toString().padStart(2, '0')}</span>
          <span className="text-cyan-400">→</span>
          <span className="text-white text-3xl font-bold">{t.level} {event.newLevel.toString().padStart(2, '0')}</span>
        </div>

        <p className="text-xs text-zinc-300 mb-4 font-mono-hud">
          {t.levelUpSubtitle}
        </p>

        {/* Attribute Gains */}
        <div className="p-3.5 rounded bg-black/60 border border-cyan-500/20 text-left text-xs mb-5 space-y-1.5">
          <p className="text-[11px] text-cyan-400 tracking-wider font-bold">{t.attributeIncrements}</p>
          <div className="grid grid-cols-2 gap-2 text-zinc-200 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400">✓</span>
              <span>+{event.statGains?.str || 1} STR ({lang === 'th' ? 'พละกำลัง' : 'Strength'})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400">✓</span>
              <span>+{event.statGains?.vit || 1} VIT ({lang === 'th' ? 'พลังชีวิต' : 'Vitality'})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400">✓</span>
              <span>+{event.statGains?.disc || 1} DISC ({lang === 'th' ? 'วินัย' : 'Discipline'})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400">✓</span>
              <span className="text-amber-300 font-bold">
                +{event.pointsGranted} {lang === 'th' ? 'แต้มสเตตัส' : 'STAT POINTS'}
              </span>
            </div>
          </div>
        </div>

        {/* Confirm / Continue Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-rajdhani font-bold text-base tracking-wider rounded shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all"
        >
          {t.confirmAcknowledgement}
        </button>
      </div>
    </div>
  );
};
