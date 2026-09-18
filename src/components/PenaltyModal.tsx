import React, { useEffect } from 'react';
import { AlertTriangle, ShieldAlert, X, Flame } from 'lucide-react';
import { Quest } from '../types';
import { playSystemAlert } from '../utils/audio';
import { useLanguage } from '../utils/LanguageContext';

interface PenaltyModalProps {
  penaltyQuest: Quest | null;
  onClose: () => void;
}

export const PenaltyModal: React.FC<PenaltyModalProps> = ({ penaltyQuest, onClose }) => {
  const { t, lang } = useLanguage();

  useEffect(() => {
    playSystemAlert();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono-hud animate-fade-in">
      <div className="w-full max-w-md bg-[#120507] border-2 border-red-500 rounded-lg p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.4)] text-center relative corner-bracket">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded hover:bg-red-950 text-red-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative inline-block mb-3">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto animate-ping" />
          <div className="w-16 h-16 rounded-full bg-red-950 border-2 border-red-400 flex items-center justify-center mx-auto absolute top-0 left-0 right-0 shadow-[0_0_25px_rgba(239,68,68,0.8)]">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <p className="text-xs text-red-400 tracking-[0.25em] uppercase font-bold">
          {t.systemWarningModal}
        </p>
        <h2 className="text-3xl font-rajdhani font-bold text-white tracking-widest mt-1">
          {t.questFailedTitle}
        </h2>

        <p className="text-xs text-red-300/90 my-2">
          {t.questFailedSubtitle}
        </p>

        {penaltyQuest && (
          <div className="my-4 p-4 rounded bg-black/60 border border-red-500/40 text-left text-xs space-y-2">
            <div className="flex items-center justify-between text-red-400 border-b border-red-500/30 pb-1.5 font-bold">
              <span>{t.assignedPenalty} {penaltyQuest.title}</span>
              <span>{penaltyQuest.timeLimit}</span>
            </div>
            <p className="text-zinc-300 text-[11px]">{penaltyQuest.subtitle}</p>

            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-zinc-500 block">{t.redisciplineRequirements}</span>
              {penaltyQuest.objectives.map((obj) => (
                <div key={obj.id} className="flex items-center justify-between text-zinc-300 text-[11px]">
                  <span>• {obj.description}</span>
                  <span className="text-red-300 font-bold">
                    {obj.target} {obj.unit}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-zinc-400 italic pt-1 border-t border-zinc-800">
              {t.systemPrincipleSafety}
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-rajdhani font-bold text-base tracking-wider rounded shadow-[0_0_15px_rgba(239,68,68,0.6)] transition-all"
        >
          {t.acceptPenaltyProceed}
        </button>
      </div>
    </div>
  );
};
