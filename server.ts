import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { db } from './server/db.js';
import { parsePlayerMessageWithAI } from './server/gemini.js';
import {
  verifyLineSignature,
  replyToLine,
  pushToLine,
  processLineIncomingMessage,
  LineWebhookPayload,
} from './server/line.js';

dotenv.config();

const PORT = 3000;

export const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);

// Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', system: 'SOLO LEVEL UP SYSTEM ACTIVE', timestamp: new Date().toISOString() });
  });

  // 1. Get all available players / users
  app.get('/api/users', (req, res) => {
    try {
      const users = db.getUsers();
      res.json({ users });
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'System error fetching user accounts.' });
    }
  });

  // 2. Get full player state
  app.get('/api/player/:userId', (req, res) => {
    try {
      const { userId } = req.params;
      const data = db.getFullPlayerData(userId);
      if (!data) {
        return res.status(404).json({ error: `Player ${userId} not identified by System.` });
      }
      res.json({ data });
    } catch (err) {
      console.error('Error fetching player data:', err);
      res.status(500).json({ error: 'System error retrieving player profile.' });
    }
  });

  // 3. Register / Awaken new Player Profile
  app.post('/api/player/create', (req, res) => {
    try {
      const { name, age, height, weight, activityLevel, goal, availableTime } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Player designation name is required.' });
      }

      const playerBundle = db.createPlayer({
        name,
        age: Number(age) || 24,
        height: Number(height) || 175,
        weight: Number(weight) || 70,
        activityLevel: activityLevel || 'MODERATE',
        goal: goal || 'Attain Absolute Strength and Mental Mastery',
        availableTime: availableTime || '45 min/day',
      });

      res.status(201).json({ success: true, data: playerBundle });
    } catch (err) {
      console.error('Error creating player:', err);
      res.status(500).json({ error: 'System awakening failed during player calibration.' });
    }
  });

  // 4. Allocate Attribute / Stat Point
  app.post('/api/player/:userId/allocate-stat', (req, res) => {
    try {
      const { userId } = req.params;
      const { statKey } = req.body;

      if (!['str', 'agi', 'vit', 'end', 'disc'].includes(statKey)) {
        return res.status(400).json({ error: 'Invalid attribute designation.' });
      }

      const success = db.allocateStatPoint(userId, statKey);
      if (!success) {
        return res.status(400).json({ error: 'Insufficient unallocated attribute points.' });
      }

      const updated = db.getFullPlayerData(userId);
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('Error allocating stat:', err);
      res.status(500).json({ error: 'System error allocating attribute.' });
    }
  });

  // 5. Update Quest Objective Progress
  app.post('/api/quests/:userId/:questId/objective', (req, res) => {
    try {
      const { userId, questId } = req.params;
      const { objectiveId, increment } = req.body;

      if (!objectiveId || typeof increment !== 'number') {
        return res.status(400).json({ error: 'Objective ID and numeric increment required.' });
      }

      const result = db.updateQuestObjective(userId, questId, objectiveId, increment);
      if (!result.quest) {
        return res.status(404).json({ error: 'Quest or objective not found.' });
      }

      const updatedData = db.getFullPlayerData(userId);
      res.json({
        success: true,
        completedNow: result.completedNow,
        expAwarded: result.expAwarded,
        levelUps: result.levelUps,
        data: updatedData,
      });
    } catch (err) {
      console.error('Error updating objective:', err);
      res.status(500).json({ error: 'System error updating quest progress.' });
    }
  });

  // 6. Complete Quest Directly
  app.post('/api/quests/:userId/:questId/complete', (req, res) => {
    try {
      const { userId, questId } = req.params;
      const result = db.completeQuestDirectly(userId, questId);

      if (!result.quest) {
        return res.status(404).json({ error: 'Quest not found or already completed.' });
      }

      const updatedData = db.getFullPlayerData(userId);
      res.json({
        success: true,
        expAwarded: result.expAwarded,
        levelUps: result.levelUps,
        data: updatedData,
      });
    } catch (err) {
      console.error('Error completing quest:', err);
      res.status(500).json({ error: 'System error completing quest.' });
    }
  });

  // 7. Fail Quest & Initiate Penalty
  app.post('/api/quests/:userId/:questId/fail', (req, res) => {
    try {
      const { userId, questId } = req.params;
      const result = db.failQuestAndTriggerPenalty(userId, questId);

      if (!result.penaltyAssigned) {
        return res.status(400).json({ error: 'Quest cannot be failed or already concluded.' });
      }

      const updatedData = db.getFullPlayerData(userId);
      res.json({
        success: true,
        penaltyQuest: result.penaltyQuest,
        data: updatedData,
      });
    } catch (err) {
      console.error('Error triggering penalty:', err);
      res.status(500).json({ error: 'System error initiating penalty.' });
    }
  });

  // 8. System Assigns a New Quest
  app.post('/api/quests/:userId/request', (req, res) => {
    try {
      const { userId } = req.params;
      const { type } = req.body;
      const quest = db.requestNewQuest(userId, type || 'DAILY');
      const updatedData = db.getFullPlayerData(userId);
      res.json({ success: true, quest, data: updatedData });
    } catch (err) {
      console.error('Error assigning new quest:', err);
      res.status(500).json({ error: 'System error generating quest.' });
    }
  });

  // 9. LINE Chat / Direct System Chat Interface (NLP parsing & validation)
  app.post('/api/line-chat/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message content is required.' });
      }

      const playerBundle = db.getFullPlayerData(userId);
      if (!playerBundle) {
        return res.status(404).json({ error: 'Player identity not found.' });
      }

      // Record player message
      db.addChatMessage(userId, 'PLAYER', message);

      // AI parses natural language communication
      const parsedAction = await parsePlayerMessageWithAI(
        message,
        playerBundle.profile.name,
        playerBundle.level.currentLevel,
        playerBundle.level.rank,
        playerBundle.activeQuests
      );

      let actionVerified = false;
      let matchedObjectiveDesc = '';
      let awardedExp = 0;
      let levelUps: any[] = [];

      // If action detected, look up corresponding quest objective
      if (parsedAction.actionDetected && parsedAction.exerciseOrActivity) {
        const actName = parsedAction.exerciseOrActivity.toLowerCase();
        const amt = parsedAction.countOrAmount || 1;

        // Find active incomplete quest matching action
        const activeQuests = playerBundle.activeQuests.filter((q) => q.status === 'INCOMPLETE');
        let updatedObj = false;

        for (const quest of activeQuests) {
          for (const obj of quest.objectives) {
            const objDesc = obj.description.toLowerCase();
            if (
              (actName.includes('push') && objDesc.includes('push')) ||
              (actName.includes('squat') && objDesc.includes('squat')) ||
              (actName.includes('walk') && (objDesc.includes('walk') || objDesc.includes('cardio') || objDesc.includes('stride'))) ||
              (actName.includes('run') && (objDesc.includes('run') || objDesc.includes('cardio'))) ||
              (actName.includes('water') && objDesc.includes('hydration'))
            ) {
              const resObj = db.updateQuestObjective(userId, quest.id, obj.id, amt);
              actionVerified = true;
              matchedObjectiveDesc = `${obj.description}: ${resObj.quest?.objectives.find((o) => o.id === obj.id)?.current} / ${obj.target} ${obj.unit}`;
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

        // If no active quest objective matched, system still logs real activity & awards baseline effort EXP
        if (!updatedObj) {
          const expRes = db.awardExp(userId, 25, 'LINE_ACTION_LOGGED', `Direct Action logged: ${parsedAction.exerciseOrActivity} x ${amt}`);
          actionVerified = true;
          awardedExp = 25;
          levelUps = expRes.levelUpEvents;
          matchedObjectiveDesc = `${parsedAction.exerciseOrActivity}: +${amt} ${parsedAction.unit || 'units'} logged.`;
        }
      }

      // If player reported fatigue, assign recovery protocol if none active
      if (parsedAction.isFatiguedOrSeekingRecovery) {
        const hasRecovery = playerBundle.activeQuests.some((q) => q.type === 'RECOVERY' && q.status === 'INCOMPLETE');
        if (!hasRecovery) {
          db.requestNewQuest(userId, 'RECOVERY');
        }
      }

      // Build authoritative system response
      let systemReply = parsedAction.systemResponseText;
      if (actionVerified && matchedObjectiveDesc) {
        systemReply = `[SYSTEM]\nACTION DETECTED.\n\n${matchedObjectiveDesc.toUpperCase()}\nQUEST CONDITION PROGRESS UPDATED.${awardedExp > 0 ? `\n+${awardedExp} EXP VERIFIED.` : ''}`;
      }

      const recordedSystemMsg = db.addChatMessage(userId, 'SYSTEM', systemReply, {
        actionDetected: actionVerified,
        questActionSummary: matchedObjectiveDesc || undefined,
        expAwarded: awardedExp > 0 ? awardedExp : undefined,
      });

      const updatedData = db.getFullPlayerData(userId);
      res.json({
        success: true,
        reply: recordedSystemMsg,
        actionVerified,
        expAwarded: awardedExp,
        levelUps,
        data: updatedData,
      });
    } catch (err) {
      console.error('Error in line-chat endpoint:', err);
      res.status(500).json({ error: 'System AI transmission processing failed.' });
    }
  });

  // ==========================================
  // LINE MESSAGING API INTEGRATION (KHUN NOTE STYLE)
  // ==========================================

  // 10. Official LINE Webhook endpoint for LINE Official Account
  app.post('/api/line/webhook', async (req, res) => {
    try {
      const signature = req.headers['x-line-signature'] as string | undefined;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      // Verify signature (if LINE_CHANNEL_SECRET is configured)
      const isSignatureValid = verifyLineSignature(rawBody, signature);
      if (!isSignatureValid) {
        console.warn('[LINE WEBHOOK] Signature validation failed.');
        db.addLineWebhookLog({
          id: `wh_${Date.now()}`,
          timestamp: new Date().toISOString(),
          eventType: 'UNAUTHORIZED_WEBHOOK',
          status: 'ERROR',
          signatureVerified: false,
          text: 'Invalid HMAC signature header.',
        });
        return res.status(401).json({ error: 'Invalid LINE signature.' });
      }

      const payload = req.body as LineWebhookPayload;
      const events = payload?.events || [];

      // If test verification ping from LINE Developers console
      if (events.length === 0) {
        db.addLineWebhookLog({
          id: `wh_${Date.now()}`,
          timestamp: new Date().toISOString(),
          eventType: 'VERIFICATION_PING',
          status: 'SUCCESS',
          signatureVerified: isSignatureValid,
          text: 'LINE Developers Webhook Verification Success (200 OK)',
        });
        return res.status(200).json({ status: 'ok', message: 'Webhook endpoint verified.' });
      }

      // Process each incoming event asynchronously
      for (const event of events) {
        if (event.type === 'message' && event.message?.type === 'text') {
          const lineUserId = event.source?.userId || 'anonymous_line_user';
          const text = event.message.text || '';
          const replyToken = event.replyToken;

          console.log(`[LINE WEBHOOK] Message from ${lineUserId}: "${text}"`);

          const processResult = await processLineIncomingMessage(lineUserId, text);

          // If real LINE reply token is present, attempt sending reply via LINE Messaging API
          if (replyToken) {
            await replyToLine(replyToken, [{ type: 'text', text: processResult.replyText }]);
          }

          // Record in DB webhook diagnostics log
          db.addLineWebhookLog({
            id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            eventType: 'MESSAGE',
            lineUserId,
            text,
            replyText: processResult.replyText,
            status: processResult.status,
            signatureVerified: isSignatureValid,
          });
        }
      }

      return res.status(200).json({ status: 'ok', processed: events.length });
    } catch (err) {
      console.error('[LINE WEBHOOK ERROR]', err);
      db.addLineWebhookLog({
        id: `wh_err_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'EXCEPTION',
        status: 'ERROR',
        signatureVerified: false,
        text: String(err),
      });
      return res.status(500).json({ error: 'System error handling LINE webhook.' });
    }
  });

  // 11. Interactive LINE Simulator (allows instant testing in web UI without external LINE setup)
  app.post('/api/line/simulate', async (req, res) => {
    try {
      const { userId, message, displayName, customLineUserId } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message text is required.' });
      }

      const player = db.getFullPlayerData(userId);
      // Use linked LINE ID, or user's custom test ID, or simulated ID
      const effectiveLineUserId =
        player?.profile.lineUserId || customLineUserId || `LINE_USER_${userId.replace('user_', '').toUpperCase()}`;

      // If simulate wants to test as this user and not yet bound, check pairing
      const processResult = await processLineIncomingMessage(
        effectiveLineUserId,
        message,
        displayName || player?.profile.name || 'Protagonist'
      );

      // Log event
      db.addLineWebhookLog({
        id: `wh_sim_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'SIMULATION',
        lineUserId: effectiveLineUserId,
        senderName: displayName || player?.profile.name,
        text: message,
        replyText: processResult.replyText,
        status: processResult.status,
        signatureVerified: true,
      });

      const updated = db.getFullPlayerData(userId);
      res.json({
        success: true,
        reply: processResult.replyText,
        status: processResult.status,
        expAwarded: processResult.expAwarded || 0,
        levelUps: processResult.levelUps || [],
        data: updated,
      });
    } catch (err) {
      console.error('Error in line simulate endpoint:', err);
      res.status(500).json({ error: 'Simulation processing failed.' });
    }
  });

  // 12. Get LINE status & Pairing Code for player
  app.get('/api/line/status/:userId', (req, res) => {
    try {
      const { userId } = req.params;
      const player = db.getFullPlayerData(userId);
      if (!player) {
        return res.status(404).json({ error: 'Player not found.' });
      }
      res.json({ success: true, lineInfo: player.lineInfo });
    } catch (err) {
      console.error('Error fetching line status:', err);
      res.status(500).json({ error: 'Failed to retrieve LINE status.' });
    }
  });

  // 13. Pair player account with LINE user ID or Pairing Code
  app.post('/api/line/pair', (req, res) => {
    try {
      const { userId, pairingCode, lineUserId, displayName } = req.body;

      if (pairingCode && lineUserId) {
        const result = db.bindByPairingCode(pairingCode, lineUserId, displayName);
        if (!result.success) {
          return res.status(400).json({ error: result.error || 'Pairing failed' });
        }
        return res.json({ success: true, data: result.playerBundle });
      }

      if (userId && lineUserId) {
        const bound = db.bindLineUser(userId, lineUserId, displayName);
        if (!bound) {
          return res.status(400).json({ error: 'Player not found.' });
        }
        const updated = db.getFullPlayerData(userId);
        return res.json({ success: true, data: updated });
      }

      return res.status(400).json({ error: 'Missing pairing parameters.' });
    } catch (err) {
      console.error('Error in line pair endpoint:', err);
      res.status(500).json({ error: 'Failed to pair LINE account.' });
    }
  });

  // 14. Unlink player's LINE account
  app.post('/api/line/unlink/:userId', (req, res) => {
    try {
      const { userId } = req.params;
      const success = db.unbindLineUser(userId);
      const updated = db.getFullPlayerData(userId);
      res.json({ success, data: updated });
    } catch (err) {
      console.error('Error unlinking LINE account:', err);
      res.status(500).json({ error: 'Failed to unlink LINE account.' });
    }
  });

  // 15. Get LINE Webhook Diagnostic Logs
  app.get('/api/line/webhook-logs', (req, res) => {
    try {
      const logs = db.getLineWebhookLogs();
      res.json({ success: true, logs });
    } catch (err) {
      console.error('Error fetching webhook logs:', err);
      res.status(500).json({ error: 'Failed to fetch webhook logs.' });
    }
  });

  // 16. Test Push Notification to linked LINE account
  app.post('/api/line/test-push/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const player = db.getFullPlayerData(userId);
      if (!player) return res.status(404).json({ error: 'Player not found.' });

      const lineUserId = player.profile.lineUserId;
      if (!lineUserId) {
        return res.status(400).json({ error: 'Player has no linked LINE account.' });
      }

      const pushText = `【THE SYSTEM - TEST TELEMETRY】\n━━━━━━━━━━━━━━━━━━\nระบบเชื่อมต่อกับผู้เล่น ${player.profile.name} สำเร็จ!\nเวลา: ${new Date().toLocaleTimeString('th-TH')}\nสถานะ: พร้อมรับรายงานเควสต์`;
      const sent = await pushToLine(lineUserId, pushText);

      res.json({ success: true, sentToLineApi: sent, message: pushText });
    } catch (err) {
      console.error('Error sending test push:', err);
      res.status(500).json({ error: 'Push notification failed.' });
    }
  });

  // Mount Vite middleware in development or serve dist in production
  async function startServer() {
    if (!process.env.VERCEL) {
      if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }

      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[SOLO LEVEL UP] System server active on http://0.0.0.0:${PORT}`);
      });
    }
  }

  startServer();

  export default app;
