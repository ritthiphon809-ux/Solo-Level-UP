import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Zap, Shield, AlertCircle, Sparkles, RefreshCw, MessageSquare } from 'lucide-react';
import { FullPlayerData } from '../types';
import { playSystemBeep, playActionVerified } from '../utils/audio';
import { useLanguage } from '../utils/LanguageContext';

interface LineSystemChatProps {
  playerData: FullPlayerData;
  onSendMessage: (message: string) => Promise<void>;
  loading: boolean;
  onNavigateToLineBot?: () => void;
}

export const LineSystemChat: React.FC<LineSystemChatProps> = ({
  playerData,
  onSendMessage,
  loading,
  onNavigateToLineBot,
}) => {
  const { t, lang } = useLanguage();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = playerData.chatMessages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;
    const msg = inputText.trim();
    setInputText('');
    playSystemBeep(900);
    await onSendMessage(msg);
  };

  const handleQuickChip = async (text: string) => {
    if (loading) return;
    playSystemBeep(900);
    await onSendMessage(text);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="rounded-lg bg-[#060e1d] border border-cyan-500/30 p-4 font-mono-hud flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{t.lineGateway}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-rajdhani font-bold text-white tracking-wide mt-0.5">
            {t.systemTelemetryChat}
          </h2>
          <p className="text-xs text-zinc-400">
            {t.chatSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onNavigateToLineBot && (
            <button
              onClick={onNavigateToLineBot}
              className="px-3 py-1.5 rounded bg-[#06C755] hover:bg-[#05b34c] text-black font-bold text-xs flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,199,85,0.4)] transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'ตั้งค่า LINE BOT (เหมือน Khun Note)' : 'LINE BOT Settings'}</span>
            </button>
          )}
          <div className="text-right text-xs text-zinc-400 border-l border-cyan-500/20 pl-3">
            <p className="text-cyan-300 font-bold">{t.intelligenceLayer}</p>
            <p className="text-[11px]">{t.aiValidation}</p>
          </div>
        </div>
      </div>

      {/* Terminal Chat Window */}
      <div className="rounded-lg bg-[#040812] border border-cyan-500/40 shadow-2xl flex flex-col h-[520px] font-mono-hud overflow-hidden corner-bracket">
        {/* Terminal Header */}
        <div className="bg-[#081224] border-b border-cyan-500/30 px-4 py-2 flex items-center justify-between text-xs text-cyan-300">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>LINE_SYSTEM_CLIENT://{playerData.profile.name.toLowerCase()}</span>
          </div>
          <span className="text-[10px] text-zinc-400">
            {lang === 'th' ? 'สถานะ: การเชื่อมต่อระบบทำงานปกติ' : 'STATUS: AUTHORITATIVE LINK ACTIVE'}
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
          {messages.map((msg) => {
            const isSystem = msg.sender === 'SYSTEM';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSystem ? 'items-start' : 'items-end'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mb-1 px-1">
                  <span>{isSystem ? (lang === 'th' ? '[ระบบ SYSTEM]' : '[SYSTEM]') : `[PLAYER ${playerData.profile.name}]`}</span>
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded p-3 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                    isSystem
                      ? 'bg-[#08152b] border border-cyan-500/40 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                      : 'bg-cyan-950/70 border border-cyan-400/50 text-white shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                  }`}
                >
                  {msg.text}

                  {msg.actionDetected && (
                    <div className="mt-2 pt-2 border-t border-cyan-500/30 flex items-center gap-2 text-[11px] text-emerald-300">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.actionVerifiedMsg}</span>
                      {msg.expAwarded && <span className="font-bold text-cyan-300">+{msg.expAwarded} EXP</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start">
              <div className="bg-[#08152b] border border-cyan-500/40 rounded p-3 text-xs text-cyan-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>{t.analyzingTransmission}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="bg-[#060c18] border-t border-cyan-500/20 px-3 py-2 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-zinc-500 whitespace-nowrap text-[10px]">
            {lang === 'th' ? 'คำสั่งด่วน:' : 'TRANSMIT COMMAND:'}
          </span>
          {[
            lang === 'th' ? 'วันนี้ทำ push-up ไปแล้ว 30' : 'Did 30 push-ups today',
            lang === 'th' ? 'สควอทเสร็จแล้ว 80 ครั้ง' : 'Completed 80 squats',
            lang === 'th' ? 'เดินเร็วเสร็จแล้ว 30 นาที' : 'Fast walking 30 min completed',
            lang === 'th' ? 'วันนี้เหนื่อยมาก ขอ protocol ฟื้นฟู' : 'Exhausted today, request recovery protocol',
            lang === 'th' ? 'รายงานสถานะปัจจุบัน' : 'Report current status',
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={loading}
              onClick={() => handleQuickChip(chip)}
              className="px-2.5 py-1 rounded bg-black/60 hover:bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 whitespace-nowrap hover:border-cyan-400 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="bg-[#070e1c] border-t border-cyan-500/30 p-3 flex gap-2">
          <input
            id="chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            placeholder={t.chatPlaceholder}
            className="flex-1 bg-black/80 border border-cyan-500/40 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs rounded transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
          >
            <Send className="w-3.5 h-3.5" />
            {t.chatSend}
          </button>
        </form>
      </div>
    </div>
  );
};
