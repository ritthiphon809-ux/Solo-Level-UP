import React, { useState } from 'react';
import { History, Award, TrendingUp, AlertTriangle, ShieldCheck, Terminal, Calendar } from 'lucide-react';
import { FullPlayerData } from '../types';
import { playSystemBeep } from '../utils/audio';
import { useLanguage } from '../utils/LanguageContext';

interface SystemHistoryViewProps {
  playerData: FullPlayerData;
}

export const SystemHistoryView: React.FC<SystemHistoryViewProps> = ({ playerData }) => {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<'TRANSACTIONS' | 'SYSTEM_LOGS'>('TRANSACTIONS');
  const transactions = playerData.recentTransactions || [];
  const logs = playerData.systemLogs || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4 font-mono-hud">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <span>{t.systemArchive}</span>
            <span>•</span>
            <span>{t.player}: {playerData.profile.name}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-rajdhani font-bold text-white tracking-wide mt-0.5">
            {t.systemHistoryTitle}
          </h2>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 bg-[#080d18] border border-cyan-500/30 p-1 rounded text-xs">
          <button
            onClick={() => {
              playSystemBeep();
              setTab('TRANSACTIONS');
            }}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'TRANSACTIONS'
                ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.tabTransactions} ({transactions.length})
          </button>
          <button
            onClick={() => {
              playSystemBeep();
              setTab('SYSTEM_LOGS');
            }}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'SYSTEM_LOGS'
                ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.tabSystemLogs} ({logs.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === 'TRANSACTIONS' ? (
        <div className="space-y-3 font-mono-hud">
          {transactions.length > 0 ? (
            transactions.map((tx) => {
              const isPositive = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="p-4 rounded-lg bg-[#070d1a] border border-cyan-500/20 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mt-0.5">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{tx.description}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 border border-zinc-800 text-zinc-400">
                          {tx.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        <span>•</span>
                        <span>ID: {tx.id.slice(0, 14)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right self-end sm:self-center">
                    <span
                      className={`text-base font-bold ${
                        isPositive ? 'text-cyan-300 hud-glow-text' : 'text-red-400'
                      }`}
                    >
                      {isPositive ? `+${tx.amount}` : tx.amount} EXP
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      {t.balanceExp}: {tx.balanceAfter.toLocaleString()} EXP
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center rounded-lg bg-[#070b14] border border-cyan-500/20 text-zinc-500 text-sm">
              {t.noTransactions}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5 font-mono-hud">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded bg-[#040814] border border-zinc-800 text-xs flex items-start gap-3"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">[{log.action}]</span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-zinc-300 text-[11px] mt-0.5">{log.details}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center rounded-lg bg-[#070b14] border border-cyan-500/20 text-zinc-500 text-sm">
              {t.noLogs}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
