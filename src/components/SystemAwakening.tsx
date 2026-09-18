import React, { useState, useEffect } from 'react';
import { Terminal, Zap, Shield, ChevronRight, CheckCircle2, UserCheck, Languages } from 'lucide-react';
import { playAwakening, playSystemBeep } from '../utils/audio';
import { useLanguage } from '../utils/LanguageContext';

interface SystemAwakeningProps {
  onAwakenComplete: (data: {
    name: string;
    age: number;
    height: number;
    weight: number;
    activityLevel: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE';
    goal: string;
    availableTime: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

export const SystemAwakening: React.FC<SystemAwakeningProps> = ({
  onAwakenComplete,
  onCancel,
}) => {
  const { t, lang, setLanguage } = useLanguage();
  const [step, setStep] = useState<number>(0); // 0: Boot sequence, 1: Calibration Form, 2: Final Awakening
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('24');
  const [height, setHeight] = useState('175');
  const [weight, setWeight] = useState('70');
  const [activityLevel, setActivityLevel] = useState<'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE'>('MODERATE');
  const [goal, setGoal] = useState(
    lang === 'th'
      ? 'สร้างวินัย พัฒนาความแข็งแกร่งทางร่างกาย และก้าวข้ามขีดจำกัดตนเอง'
      : 'Build unstoppable strength, physical resilience and peak discipline'
  );
  const [availableTime, setAvailableTime] = useState(lang === 'th' ? '45 นาที / วัน' : '45 min / day');

  const INITIAL_BOOT_SEQUENCE = lang === 'th' ? [
    'กำลังเริ่มระบบ SYSTEM...',
    'สแกนพิกัดมิติและเวลา...',
    'ตรวจพบสัญญาณชีวิตของผู้เล่น...',
    'เริ่มโปรโตคอลเทียบอัตราชีวมาตรของตัวเอก (PROTAGONIST)...',
  ] : [
    'SYSTEM INITIALIZING...',
    'SCANNING TEMPORAL-SPATIAL ANCHORS...',
    'PLAYER PRESENCE DETECTED.',
    'PROTAGONIST BIOMETRIC CALIBRATION PROTOCOL ENGAGED.',
  ];

  useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < INITIAL_BOOT_SEQUENCE.length) {
        setBootLines((prev) => [...prev, INITIAL_BOOT_SEQUENCE[currentIdx]]);
        playSystemBeep(1400 - currentIdx * 100, 0.04);
        currentIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setStep(1);
        }, 800);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [lang]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setStep(2);
    playAwakening();

    setTimeout(async () => {
      await onAwakenComplete({
        name: name.trim().toUpperCase(),
        age: parseInt(age, 10) || 24,
        height: parseFloat(height) || 175,
        weight: parseFloat(weight) || 70,
        activityLevel,
        goal,
        availableTime,
      });
      setSubmitting(false);
    }, 2200);
  };

  const getActivityLabel = (lvl: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE') => {
    if (lang === 'th') {
      switch (lvl) {
        case 'SEDENTARY': return 'นั่งทำงานเป็นหลัก';
        case 'LIGHT': return 'ขยับตัวเบาๆ';
        case 'MODERATE': return 'ปานกลาง';
        case 'ACTIVE': return 'ออกกำลังประจำ';
      }
    }
    return lvl;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#03060f]/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto font-mono-hud">
      <div className="w-full max-w-2xl bg-[#060c18] border border-cyan-500/50 rounded-lg p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.25)] relative corner-bracket">
        
        {/* Top Language Toggle */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={() => setLanguage(lang === 'th' ? 'en' : 'th')}
            className="px-2.5 py-1 rounded bg-black/60 border border-cyan-500/40 text-[11px] text-cyan-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'th' ? '🇹🇭 ภาษาไทย' : '🇺🇸 English'}</span>
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
            >
              {lang === 'th' ? 'ยกเลิก' : 'CANCEL'}
            </button>
          )}
        </div>

        {/* Step 0: Boot Sequence */}
        {step === 0 && (
          <div className="space-y-4 py-8 text-center">
            <div className="inline-block p-4 rounded-full bg-cyan-950/60 border border-cyan-400 mb-2 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <Zap className="w-10 h-10 text-cyan-400 animate-pulse" />
            </div>

            <div className="space-y-2 text-left bg-black/60 p-4 rounded border border-cyan-500/30 text-xs text-cyan-300">
              {bootLines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-cyan-500 font-bold">&gt;</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Calibration Form */}
        {step === 1 && (
          <div className="space-y-6 pt-2">
            <div className="border-b border-cyan-500/30 pb-4">
              <span className="text-xs text-cyan-400 tracking-widest">{t.awakeningHeader}</span>
              <h2 className="text-2xl sm:text-3xl font-rajdhani font-bold text-white tracking-wide mt-1">
                {t.awakeningTitle}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {t.awakeningSubtitle}
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {/* Name */}
              <div>
                <label className="block text-zinc-300 mb-1 font-bold">
                  {t.playerDesignation} <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === 'th' ? 'เช่น OHM, SUNG JINWOO, วีรบุรุษ...' : 'e.g. OHM, SUNG JINWOO, JANE...'}
                  className="w-full bg-black/60 border border-cyan-500/40 rounded px-3 py-2.5 text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Physical Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">{t.ageLabel}</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-700 rounded px-3 py-2 text-white font-mono focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">{t.heightLabel}</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-700 rounded px-3 py-2 text-white font-mono focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">{t.weightLabel}</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-700 rounded px-3 py-2 text-white font-mono focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-zinc-300 mb-1 font-bold">{t.physicalBaseline}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setActivityLevel(lvl)}
                      className={`p-2 rounded border text-[11px] font-mono transition-all ${
                        activityLevel === lvl
                          ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                          : 'bg-black/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {getActivityLabel(lvl)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Goal */}
              <div>
                <label className="block text-zinc-300 mb-1 font-bold">{t.primaryGoal}</label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder={lang === 'th' ? 'เช่น พัฒนาความแข็งแรงและวินัยต่อเนื่องทุกวัน' : 'e.g. Master physical endurance and consistent daily discipline'}
                  className="w-full bg-black/60 border border-zinc-700 rounded px-3 py-2 text-white font-mono focus:border-cyan-400"
                />
              </div>

              {/* Available Time */}
              <div>
                <label className="block text-zinc-300 mb-1 font-bold">{t.availableCapacity}</label>
                <input
                  type="text"
                  value={availableTime}
                  onChange={(e) => setAvailableTime(e.target.value)}
                  placeholder={lang === 'th' ? 'เช่น 45 นาที / วัน' : 'e.g. 45 min / day'}
                  className="w-full bg-black/60 border border-zinc-700 rounded px-3 py-2 text-white font-mono focus:border-cyan-400"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-cyan-500/30">
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-rajdhani font-bold text-lg tracking-widest rounded shadow-[0_0_20px_rgba(6,182,212,0.7)] transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  {t.initiateAwakening}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Final Cinematic Awakening Sequence */}
        {step === 2 && (
          <div className="py-12 text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto animate-ping" />
              <div className="w-20 h-20 rounded-full bg-cyan-950 border-2 border-cyan-300 flex items-center justify-center mx-auto absolute top-0 left-0 right-0 shadow-[0_0_30px_rgba(6,182,212,0.9)]">
                <UserCheck className="w-10 h-10 text-cyan-300 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2 mt-6">
              <p className="text-xs text-cyan-400 tracking-[0.3em] font-bold">
                {t.biometricSyncComplete}
              </p>
              <h2 className="text-3xl sm:text-4xl font-rajdhani font-bold text-white hud-glow-text">
                {t.systemActivated}
              </h2>
              <p className="text-lg text-cyan-200 font-rajdhani">
                {t.welcomePlayer} {name.toUpperCase()}.
              </p>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                {t.awakeningSuccessMsg}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
