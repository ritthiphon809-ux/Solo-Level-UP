import React, { useState, useEffect } from 'react';
import { Shield, Volume2, VolumeX, Users, PlusCircle, Activity, ChevronDown, Check, Languages } from 'lucide-react';
import { FullPlayerData, Rank, User } from '../types';
import { isSoundEnabled, toggleSound, playSystemBeep } from '../utils/audio';
import { useLanguage } from '../utils/LanguageContext';

interface SystemHeaderProps {
  playerData: FullPlayerData | null;
  users: User[];
  currentUserId: string;
  onSwitchUser: (userId: string) => void;
  onOpenAwakening: () => void;
}

const rankColors: Record<Rank, { border: string; text: string; bg: string }> = {
  E: { border: 'border-slate-500/50', text: 'text-slate-400', bg: 'bg-slate-900/40' },
  D: { border: 'border-zinc-400/50', text: 'text-zinc-300', bg: 'bg-zinc-900/40' },
  C: { border: 'border-cyan-400/60', text: 'text-cyan-300', bg: 'bg-cyan-950/40' },
  B: { border: 'border-emerald-400/60', text: 'text-emerald-300', bg: 'bg-emerald-950/40' },
  A: { border: 'border-amber-400/70', text: 'text-amber-300', bg: 'bg-amber-950/40' },
  S: { border: 'border-purple-400/80', text: 'text-purple-300', bg: 'bg-purple-950/50' },
};

export const SystemHeader: React.FC<SystemHeaderProps> = ({
  playerData,
  users,
  currentUserId,
  onSwitchUser,
  onOpenAwakening,
}) => {
  const { lang, setLang, t } = useLanguage();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [timeToMidnight, setTimeToMidnight] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      const diff = midnight.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeToMidnight('00:00:00');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeToMidnight(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSoundToggle = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) playSystemBeep(1200, 0.05);
  };

  const handleLangToggle = () => {
    playSystemBeep(1000, 0.04);
    setLang(lang === 'th' ? 'en' : 'th');
  };

  const rankStyle = playerData?.level?.rank ? rankColors[playerData.level.rank] : rankColors.E;

  return (
    <header className="relative z-30 border-b border-cyan-500/20 bg-[#05070d]/90 backdrop-blur-md px-4 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & System Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/30">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-cyan-400 relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-rajdhani font-bold text-lg md:text-xl tracking-wider text-white flex items-center gap-1.5">
                SOLO LEVEL UP <span className="text-cyan-400 text-xs font-mono font-normal">{t.systemOS}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono-hud text-cyan-400/70">
              <span className="flex items-center gap-1">
                <Activity className="w-2.5 h-2.5 text-cyan-400" />
                {t.systemOnline}
              </span>
              <span>•</span>
              <span>{t.timeToReset}: {timeToMidnight || '23:59:59'}</span>
            </div>
          </div>
        </div>

        {/* Player Telemetry Pill */}
        {playerData && (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Language Switcher Button */}
            <button
              id="lang-toggle-button"
              onClick={handleLangToggle}
              title="สลับภาษา (Switch Language: TH / EN)"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b1220] border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono-hud transition-colors"
            >
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              <span className={lang === 'th' ? 'text-cyan-300 font-bold' : 'text-zinc-500'}>TH</span>
              <span className="text-zinc-600">/</span>
              <span className={lang === 'en' ? 'text-cyan-300 font-bold' : 'text-zinc-500'}>EN</span>
            </button>

            {/* Player Designation */}
            <div className="relative">
              <button
                id="player-switcher-button"
                onClick={() => {
                  playSystemBeep();
                  setShowUserMenu(!showUserMenu);
                }}
                className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0b1220] border border-cyan-500/30 hover:border-cyan-400 transition-colors text-xs font-mono-hud"
              >
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-zinc-400">{t.player}:</span>
                <span className="text-white font-bold">{playerData.profile.name}</span>
                <ChevronDown className="w-3 h-3 text-cyan-400/80" />
              </button>

              {/* Dropdown User Switcher */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded bg-[#080d18] border border-cyan-500/40 shadow-2xl p-2 z-50 text-xs font-mono-hud">
                  <div className="px-2 py-1 text-[10px] text-cyan-400/80 border-b border-cyan-500/20 mb-1 flex items-center justify-between">
                    <span>{t.selectPlayer}</span>
                    <span>{t.isolated}</span>
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        playSystemBeep();
                        onSwitchUser(u.id);
                        setShowUserMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left transition-colors mb-0.5 ${
                        u.id === currentUserId
                          ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-200'
                          : 'hover:bg-cyan-950/20 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <div>
                          <p className="font-bold text-white">{u.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">ID: {u.id}</p>
                        </div>
                      </div>
                      {u.id === currentUserId && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  ))}

                  <div className="border-t border-cyan-500/20 mt-1.5 pt-1.5">
                    <button
                      onClick={() => {
                        playSystemBeep();
                        setShowUserMenu(false);
                        onOpenAwakening();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-cyan-900/40 hover:bg-cyan-900/70 border border-cyan-500/50 text-cyan-300 transition-colors font-bold"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      {t.newAwakening}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Level & Rank Badge */}
            <div className="flex items-center gap-1.5 bg-[#080d18] border border-cyan-500/30 px-2.5 py-1 rounded text-xs font-mono-hud">
              <span className="text-zinc-400">{t.level}</span>
              <span className="text-cyan-300 font-bold">{playerData.level.currentLevel.toString().padStart(2, '0')}</span>
              <span className="text-cyan-600">|</span>
              <span
                className={`px-1.5 py-0.2 rounded border text-[11px] font-bold ${rankStyle.border} ${rankStyle.text} ${rankStyle.bg}`}
              >
                {t.rank} {playerData.level.rank}
              </span>
            </div>

            {/* EXP Preview */}
            <div className="hidden md:flex items-center gap-2 bg-[#080d18] border border-cyan-500/20 px-2.5 py-1 rounded text-xs font-mono-hud">
              <span className="text-zinc-400">{t.exp}:</span>
              <span className="text-cyan-300">
                {playerData.level.currentExp.toLocaleString()} / {playerData.level.nextLevelExp.toLocaleString()}
              </span>
              <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(3, (playerData.level.currentExp / playerData.level.nextLevelExp) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Sound Toggle */}
            <button
              id="sound-toggle-button"
              onClick={handleSoundToggle}
              title={soundOn ? t.soundOn : t.soundMuted}
              className="p-1.5 rounded border border-cyan-500/30 bg-[#080d18] hover:border-cyan-400 text-cyan-400 hover:text-cyan-200 transition-colors"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
