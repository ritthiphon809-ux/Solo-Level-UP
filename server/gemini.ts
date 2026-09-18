import { GoogleGenAI, Type } from '@google/genai';
import { Quest } from '../src/types.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface ParsedPlayerAction {
  actionDetected: boolean;
  exerciseOrActivity?: string;
  countOrAmount?: number;
  unit?: string;
  isFatiguedOrSeekingRecovery: boolean;
  systemResponseText: string;
  confidence: number;
}

export async function parsePlayerMessageWithAI(
  message: string,
  playerName: string,
  playerLevel: number,
  playerRank: string,
  activeQuests: Quest[]
): Promise<ParsedPlayerAction> {
  const ai = getAiClient();

  // Active objectives summary for context
  const objectivesSummary = activeQuests
    .filter((q) => q.status === 'INCOMPLETE')
    .map((q) => `${q.title} (${q.type}): ` + q.objectives.map((o) => `${o.description} target ${o.target} ${o.unit} (current: ${o.current})`).join(', '))
    .join(' | ');

  if (!ai) {
    return fallbackRuleBasedParser(message, playerName);
  }

  try {
    const prompt = `You are the intelligence core of "THE SYSTEM" from SOLO LEVEL UP.
Personality rules:
- Cold, calm, direct, minimal, objective, authoritative.
- Never act as a cheerful life coach or motivational cheerleader.
- Do not use exclamation marks or pleasantries like "Have a great day 😊".
- Format responses cleanly starting with "[SYSTEM]" or "[SYSTEM WARNING]" or "[SYSTEM ADVISORY]".
- The protagonist player is named "${playerName}", Level ${playerLevel}, Rank ${playerRank}.
- Current active quests and objectives: "${objectivesSummary || 'No active quests'}".

The player just sent this communication:
"${message}"

Analyze if the player is reporting completing a physical or mental action (e.g. "ทำ push up 30 ครั้ง", "walked 20 min", "squats 50", "ran 5km", "done reading 20 pages") OR if they are stating severe fatigue/pain requesting recovery ("เหนื่อยมาก", "หมดแรง", "กล้ามเนื้อตึงมาก").
Generate structured output:
- actionDetected: boolean
- exerciseOrActivity: string or null
- countOrAmount: number or null
- unit: string or null ('reps', 'min', 'sec', 'ml', 'pages', 'km')
- isFatiguedOrSeekingRecovery: boolean
- systemResponseText: A brief cold system response. If action detected: "[SYSTEM]\\nACTION DETECTED.\\n[ACTIVITY] [AMOUNT] [UNIT].\\nVERIFICATION PROCESSED." If fatigue detected: "[SYSTEM]\\nFATIGUE ANOMALY DETECTED.\\nRECOVERY PROTOCOL ADVISED."
- confidence: number between 0 and 1`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actionDetected: { type: Type.BOOLEAN },
            exerciseOrActivity: { type: Type.STRING },
            countOrAmount: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            isFatiguedOrSeekingRecovery: { type: Type.BOOLEAN },
            systemResponseText: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ['actionDetected', 'isFatiguedOrSeekingRecovery', 'systemResponseText', 'confidence'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}') as ParsedPlayerAction;
    return {
      actionDetected: Boolean(parsed.actionDetected),
      exerciseOrActivity: parsed.exerciseOrActivity || undefined,
      countOrAmount: typeof parsed.countOrAmount === 'number' ? parsed.countOrAmount : undefined,
      unit: parsed.unit || 'reps',
      isFatiguedOrSeekingRecovery: Boolean(parsed.isFatiguedOrSeekingRecovery),
      systemResponseText: parsed.systemResponseText || `[SYSTEM]\nMESSAGE LOGGED.\nAWAITING DIRECT ACTION.`,
      confidence: parsed.confidence || 0.85,
    };
  } catch (err) {
    console.error('Gemini API call failed, falling back to rule-based engine:', err);
    return fallbackRuleBasedParser(message, playerName);
  }
}

function fallbackRuleBasedParser(message: string, playerName: string): ParsedPlayerAction {
  const lower = message.toLowerCase();

  // Check fatigue
  if (lower.includes('เหนื่อย') || lower.includes('ล้า') || lower.includes('tired') || lower.includes('exhausted') || lower.includes('หมดแรง')) {
    return {
      actionDetected: false,
      isFatiguedOrSeekingRecovery: true,
      systemResponseText: `[SYSTEM]\nPHYSIOLOGICAL STRESS DETECTED.\nPLAYER: ${playerName}\n\nRECOMMENDATION:\nINITIATE RECOVERY PROTOCOL.\nHYDRATION + 8 HOURS REM SLEEP.`,
      confidence: 0.9,
    };
  }

  // Check numbers
  const numberMatch = message.match(/(\d+)/);
  const amount = numberMatch ? parseInt(numberMatch[1], 10) : 0;

  if (lower.includes('push') || lower.includes('วิดพื้น')) {
    return {
      actionDetected: true,
      exerciseOrActivity: 'Push-up',
      countOrAmount: amount || 20,
      unit: 'reps',
      isFatiguedOrSeekingRecovery: false,
      systemResponseText: `[SYSTEM]\nACTION DETECTED.\n\nPUSH-UP: ${amount || 20} REPS\nVERIFICATION PROCESSED.\nRECORDED TO SYSTEM LOG.`,
      confidence: 0.88,
    };
  }

  if (lower.includes('squat') || lower.includes('สควอท') || lower.includes('ลุกนั่ง')) {
    return {
      actionDetected: true,
      exerciseOrActivity: 'Squat',
      countOrAmount: amount || 30,
      unit: 'reps',
      isFatiguedOrSeekingRecovery: false,
      systemResponseText: `[SYSTEM]\nACTION DETECTED.\n\nSQUAT: ${amount || 30} REPS\nVERIFICATION PROCESSED.\nRECORDED TO SYSTEM LOG.`,
      confidence: 0.88,
    };
  }

  if (lower.includes('walk') || lower.includes('เดิน') || lower.includes('วิ่ง') || lower.includes('run')) {
    return {
      actionDetected: true,
      exerciseOrActivity: 'Walking / Cardio',
      countOrAmount: amount || 20,
      unit: 'min',
      isFatiguedOrSeekingRecovery: false,
      systemResponseText: `[SYSTEM]\nACTION DETECTED.\n\nCARDIO: ${amount || 20} MIN\nENDURANCE METRIC UPDATED.`,
      confidence: 0.85,
    };
  }

  return {
    actionDetected: false,
    isFatiguedOrSeekingRecovery: false,
    systemResponseText: `[SYSTEM]\nTRANSMISSION RECEIVED.\nNO QUANTIFIED ACTION DETECTED.\n\nREPORT FORMAT:\n"[ACTIVITY] [AMOUNT]" (e.g. "ทำ push-up 30")`,
    confidence: 0.7,
  };
}
