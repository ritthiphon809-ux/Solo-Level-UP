import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  Send,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Terminal,
  Unlink,
  MessageCircle,
  Bell,
  Sparkles,
} from 'lucide-react';
import { FullPlayerData, LineWebhookLog } from '../types';
import { playSystemBeep, playActionVerified, playLevelUp } from '../utils/audio';
import { useLanguage } from '../utils/LanguageContext';

interface LineIntegrationHubProps {
  playerData: FullPlayerData;
  currentUserId: string;
  onRefreshPlayerData: () => Promise<void>;
  onLevelUp?: (events: any[]) => void;
}

export const LineIntegrationHub: React.FC<LineIntegrationHubProps> = ({
  playerData,
  currentUserId,
  onRefreshPlayerData,
  onLevelUp,
}) => {
  const { t, lang } = useLanguage();

  // Pairing & Config State
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [customLineUserId, setCustomLineUserId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Simulator State
  const [simulatorInput, setSimulatorInput] = useState('');
  const [simulatorMessages, setSimulatorMessages] = useState<
    Array<{
      id: string;
      sender: 'user' | 'bot';
      text: string;
      time: string;
      exp?: number;
      isLevelUp?: boolean;
    }>
  >([
    {
      id: 'init_1',
      sender: 'bot',
      text: `【THE SYSTEM - LINE BOT ONLINE】\nยินดีต้อนรับสู่ระบบ SOLO LEVEL UP\nคุณสามารถรายงานการออกกำลังกาย หรือพิมพ์ "เควสต์" / "สเตตัส" ได้ตลอดเวลา`,
      time: '09:00',
    },
  ]);
  const [simLoading, setSimLoading] = useState(false);

  // Webhook Logs State
  const [webhookLogs, setWebhookLogs] = useState<LineWebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const pairingCode = playerData.lineInfo?.pairingCode || `SOLO-${playerData.profile.name.toUpperCase()}-7492`;
  const isLinked = playerData.lineInfo?.linked || !!playerData.profile.lineUserId;
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/line/webhook` : '/api/line/webhook';

  // Fetch webhook logs
  const fetchWebhookLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await fetch('/api/line/webhook-logs');
      if (res.ok) {
        const json = await res.json();
        setWebhookLogs(json.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch webhook logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhookLogs();
  }, []);

  const handleCopy = (text: string, type: 'code' | 'webhook') => {
    navigator.clipboard.writeText(text);
    playSystemBeep(850);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  // Quick link simulation
  const handleSimulatePair = async () => {
    try {
      setActionLoading(true);
      playSystemBeep(900);
      const res = await fetch('/api/line/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          lineUserId: `LINE_ID_${playerData.profile.name.toUpperCase()}_${Math.floor(1000 + Math.random() * 9000)}`,
          displayName: `${playerData.profile.name} (LINE)`,
        }),
      });

      if (!res.ok) throw new Error('Pairing failed');
      await onRefreshPlayerData();
      setActionMessage({ text: 'เชื่อมต่อบัญชี LINE จำลองเรียบร้อย!', type: 'success' });
      setTimeout(() => setActionMessage(null), 4000);
      playActionVerified();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Unlink account
  const handleUnlink = async () => {
    try {
      setActionLoading(true);
      playSystemBeep(600);
      const res = await fetch(`/api/line/unlink/${currentUserId}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Unlink failed');
      await onRefreshPlayerData();
      setActionMessage({ text: 'ปลดการเชื่อมต่อบัญชี LINE เรียบร้อย', type: 'success' });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage({ text: err.message || 'เกิดข้อผิดพลาด', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Test Push Notification
  const handleTestPush = async () => {
    try {
      setActionLoading(true);
      playSystemBeep(950);
      const res = await fetch(`/api/line/test-push/${currentUserId}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Push failed');

      setActionMessage({
        text: json.sentToLineApi
          ? 'ส่งข้อความแจ้งเตือนเข้า LINE ของคุณสำเร็จ!'
          : 'ส่งการแจ้งเตือนสำเร็จ (ทดสอบในโหมด Simulation)',
        type: 'success',
      });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage({ text: err.message || 'ส่งข้อความล้มเหลว', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Send message in the interactive LINE simulator
  const handleSendSimulatorMessage = async (textToSend?: string) => {
    const text = (textToSend || simulatorInput).trim();
    if (!text || simLoading) return;

    setSimulatorInput('');
    playSystemBeep(900);

    const newMsg = {
      id: `sim_u_${Date.now()}`,
      sender: 'user' as const,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setSimulatorMessages((prev) => [...prev, newMsg]);
    setSimLoading(true);

    try {
      const res = await fetch('/api/line/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          message: text,
          displayName: playerData.profile.name,
        }),
      });

      if (!res.ok) throw new Error('Simulation failed');
      const json = await res.json();

      const botMsg = {
        id: `sim_b_${Date.now()}`,
        sender: 'bot' as const,
        text: json.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        exp: json.expAwarded,
        isLevelUp: json.levelUps && json.levelUps.length > 0,
      };

      setSimulatorMessages((prev) => [...prev, botMsg]);

      // Audio feedback
      if (json.levelUps && json.levelUps.length > 0) {
        playLevelUp();
        if (onLevelUp) onLevelUp(json.levelUps);
      } else if (json.expAwarded > 0) {
        playActionVerified();
      }

      await onRefreshPlayerData();
      fetchWebhookLogs();
    } catch (err) {
      console.error('Simulator error:', err);
      setSimulatorMessages((prev) => [
        ...prev,
        {
          id: `sim_err_${Date.now()}`,
          sender: 'bot',
          text: '[SYSTEM ERROR] การเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSimLoading(false);
    }
  };

  const quickPrompts = [
    { label: 'วิดพื้น 30 ครั้ง', icon: '⚡' },
    { label: 'สควอท 50', icon: '🏋️' },
    { label: 'วิ่ง 5 กม.', icon: '🏃' },
    { label: 'ดื่มน้ำ 500 ml', icon: '💧' },
    { label: 'เควสต์', icon: '📜' },
    { label: 'สเตตัส', icon: '👤' },
    { label: 'เหนื่อยมาก ขอพัก', icon: '😴' },
    { label: 'วิธีใช้', icon: '💡' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="relative rounded-lg bg-gradient-to-r from-[#06152b] via-[#051c1e] to-[#062419] border border-cyan-500/30 p-5 shadow-2xl overflow-hidden font-mono-hud">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#06C755]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#06C755] text-black flex items-center gap-1 shadow-[0_0_10px_rgba(6,199,85,0.4)]">
                <MessageCircle className="w-3 h-3" />
                LINE MESSAGING API
              </span>
              <span className="text-xs text-cyan-400">
                {lang === 'th' ? 'ทำงานอัตโนมัติเช่นเดียวกับ khunnote.com' : 'Khun Note Style Bot Integration'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-rajdhani font-black text-white tracking-wide">
              {lang === 'th' ? 'ระบบเชื่อมต่อ LINE BOT // SOLO LEVEL UP' : 'LINE BOT SYSTEM INTEGRATION'}
            </h1>
            <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
              {lang === 'th'
                ? 'คุยกับบอทใน LINE ได้เหมือนแอปจดโน้ต Khun Note! เพียงส่งข้อความ "วิดพื้น 30", "วิ่ง 5 กม." หรือ "เควสต์" ระบบจะวิเคราะห์และอัปเดตเลเวลให้อัตโนมัติทันที'
                : 'Interact via LINE Messaging API directly. Log physical activities, check real-time quests, and receive leveling telemetry directly in LINE.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchWebhookLogs()}
              disabled={logsLoading}
              className="px-3 py-1.5 rounded border border-cyan-500/30 bg-[#071324] hover:bg-[#0c1f38] text-xs text-cyan-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
              <span>{lang === 'th' ? 'รีเฟรชข้อมูล' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {actionMessage && (
          <div
            className={`mt-3 p-2.5 rounded text-xs flex items-center gap-2 border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Left Column (Connection & Instructions) + Right Column (LINE Phone Simulator) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 7 Cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Player Pairing Status & Code */}
          <div className="rounded-lg bg-[#060e1d] border border-cyan-500/30 p-5 font-mono-hud shadow-lg">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white tracking-wider">
                  {lang === 'th' ? '1. รหัสเชื่อมต่อผู้เล่น (PLAYER PAIRING CODE)' : '1. PLAYER PAIRING CODE'}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isLinked ? 'bg-[#06C755] animate-pulse' : 'bg-amber-400'}`} />
                <span className={`text-[11px] font-bold ${isLinked ? 'text-[#06C755]' : 'text-amber-400'}`}>
                  {isLinked
                    ? lang === 'th'
                      ? 'เชื่อมต่อกับ LINE แล้ว'
                      : 'LINKED TO LINE'
                    : lang === 'th'
                    ? 'ยังไม่ได้เชื่อมต่อ'
                    : 'UNLINKED'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-zinc-300 leading-relaxed">
                {lang === 'th'
                  ? 'ส่งรหัสนี้ในแชท LINE เพื่อผูกบัญชีตัวละครของคุณเข้ากับระบบ Solo Level Up (ส่งครั้งเดียว ผูกถาวร):'
                  : 'Send this code in LINE chat to link your character to the System:'}
              </p>

              {/* Big Pairing Code Display */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#040813] border border-cyan-500/40 rounded-lg p-3">
                <div className="flex-1 text-center sm:text-left">
                  <div className="text-[10px] text-zinc-400">COMMAND TO SEND IN LINE</div>
                  <div className="text-xl sm:text-2xl font-black text-cyan-300 tracking-wider font-mono selection:bg-cyan-400 selection:text-black">
                    LINK {pairingCode}
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(`LINK ${pairingCode}`, 'code')}
                  className="w-full sm:w-auto px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? (lang === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : lang === 'th' ? 'คัดลอกคำสั่ง' : 'Copy'}</span>
                </button>
              </div>

              {/* Connection Status Details */}
              {isLinked ? (
                <div className="rounded bg-[#081827] border border-emerald-500/30 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {lang === 'th' ? 'ข้อมูลการเชื่อมโยงวิญญาณ LINE' : 'Line Telemetry Link Active'}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {playerData.profile.lineLinkedAt
                        ? new Date(playerData.profile.lineLinkedAt).toLocaleDateString()
                        : 'ACTIVE'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 border-t border-emerald-500/20 pt-2">
                    <div>
                      <span className="text-zinc-500">LINE User: </span>
                      <span className="text-white font-mono">{playerData.profile.lineDisplayName || 'Protagonist'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">ID: </span>
                      <span className="text-cyan-300 font-mono text-[10px]">
                        {playerData.profile.lineUserId?.slice(0, 14)}...
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleTestPush}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'ทดสอบส่งข้อความเข้า LINE' : 'Test Push'}</span>
                    </button>
                    <button
                      onClick={handleUnlink}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'ยกเลิกการเชื่อมต่อ' : 'Unlink'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded bg-[#071324] border border-cyan-500/20 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>{lang === 'th' ? 'ยังไม่ได้เชื่อมต่อจริงกับ LINE?' : 'Testing without external LINE setup?'}</span>
                    <button
                      onClick={handleSimulatePair}
                      disabled={actionLoading}
                      className="px-3 py-1 rounded bg-[#06C755] hover:bg-[#05b34c] text-black font-bold text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{lang === 'th' ? 'จำลองการเชื่อมต่อทันที' : 'Simulate Link Now'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {lang === 'th'
                      ? 'คุณสามารถใช้ "จำลองการคุย LINE" ด้านขวาได้ทันที หรือกดปุ่มข้างต้นเพื่อทดสอบสถานะการเชื่อมต่อ'
                      : 'You can test the LINE messaging protocol directly in the simulator on the right.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: LINE Developers Webhook Configuration (สำหรับต่อ LINE OA) */}
          <div className="rounded-lg bg-[#060e1d] border border-cyan-500/30 p-5 font-mono-hud shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#06C755]" />
                <h2 className="text-sm font-bold text-white tracking-wider">
                  {lang === 'th' ? '2. การตั้งค่า LINE WEBHOOK (สำหรับผู้ดูแลระบบ / แอดมิน)' : '2. LINE WEBHOOK CONFIGURATION'}
                </h2>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                HTTP 200 READY
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {lang === 'th'
                ? 'นำ Webhook URL นี้ไปใส่ใน LINE Developers Console ของ LINE Official Account เพื่อให้ระบบรับและตอบข้อความได้แบบเรียลไทม์:'
                : 'Register this Webhook URL in your LINE Developers Console under Messaging API:'}
            </p>

            <div className="flex items-center gap-2 bg-[#040813] border border-zinc-700/60 rounded p-2.5">
              <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/30">
                POST
              </span>
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-transparent text-xs text-cyan-200 font-mono focus:outline-none select-all"
              />
              <button
                onClick={() => handleCopy(webhookUrl, 'webhook')}
                className="px-2.5 py-1 rounded bg-[#081b33] hover:bg-[#0e2a4f] text-cyan-300 border border-cyan-500/30 text-xs flex items-center gap-1 transition-colors"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhook ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>

            {/* 4 Steps Setup Guide */}
            <div className="rounded bg-[#040b17] border border-cyan-500/20 p-3 space-y-2 text-xs">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ขั้นตอนการเชื่อมต่อ LINE Official Account (4 ขั้นตอนง่ายๆ):' : '4-Step Setup Guide:'}</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-zinc-300 text-[11px] leading-relaxed pl-1">
                <li>
                  <span className="text-white font-semibold">เข้าสู่ LINE Developers:</span> เปิด{' '}
                  <a
                    href="https://developers.line.biz/console/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    developers.line.biz <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  แล้วเลือกหรือสร้าง Messaging API Channel
                </li>
                <li>
                  <span className="text-white font-semibold">ใส่ Webhook URL:</span> นำ URL ด้านบนไปวางในช่อง Webhook URL ในแท็บ Messaging API
                </li>
                <li>
                  <span className="text-white font-semibold">เปิดการใช้งาน Webhook:</span> สับสวิตช์{' '}
                  <span className="text-[#06C755] font-bold">"Use Webhook"</span> ให้เป็นสีเขียว
                </li>
                <li>
                  <span className="text-white font-semibold">ปิดข้อความตอบกลับอัตโนมัติ:</span> ใน LINE Official Account Manager ปิด Auto-reply messages เพื่อให้ Solo Level Up ตอบอย่างเดียว
                </li>
              </ol>
            </div>
          </div>

          {/* Card 3: Live Webhook Diagnostics Log */}
          <div className="rounded-lg bg-[#060e1d] border border-cyan-500/30 p-5 font-mono-hud shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white tracking-wider">
                  {lang === 'th' ? '3. บันทึกสัญญาณ WEBHOOK (LIVE DIAGNOSTICS)' : '3. WEBHOOK EVENT LOG'}
                </h2>
              </div>
              <span className="text-[10px] text-zinc-400">
                {webhookLogs.length} {lang === 'th' ? 'รายการ' : 'events'}
              </span>
            </div>

            {webhookLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                {lang === 'th'
                  ? 'ยังไม่มีประวัติสัญญาณ Webhook (ลองพิมพ์ข้อความในเครื่องจำลอง LINE ด้านขวาเพื่อทดสอบ)'
                  : 'No webhook events recorded yet.'}
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {webhookLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded bg-[#040813] border border-cyan-500/20 text-[11px] font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[#06C755] font-bold">[{log.eventType}]</span>
                      <span className="text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {log.text && (
                      <div className="text-zinc-200">
                        <span className="text-cyan-400">USER:</span> {log.text}
                      </div>
                    )}
                    {log.replyText && (
                      <div className="text-zinc-400 truncate">
                        <span className="text-emerald-400">REPLY:</span> {log.replyText.split('\n')[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 5 Cols (Interactive LINE Smartphone Simulator) */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl bg-[#000000] border-2 border-zinc-700 shadow-2xl p-2.5 font-sans">
            {/* Phone Screen Outer */}
            <div className="rounded-xl bg-[#0b141a] overflow-hidden flex flex-col h-[650px] border border-zinc-800">
              {/* LINE Header */}
              <div className="bg-[#06C755] text-black px-4 py-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-black text-cyan-300 font-bold flex items-center justify-center text-xs border border-black font-mono-hud shadow">
                    SL
                  </div>
                  <div>
                    <div className="font-bold text-sm leading-tight flex items-center gap-1 text-black font-mono-hud">
                      SOLO LEVEL UP BOT
                      <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                    </div>
                    <div className="text-[10px] text-zinc-900 font-medium font-mono-hud">
                      Official System Gateway • Online
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] bg-black/20 text-black px-2 py-0.5 rounded font-mono font-bold">
                    LV. {playerData.level.currentLevel}
                  </span>
                </div>
              </div>

              {/* Sub-bar: Player Indicator */}
              <div className="bg-[#072416] px-3 py-1 text-[10px] text-emerald-300 flex items-center justify-between border-b border-emerald-500/20 font-mono-hud">
                <span>👤 {playerData.profile.name} (RANK {playerData.level.rank})</span>
                <span>EXP: {playerData.level.currentExp} / {playerData.level.nextLevelExp}</span>
              </div>

              {/* Chat Message Scroll Area */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0a121e]">
                {simulatorMessages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md whitespace-pre-wrap leading-relaxed ${
                          isUser
                            ? 'bg-[#06C755] text-black font-medium rounded-tr-none'
                            : 'bg-[#132238] border border-cyan-500/30 text-cyan-100 font-mono-hud rounded-tl-none'
                        }`}
                      >
                        {m.text}

                        {m.exp && m.exp > 0 && (
                          <div className="mt-1.5 pt-1 border-t border-cyan-500/30 text-[11px] text-amber-300 font-bold flex items-center gap-1">
                            <span>★ +{m.exp} EXP ได้รับแล้ว</span>
                          </div>
                        )}

                        {m.isLevelUp && (
                          <div className="mt-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-[10px]">
                            🔥🔥 LEVEL UP ACQUIRED!
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1 px-1">{m.time}</span>
                    </div>
                  );
                })}

                {simLoading && (
                  <div className="flex items-start">
                    <div className="rounded-2xl rounded-tl-none bg-[#132238] border border-cyan-500/30 px-3 py-2 text-xs text-cyan-300 flex items-center gap-1.5 font-mono-hud">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[10px] text-zinc-400 ml-1">SYSTEM ANALYZING...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Suggestion Chips */}
              <div className="p-2 bg-[#081424] border-t border-zinc-800 overflow-x-auto flex items-center gap-1.5 scrollbar-none font-mono-hud">
                {quickPrompts.map((q, idx) => (
                  <button
                    key={idx}
                    disabled={simLoading}
                    onClick={() => handleSendSimulatorMessage(q.label)}
                    className="shrink-0 px-2 py-1 rounded-full bg-[#0c2038] hover:bg-[#133054] border border-cyan-500/30 text-[10px] text-cyan-200 flex items-center gap-1 transition-colors"
                  >
                    <span>{q.icon}</span>
                    <span>{q.label}</span>
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendSimulatorMessage();
                }}
                className="p-2 bg-[#050c17] border-t border-zinc-800 flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={simulatorInput}
                  onChange={(e) => setSimulatorInput(e.target.value)}
                  placeholder={lang === 'th' ? 'พิมพ์รายงาน เช่น "วิดพื้น 30 ครั้ง"' : 'Type message e.g. "push-ups 30"'}
                  className="flex-1 bg-[#0e1c2e] text-white text-xs rounded-full px-3.5 py-2 border border-zinc-700/70 focus:outline-none focus:border-[#06C755]"
                />
                <button
                  type="submit"
                  disabled={!simulatorInput.trim() || simLoading}
                  className="w-8 h-8 rounded-full bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-40 text-black flex items-center justify-center transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
