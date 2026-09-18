import crypto from 'crypto';
import { db } from './db.js';
import { parsePlayerMessageWithAI } from './gemini.js';
import { FullPlayerData, Quest } from '../src/types.js';

export interface LineWebhookEvent {
  type: string;
  mode?: string;
  timestamp: number;
  source: {
    type: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  webhookEventId?: string;
  deliveryContext?: {
    isRedelivery: boolean;
  };
  replyToken?: string;
  message?: {
    id: string;
    type: string;
    text?: string;
    quoteToken?: string;
  };
}

export interface LineWebhookPayload {
  destination?: string;
  events: LineWebhookEvent[];
}

/**
 * Verifies LINE Webhook HMAC-SHA256 signature
 */
export function verifyLineSignature(rawBody: string | Buffer, signature: string | undefined): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  // If secret not configured yet, allow for testing/demo
  if (!channelSecret) {
    return true;
  }
  if (!signature) {
    return false;
  }

  try {
    const hash = crypto
      .createHmac('SHA256', channelSecret)
      .update(rawBody)
      .digest('base64');
    return hash === signature;
  } catch (err) {
    console.error('[LINE] Signature verification error:', err);
    return false;
  }
}

/**
 * Sends reply message back to LINE Messaging API
 */
export async function replyToLine(replyToken: string, messages: { type: 'text'; text: string }[]): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.log('[LINE] Skipping real HTTP reply - LINE_CHANNEL_ACCESS_TOKEN not set.');
    return false;
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[LINE] Error sending reply to LINE API:', res.status, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[LINE] Network error replying to LINE:', err);
    return false;
  }
}

/**
 * Sends push notification directly to a player's LINE account
 */
export async function pushToLine(lineUserId: string, text: string): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !lineUserId) {
    return false;
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text }],
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[LINE] Push message failed:', err);
    return false;
  }
}

/**
 * Helper to build visual progress bar e.g. [■■■■■□□□□□] 50%
 */
function makeProgressBar(current: number, target: number, length = 10): string {
  if (target <= 0) return '[■■■■■■■■■■] 100%';
  const ratio = Math.min(Math.max(current / target, 0), 1);
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  const pct = Math.round(ratio * 100);
  return `[${'■'.repeat(filled)}${'□'.repeat(empty)}] ${pct}%`;
}

/**
 * Formats full player status card in System theme for LINE
 */
export function formatPlayerStatusMessage(data: FullPlayerData): string {
  const { profile, level, stats } = data;
  const expPct = Math.round((level.currentExp / (level.nextLevelExp || 1)) * 100);
  const expBar = makeProgressBar(level.currentExp, level.nextLevelExp, 8);

  return `【THE SYSTEM - PLAYER STATUS】
━━━━━━━━━━━━━━━━━━
👤 ผู้เล่น: ${profile.name}
🎖️ เลเวล: LV. ${level.currentLevel} [RANK ${level.rank}]
🏷️ ฉายา: ${profile.title}
🔥 สตรีค: ${profile.currentStreak} วันต่อเนื่อง (สูงสุด ${profile.bestStreak} วัน)

[ค่าสถานะชีวมิติ / ATTRIBUTES]
• STR (พละกำลัง): ${stats.str}
• AGI (ความว่องไว): ${stats.agi}
• VIT (พลังชีวิต): ${stats.vit}
• END (ความอึด): ${stats.end}
• DISC (วินัย): ${stats.disc}
${stats.unallocatedPoints > 0 ? `✨ แต้มสเตตัสคงเหลือ: +${stats.unallocatedPoints} แต้ม` : ''}

[EXP TELEMETRY]
${expBar}
${level.currentExp.toLocaleString()} / ${level.nextLevelExp.toLocaleString()} EXP (${expPct}%)

━━━━━━━━━━━━━━━━━━
💡 พิมพ์ "เควสต์" เพื่อดูภารกิจปัจจุบัน
💡 พิมพ์รายงานผล เช่น "วิดพื้น 30 ครั้ง"`;
}

/**
 * Formats active quest objectives list for LINE
 */
export function formatQuestsMessage(data: FullPlayerData): string {
  const active = data.activeQuests.filter((q) => q.status === 'INCOMPLETE');
  if (active.length === 0) {
    return `【THE SYSTEM - ภารกิจทั้งหมด】
━━━━━━━━━━━━━━━━━━
🎉 ยอดเยี่ยม! ภารกิจทั้งหมดในขณะนี้เสร็จสมบูรณ์แล้ว
คุณได้ทำตามข้อกำหนดของระบบเรียบร้อย

💡 พิมพ์ "สเตตัส" เพื่อตรวจเช็คค่าสถานะ
💡 พิมพ์ "ขอภารกิจ" หากต้องการโปรโตคอลเสริม`;
  }

  let text = `【THE SYSTEM - ภารกิจที่ต้องทำ】\n━━━━━━━━━━━━━━━━━━\n`;

  active.forEach((q, idx) => {
    const typeLabel =
      q.type === 'DAILY'
        ? '📅 DAILY QUEST'
        : q.type === 'EMERGENCY'
        ? '⚠️ EMERGENCY QUEST'
        : q.type === 'DISCIPLINE'
        ? '🧠 DISCIPLINE QUEST'
        : q.type === 'PENALTY'
        ? '🚨 PENALTY PROTOCOL'
        : '⚔️ SYSTEM QUEST';

    text += `\n${typeLabel}\n▶ ${q.title}\n`;
    q.objectives.forEach((obj) => {
      const isDone = obj.completed || obj.current >= obj.target;
      const statusIcon = isDone ? '✅' : '⏳';
      const pBar = makeProgressBar(obj.current, obj.target, 6);
      text += `  ${statusIcon} ${obj.description}: ${obj.current}/${obj.target} ${obj.unit} ${pBar}\n`;
    });
    text += `  ⭐ รางวัล: +${q.expReward} EXP\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━
💡 วิธีอัปเดต: พิมพ์สิ่งที่ทำลงในแชทนี้ได้ทันที เช่น:
- "วิดพื้น 30 ครั้ง"
- "สควอท 50"
- "วิ่ง 5 กม."
- "อ่านหนังสือ 20 หน้า"`;

  return text;
}

/**
 * Core processor for a message received from LINE
 */
export async function processLineIncomingMessage(
  lineUserId: string,
  userMessageText: string,
  displayName?: string
): Promise<{
  replyText: string;
  status: 'SUCCESS' | 'UNLINKED_PROMPT' | 'ACTION_VERIFIED' | 'QUEST_COMPLETE' | 'ERROR';
  expAwarded?: number;
  levelUps?: any[];
  playerBundle?: FullPlayerData;
}> {
  const cleanMsg = userMessageText.trim();
  const lowerMsg = cleanMsg.toLowerCase();

  // 1. Check if user is linked to an existing player
  let userId = db.getUserIdByLineUserId(lineUserId);

  // If not linked yet, check for link/register commands
  if (!userId) {
    // Check for "LINK <CODE>" or "เชื่อมต่อ <รหัส>"
    const linkMatch = cleanMsg.match(/^(?:LINK|เชื่อมต่อ|PAIR)[\s:-]+([A-Za-z0-9_-]+)/i);
    if (linkMatch) {
      const code = linkMatch[1];
      const linkRes = db.bindByPairingCode(code, lineUserId, displayName);
      if (linkRes.success && linkRes.playerBundle) {
        const p = linkRes.playerBundle;
        const reply = `【SYSTEM - SYNCHRONIZATION ESTABLISHED】
━━━━━━━━━━━━━━━━━━━━━━━━
ยินดีต้อนรับผู้เล่น [ ${p.profile.name} ]
การเชื่อมต่อสัญญาณวิญญาณกับ LINE สำเร็จเรียบร้อย!

🎖️ เลเวล: LV. ${p.level.currentLevel} (${p.level.rank}-RANK)
⚡ พร้อมรับส่งข้อมูลภารกิจและการยกระดับตนเองแล้ว

คำสั่งเริ่มต้น:
• พิมพ์ "เควสต์" เพื่อดูภารกิจวันนี้
• พิมพ์ "สเตตัส" เพื่อดูค่าพลังชีวมิติ
• พิมพ์สิ่งที่คุณทำ เช่น "วิดพื้น 30 ครั้ง", "วิ่ง 5 กม."`;
        return {
          replyText: reply,
          status: 'SUCCESS',
          playerBundle: p,
        };
      } else {
        return {
          replyText: `【SYSTEM WARNING】
ไม่พบรหัสเชื่อมต่อ [ ${code} ] ในฐานข้อมูลระบบ
กรุณาตรวจสอบรหัสในหน้าเว็บแอป (แท็บ "เชื่อมต่อ LINE") แล้วลองใหม่อีกครั้ง`,
          status: 'UNLINKED_PROMPT',
        };
      }
    }

    // Check for "สมัคร <ชื่อ>" or "REGISTER <NAME>"
    const regMatch = cleanMsg.match(/^(?:สมัคร|สร้างตัวละคร|REGISTER|NEW)[\s:]+(.+)$/i);
    if (regMatch) {
      const newName = regMatch[1].trim();
      const newPlayer = db.createPlayer({
        name: newName,
        age: 25,
        height: 175,
        weight: 70,
        activityLevel: 'MODERATE',
        goal: 'Complete Self Transformation',
        availableTime: '45 min/day',
      });
      db.bindLineUser(newPlayer.user.id, lineUserId, displayName);
      const updated = db.getFullPlayerData(newPlayer.user.id)!;

      const reply = `【SYSTEM - AWAKENING INITIATED】
━━━━━━━━━━━━━━━━━━━━━━━━
ยินดีต้อนรับสู่ระบบ SOLO LEVEL UP
ผู้เล่นใหม่: [ ${updated.profile.name} ]
สถานะ: ตื่นรู้แล้ว (AWAKENED)
เลเวล: LV. 1 [RANK E]
ภารกิจแรกของคุณถูกจัดสรรเรียบร้อยแล้ว!

พิมพ์ "เควสต์" เพื่อเริ่มต้นเส้นทางสู่ราชันเงา`;

      return {
        replyText: reply,
        status: 'SUCCESS',
        playerBundle: updated,
      };
    }

    // Not linked and not linking command -> provide clear guide
    const promptReply = `【THE SYSTEM - SOLO LEVEL UP】
━━━━━━━━━━━━━━━━━━━━━━━━
ตรวจพบสัญญาณใหม่ที่ยังไม่ได้เชื่อมโยงกับผู้เล่น

คุณสามารถเชื่อมต่อกับโปรไฟล์ในเว็บแอปได้ทันที:
1. เปิดเว็บแอปของคุณ แล้วคลิกแท็บ "เชื่อมต่อ LINE"
2. คัดลอกรหัสเชื่อมต่อ เช่น "LINK SOLO-OHM-7492" แล้วนำมาส่งในแชทนี้

หรือพิมพ์สร้างตัวละครใหม่ทันที:
👉 สมัคร <ชื่อของคุณ>
(ตัวอย่างเช่น: สมัคร SUNG JINWOO)`;

    return {
      replyText: promptReply,
      status: 'UNLINKED_PROMPT',
    };
  }

  // 2. User is already linked - fetch full data
  const playerData = db.getFullPlayerData(userId);
  if (!playerData) {
    return {
      replyText: `[SYSTEM ERROR]\nไม่พบข้อมูลของผู้เล่น กรุณาพิมพ์เชื่อมต่อใหม่อีกครั้ง`,
      status: 'ERROR',
    };
  }

  // Record user message in DB
  db.addChatMessage(userId, 'PLAYER', `[LINE] ${cleanMsg}`);

  // 3. Process built-in commands
  if (['สเตตัส', 'status', 'stat', 'profile', 'ข้อมูล'].includes(lowerMsg)) {
    const text = formatPlayerStatusMessage(playerData);
    db.addChatMessage(userId, 'SYSTEM', text);
    return { replyText: text, status: 'SUCCESS', playerBundle: playerData };
  }

  if (['เควสต์', 'quest', 'quests', 'ภารกิจ', 'งาน'].includes(lowerMsg)) {
    const text = formatQuestsMessage(playerData);
    db.addChatMessage(userId, 'SYSTEM', text);
    return { replyText: text, status: 'SUCCESS', playerBundle: playerData };
  }

  if (['วิธีใช้', 'คำสั่ง', 'help', 'menu', 'เมนู'].includes(lowerMsg)) {
    const text = `【THE SYSTEM - รายการคำสั่ง】
━━━━━━━━━━━━━━━━━━
📱 คำสั่งด่วน:
• "สเตตัส" - ดูเลเวล, แรงค์, สเตตัส 5 ด้าน, EXP
• "เควสต์" - ดูภารกิจประจำวันและความคืบหน้า
• "ขอภารกิจ" - ขอภารกิจเสริมใหม่จากระบบ
• "เหนื่อยมาก" - ขอพักฟื้น (Recovery Protocol)
• "ยกเลิกเชื่อมต่อ" - ปลดการเชื่อมต่อ LINE กับตัวละครนี้

💪 บันทึกการกระทำ (พิมพ์ได้เป็นภาษาธรรมชาติ):
• "วิดพื้น 30 ครั้ง"
• "สควอท 50"
• "วิ่ง 5 กม." / "เดิน 20 นาที"
• "ดื่มน้ำ 500 ml"
• "อ่านหนังสือ 15 หน้า"

ระบบจะตรวจสอบความสอดคล้องกับภารกิจอัตโนมัติ พร้อมมอบค่า EXP และอัปเลเวลทันที!`;
    db.addChatMessage(userId, 'SYSTEM', text);
    return { replyText: text, status: 'SUCCESS', playerBundle: playerData };
  }

  if (['ยกเลิกเชื่อมต่อ', 'unlink', 'disconnect'].includes(lowerMsg)) {
    db.unbindLineUser(userId);
    const text = `【SYSTEM】\nปลดการเชื่อมต่อบัญชี LINE กับผู้เล่น ${playerData.profile.name} เรียบร้อยแล้ว\nหากต้องการเชื่อมต่อใหม่ สามารถส่งรหัส LINK ได้ทุกเมื่อ`;
    return { replyText: text, status: 'SUCCESS' };
  }

  if (['ขอภารกิจ', 'request quest', 'new quest'].includes(lowerMsg)) {
    const newQ = db.requestNewQuest(userId, 'PHYSICAL');
    const updated = db.getFullPlayerData(userId)!;
    const text = `【SYSTEM - ภารกิจใหม่ถูกจัดสรร】\n\n▶ ${newQ.title}\n${newQ.subtitle}\n• รางวัล: +${newQ.expReward} EXP\n\nพิมพ์ "เควสต์" เพื่อดูรายละเอียดทั้งหมด`;
    db.addChatMessage(userId, 'SYSTEM', text);
    return { replyText: text, status: 'SUCCESS', playerBundle: updated };
  }

  // 4. Natural language processing via Gemini AI / Rule Engine
  const parsedAction = await parsePlayerMessageWithAI(
    cleanMsg,
    playerData.profile.name,
    playerData.level.currentLevel,
    playerData.level.rank,
    playerData.activeQuests
  );

  let actionVerified = false;
  let matchedObjectiveDesc = '';
  let awardedExp = 0;
  let levelUps: any[] = [];
  let questFinishedTitle = '';

  if (parsedAction.actionDetected && parsedAction.exerciseOrActivity) {
    const actName = parsedAction.exerciseOrActivity.toLowerCase();
    const amt = parsedAction.countOrAmount || 1;

    // Search active quests for matching objective
    const activeQuests = playerData.activeQuests.filter((q) => q.status === 'INCOMPLETE');
    let updatedObj = false;

    for (const quest of activeQuests) {
      for (const obj of quest.objectives) {
        const objDesc = obj.description.toLowerCase();
        if (
          (actName.includes('push') && objDesc.includes('push')) ||
          (actName.includes('squat') && objDesc.includes('squat')) ||
          (actName.includes('walk') && (objDesc.includes('walk') || objDesc.includes('cardio') || objDesc.includes('stride'))) ||
          (actName.includes('run') && (objDesc.includes('run') || objDesc.includes('cardio'))) ||
          (actName.includes('water') && objDesc.includes('hydration')) ||
          (actName.includes('read') && (objDesc.includes('read') || objDesc.includes('knowledge') || objDesc.includes('book'))) ||
          (actName.includes('focus') && (objDesc.includes('focus') || objDesc.includes('work')))
        ) {
          const resObj = db.updateQuestObjective(userId, quest.id, obj.id, amt);
          actionVerified = true;
          const currObj = resObj.quest?.objectives.find((o) => o.id === obj.id);
          matchedObjectiveDesc = `${obj.description}: ${currObj?.current || 0} / ${obj.target} ${obj.unit}`;
          if (resObj.completedNow) {
            questFinishedTitle = quest.title;
          }
          if (resObj.expAwarded > 0) {
            awardedExp = resObj.expAwarded;
            levelUps = resObj.levelUps;
          }
          updatedObj = true;
          break;
        }
      }
      if (updatedObj) break;
    }

    // If no quest matched, still reward effort EXP
    if (!updatedObj) {
      const expRes = db.awardExp(
        userId,
        30,
        'LINE_ACTION_LOGGED',
        `LINE Activity: ${parsedAction.exerciseOrActivity} x ${amt}`
      );
      actionVerified = true;
      awardedExp = 30;
      levelUps = expRes.levelUpEvents;
      matchedObjectiveDesc = `${parsedAction.exerciseOrActivity}: +${amt} ${parsedAction.unit || 'units'} บันทึกสำเร็จ`;
    }
  }

  // Fatigue handling
  if (parsedAction.isFatiguedOrSeekingRecovery) {
    const hasRecovery = playerData.activeQuests.some((q) => q.type === 'RECOVERY' && q.status === 'INCOMPLETE');
    if (!hasRecovery) {
      db.requestNewQuest(userId, 'RECOVERY');
    }
  }

  // 5. Construct authoritative reply
  const updatedData = db.getFullPlayerData(userId)!;
  let replyText = '';

  if (actionVerified) {
    let lines = [
      `【THE SYSTEM - ปฏิบัติการสำเร็จ】`,
      `━━━━━━━━━━━━━━━━━━`,
      `✓ บันทึก: ${matchedObjectiveDesc}`,
    ];

    if (questFinishedTitle) {
      lines.push(`\n🏆 ภารกิจเสร็จสิ้น: ${questFinishedTitle}!`);
    }

    if (awardedExp > 0) {
      lines.push(`★ ได้รับ: +${awardedExp} EXP`);
      lines.push(`[EXP รวม: ${updatedData.level.currentExp} / ${updatedData.level.nextLevelExp}]`);
    }

    if (levelUps && levelUps.length > 0) {
      const latestLvl = levelUps[levelUps.length - 1];
      lines.push(
        `\n🔥🔥🔥【LEVEL UP!】\nคุณเลื่อนระดับเป็น LEVEL ${latestLvl.newLevel}!\n+${latestLvl.pointsGranted} แต้มสเตตัสคงเหลือ`
      );
      if (latestLvl.rankChanged) {
        lines.push(`🌟 เลื่อนขั้นแรงค์: RANK ${latestLvl.rankChanged.newRank}!`);
      }
    }

    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`"ความพยายามของคุณถูกบันทึกลงในแก่นวิญญาณแล้ว ผู้เล่น ${updatedData.profile.name}"`);

    replyText = lines.join('\n');
  } else {
    // If no action was recognized, reply with authoritative AI feedback
    replyText = `【THE SYSTEM】\n${parsedAction.systemResponseText}\n\n💡 พิมพ์ "เควสต์" หรือระบุจำนวน เช่น "วิดพื้น 20 ครั้ง"`;
  }

  db.addChatMessage(userId, 'SYSTEM', replyText);

  return {
    replyText,
    status: actionVerified ? 'ACTION_VERIFIED' : 'SUCCESS',
    expAwarded: awardedExp,
    levelUps,
    playerBundle: updatedData,
  };
}
