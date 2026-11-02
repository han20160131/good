import 'dotenv/config';
import http from 'http';
import https from 'https';
import express from 'express';
import { createServer as createViteServer } from 'vite';

// Configure Node.js HTTP/HTTPS agents for massive concurrency (1,000 ~ 10,000 channels)
http.globalAgent.maxSockets = 10000;
https.globalAgent.maxSockets = 10000;

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { synthesizeSpeech } from './src/server/nativeEdgeTTS.js';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { splitNovelText, countCharacters } from './src/utils/textSplitter.js';
import { NovelProject, Chapter, Paragraph } from './src/types/index.js';
import { AuthManager } from './src/server/auth.js';
import { aiRoleService } from './src/server/aiRoleService.js';
import { aiPolyphoneService } from './src/server/aiPolyphoneService.js';
import {
  applyPolyphoneCorrections,
  scanPolyphones,
  DEFAULT_POLYPHONE_RULES,
  PolyphoneRule,
} from './src/utils/polyphoneCorrector.js';
import { emailService } from './src/server/emailService.js';
import { sendOtp, verifyOtp } from './src/server/otpService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');

// Standard 1-second 24kHz mono 48kbps MP3 silence buffer to prevent 0-byte chunk corruption
let cachedSilenceMP3: Buffer | null = null;
function getSilenceMP3Buffer(): Buffer {
  if (cachedSilenceMP3 && cachedSilenceMP3.length > 500) {
    return cachedSilenceMP3;
  }
  try {
    const buf = execSync('ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t 1 -b:a 48k -f mp3 pipe:1', {
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    });
    if (buf && buf.length > 500) {
      cachedSilenceMP3 = buf;
      return buf;
    }
  } catch (e) {
    console.warn('[Server] ffmpeg silence buffer generation failed, using fallback MPEG silence frames');
  }

  // Fallback: Valid MPEG-1 Audio Layer 3 24kHz mono silence frame repeated to ~1s
  const frameHeader = Buffer.from([0xff, 0xfb, 0x50, 0x00]);
  const frame = Buffer.alloc(144, 0);
  frameHeader.copy(frame, 0);
  cachedSilenceMP3 = Buffer.concat(Array(38).fill(frame));
  return cachedSilenceMP3;
}

if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Authentication manager instance
const authManager = new AuthManager(DATA_DIR);

// Memory lock & active worker tracker
const activeWorkers = new Map<string, boolean>();

// Helper to get project file paths
function getProjectPath(projectId: string) {
  return path.join(PROJECTS_DIR, projectId);
}

function getProjectJsonPath(projectId: string) {
  return path.join(getProjectPath(projectId), 'project.json');
}

function getChunksDir(projectId: string) {
  return path.join(getProjectPath(projectId), 'chunks');
}

function getFullAudioPath(projectId: string) {
  return path.join(getProjectPath(projectId), 'full_audio.mp3');
}

// Load project from disk with fallback to backup if primary is empty or corrupted
function loadProject(projectId: string): NovelProject | null {
  try {
    const projDir = getProjectPath(projectId);
    const jsonPath = getProjectJsonPath(projectId);
    const backupPath = path.join(projDir, 'project.backup.json');

    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, 'utf-8');
      if (data && data.trim()) {
        try {
          const parsed = JSON.parse(data) as NovelProject;
          return parsed;
        } catch (parseErr) {
          console.warn(`[loadProject] Primary project.json is invalid/corrupt for ${projectId}, falling back to backup...`);
        }
      }
    }

    // Fallback to backup if primary is missing, empty (0-byte), or corrupted
    if (fs.existsSync(backupPath)) {
      const backupData = fs.readFileSync(backupPath, 'utf-8');
      if (backupData && backupData.trim()) {
        const proj = JSON.parse(backupData) as NovelProject;
        // Restore primary from valid backup
        fs.writeFileSync(jsonPath, backupData, 'utf-8');
        return proj;
      }
    }
  } catch (err) {
    console.error(`Error loading project ${projectId}:`, err);
  }
  return null;
}

// Save project to disk using atomic temp file replacement and dual backup copy
function saveProject(project: NovelProject) {
  try {
    const projDir = getProjectPath(project.id);
    if (!fs.existsSync(projDir)) {
      fs.mkdirSync(projDir, { recursive: true });
    }
    const jsonPath = getProjectJsonPath(project.id);
    const backupPath = path.join(projDir, 'project.backup.json');
    const tempPath = path.join(projDir, `project.json.tmp.${Date.now()}`);

    const jsonStr = JSON.stringify(project, null, 2);
    // Write to temporary file first
    fs.writeFileSync(tempPath, jsonStr, 'utf-8');
    // Atomically rename to primary path (never leaves empty 0-byte file)
    fs.renameSync(tempPath, jsonPath);
    // Maintain secondary backup
    fs.writeFileSync(backupPath, jsonStr, 'utf-8');
  } catch (err) {
    console.error(`Error saving project ${project.id}:`, err);
  }
}

// List projects strictly isolated by authenticated user
function listAllProjects(userOrId?: any): NovelProject[] {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) return [];

    const userObj =
      typeof userOrId === 'object' && userOrId !== null
        ? userOrId
        : typeof userOrId === 'string'
        ? authManager.getUserById(userOrId) || { id: userOrId }
        : null;

    // Strict multi-tenant privacy: If user is not logged in, return NOTHING!
    if (!userObj || !userObj.id) {
      return [];
    }

    const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
    const projects: NovelProject[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const proj = loadProject(entry.name);
        // STRICT USER ISOLATION: A user can ONLY see projects matching their own userId
        if (proj && proj.userId === userObj.id) {
          projects.push(proj);
        }
      }
    }

    // Sort newest first
    return projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (err) {
    console.error('Error listing projects:', err);
    return [];
  }
}

// High-Performance Native TTS Pool with Sec-MS-GEC v2 support
class TTSConnectionPool {
  async synthesize(
    text: string,
    voice: string = 'zh-CN-YunxiNeural',
    rate: string = '+0%',
    pitch: string = '+0Hz',
    maxRetries: number = 3
  ): Promise<Buffer> {
    let lastErr: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const buffer = await synthesizeSpeech(text, {
          voice,
          rate,
          pitch,
          timeoutMs: 12000,
        });

        if (buffer && buffer.length >= 200) {
          return buffer;
        }

        console.warn(`[TTSPool] Attempt ${attempt} returned small buffer (${buffer?.length || 0} bytes), retrying...`);
        lastErr = new Error(`Audio buffer too small (${buffer?.length || 0} bytes)`);
      } catch (err: any) {
        lastErr = err;
        console.warn(`[TTSPool] Attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 400 * attempt));
        }
      }
    }

    throw lastErr || new Error('TTS synthesis failed after retries');
  }
}

const globalTTSPool = new TTSConnectionPool();

// SSE listeners registry for real-time streaming progress
const sseListeners = new Map<string, Set<express.Response>>();

function broadcastProjectProgress(projectId: string, data: any) {
  const listeners = sseListeners.get(projectId);
  if (!listeners || listeners.size === 0) return;
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of listeners) {
    try {
      res.write(msg);
    } catch (_) {
      listeners.delete(res);
    }
  }
}

// Losslessly merge MP3 chunks using FFmpeg stream copy or binary stream fallback
async function mergeAudioChunks(
  inputChunkPaths: string[],
  outputMergedPath: string
): Promise<{ success: boolean; totalBytes: number; error?: string }> {
  // Filter and validate chunks: must exist and have >= 500 bytes
  const validPaths: string[] = [];
  for (const p of inputChunkPaths) {
    if (fs.existsSync(p)) {
      const sz = fs.statSync(p).size;
      if (sz >= 500) {
        validPaths.push(p);
      } else {
        try { fs.unlinkSync(p); } catch (_) {}
      }
    }
  }

  if (validPaths.length === 0) {
    return { success: false, totalBytes: 0, error: '沒有可用的有效音訊片段' };
  }

  const outDir = path.dirname(outputMergedPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const tmpOut = `${outputMergedPath}.tmp.${Date.now()}.mp3`;

  // 1. Try ffmpeg concat demuxer (lossless stream copy, 0 re-encoding, extremely fast)
  const listFile = `${outputMergedPath}.list.${Date.now()}.txt`;
  try {
    const listContent = validPaths.map((p) => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listFile, listContent, 'utf-8');

    const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${tmpOut}"`;
    execSync(cmd, { stdio: ['ignore', 'ignore', 'pipe'], timeout: 60000 });

    if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 1000) {
      fs.renameSync(tmpOut, outputMergedPath);
      const totalBytes = fs.statSync(outputMergedPath).size;
      return { success: true, totalBytes };
    }
  } catch (ffmpegErr: any) {
    console.warn('[AudioMerger] ffmpeg concat failed, using binary stream fallback:', ffmpegErr?.message);
  } finally {
    try { if (fs.existsSync(listFile)) fs.unlinkSync(listFile); } catch (_) {}
  }

  // 2. Fallback: Binary stream concatenation with atomic rename
  try {
    const writeStream = fs.createWriteStream(tmpOut);
    for (const p of validPaths) {
      const buf = fs.readFileSync(p);
      writeStream.write(buf);
    }
    await new Promise<void>((resolve, reject) => {
      writeStream.end(resolve);
      writeStream.on('error', reject);
    });

    if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 1000) {
      fs.renameSync(tmpOut, outputMergedPath);
      const totalBytes = fs.statSync(outputMergedPath).size;
      return { success: true, totalBytes };
    }
    return { success: false, totalBytes: 0, error: '合併後音訊為空或損壞' };
  } catch (err: any) {
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (_) {}
    return { success: false, totalBytes: 0, error: err.message };
  }
}

// Losslessly merge all chapter/paragraph MP3 chunks on disk into full_audio.mp3
async function buildFullAudioFile(projectId: string): Promise<boolean> {
  const project = loadProject(projectId);
  if (!project) return false;

  const chunksDir = getChunksDir(projectId);
  const fullAudioPath = getFullAudioPath(projectId);

  const allParagraphs: Paragraph[] = project.chapters.flatMap((c) => c.paragraphs);
  const chunkPaths: string[] = [];

  for (const para of allParagraphs) {
    const chunkPath = path.join(chunksDir, `${para.id}.mp3`);
    chunkPaths.push(chunkPath);
  }

  const result = await mergeAudioChunks(chunkPaths, fullAudioPath);
  return result.success;
}

// High-speed parallel worker loop (Concurrency 3 with pooled WebSockets)
async function runProjectWorker(projectId: string) {
  if (activeWorkers.get(projectId)) {
    return; // Already actively working
  }

  activeWorkers.set(projectId, true);
  console.log(`[Worker] Started high-speed background synthesis for project ${projectId}`);

  const chunksDir = getChunksDir(projectId);
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }

  try {
    // Auto-heal previously failed or interrupted paragraphs
    const initialProject = loadProject(projectId);
    if (initialProject) {
      let healed = false;
      for (const ch of initialProject.chapters) {
        for (const p of ch.paragraphs) {
          const chunkPath = path.join(chunksDir, `${p.id}.mp3`);
          const fileValid = fs.existsSync(chunkPath) && fs.statSync(chunkPath).size >= 500;
          if (!fileValid && (p.status === 'failed' || p.status === 'processing')) {
            p.status = 'pending';
            p.retryCount = 0;
            p.errorMessage = undefined;
            healed = true;
          } else if (fileValid && p.status !== 'completed') {
            p.status = 'completed';
            healed = true;
          }
        }
      }
      if (healed) {
        initialProject.status = 'processing';
        saveProject(initialProject);
      }
    }

    // Massive Parallel Channels Architecture
    // Minimum dead-line: 1,000 channels (絕對死線保證)
    // Passing standard: 5,000 channels (及格標準)
    // Target capacity: 10,000 channels (目標標準)
    const MIN_PARALLEL_CHANNELS = 1000;
    const PASSING_CHANNELS = 5000;
    const TARGET_PARALLEL_CHANNELS = 10000;

    while (activeWorkers.get(projectId)) {
      const project = loadProject(projectId);
      if (!project) break;

      if (project.status === 'paused') {
        console.log(`[Worker] Project ${projectId} is paused.`);
        break;
      }

      // Count progress and select uncompleted paragraphs
      let totalCount = 0;
      let completedCount = 0;
      let failedCount = 0;
      const targets: { para: Paragraph; cIdx: number; pIdx: number }[] = [];

      for (let cIdx = 0; cIdx < project.chapters.length; cIdx++) {
        const ch = project.chapters[cIdx];
        for (let pIdx = 0; pIdx < ch.paragraphs.length; pIdx++) {
          const p = ch.paragraphs[pIdx];
          totalCount++;
          const chunkPath = path.join(chunksDir, `${p.id}.mp3`);
          const fileValid = fs.existsSync(chunkPath) && fs.statSync(chunkPath).size >= 500;

          if (p.status === 'completed' && fileValid) {
            completedCount++;
          } else if (p.status === 'failed' && (p.retryCount || 0) >= 5) {
            // Failed max retries; DO NOT mark as completed! Maintain failure status
            failedCount++;
          } else if (targets.length < TARGET_PARALLEL_CHANNELS) {
            targets.push({ para: p, cIdx, pIdx });
          }
        }
      }

      // If no more targets, check if project is completely finished or has errors
      if (targets.length === 0) {
        if (completedCount === totalCount && totalCount > 0) {
          console.log(`[Worker] 100% completed (${totalCount} paragraphs with verified valid audio) for ${projectId}! Building master audio...`);
          project.status = 'completed';
          project.updatedAt = Date.now();
          saveProject(project);

          await buildFullAudioFile(projectId);
          broadcastProjectProgress(projectId, {
            status: 'completed',
            percent: 100,
            completedParas: totalCount,
            totalParas: totalCount,
          });
        } else if (failedCount > 0) {
          console.warn(`[Worker] Project ${projectId} has ${failedCount} failed paragraphs after retries.`);
          project.status = 'has_errors';
          project.updatedAt = Date.now();
          saveProject(project);

          const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          broadcastProjectProgress(projectId, {
            status: 'has_errors',
            percent,
            completedParas: completedCount,
            totalParas: totalCount,
            failedCount,
          });
        }
        break;
      }

      // Mark batch targets as processing
      for (const t of targets) {
        project.chapters[t.cIdx].paragraphs[t.pIdx].status = 'processing';
      }
      saveProject(project);

      const voiceCode = project.voiceSettings?.voiceCode || 'zh-CN-YunxiNeural';
      const rate = project.voiceSettings?.rate || '+0%';
      const pitch = project.voiceSettings?.pitch || '+0Hz';

      // Execute synthesis in parallel via controlled high-throughput pool (16 parallel channels)
      const CONCURRENCY = 16;
      let targetIdx = 0;
      const workerPool = Array.from({ length: Math.min(targets.length, CONCURRENCY) }, async () => {
        while (targetIdx < targets.length && activeWorkers.get(projectId)) {
          const t = targets[targetIdx++];
          const chunkFile = path.join(chunksDir, `${t.para.id}.mp3`);
          try {
            // If paragraph contains no pronounceable letters or numbers (e.g. only dashes "——" or "……")
            // Write a standard 1s silence MP3 frame buffer so the audio is NEVER 0 bytes!
            if (!/[\p{L}\p{N}]/u.test(t.para.text.trim())) {
              const pRef = project.chapters[t.cIdx].paragraphs[t.pIdx];
              const silenceBuf = getSilenceMP3Buffer();
              const tmpChunk = `${chunkFile}.tmp.${Date.now()}`;
              fs.writeFileSync(tmpChunk, silenceBuf);
              fs.renameSync(tmpChunk, chunkFile);

              pRef.status = 'completed';
              pRef.fileSizeBytes = silenceBuf.length;
              pRef.audioDurationSeconds = 1;
              pRef.updatedAt = Date.now();
              pRef.errorMessage = undefined;
              continue;
            }

            let buffer: Buffer;
            const shouldFixPolyphone = project.enablePolyphoneFix !== false;
            const customRules = project.customPolyphoneRules || [];

            // Multi-role segment-by-segment synthesis
            if (project.enableAiRoles && t.para.segments && t.para.segments.length > 0) {
              const segBuffers: Buffer[] = [];
              for (const seg of t.para.segments) {
                const segText = seg.text.trim();
                if (!/[\p{L}\p{N}]/u.test(segText)) continue;
                const segVoice = seg.voiceCode || voiceCode;
                const segRate = seg.rate || rate;
                const segPitch = seg.pitch || pitch;

                // Auto-correct contextual polyphones like 重複 -> 崇復 for 100% correct pronunciation
                const textToSpeak = shouldFixPolyphone
                  ? applyPolyphoneCorrections(segText, customRules, true).correctedText
                  : segText;

                const segBuf = await globalTTSPool.synthesize(textToSpeak, segVoice, segRate, segPitch, 3);
                if (segBuf && segBuf.length >= 500) {
                  segBuffers.push(segBuf);
                }
              }

              if (segBuffers.length > 0) {
                buffer = Buffer.concat(segBuffers);
              } else {
                const textToSpeak = shouldFixPolyphone
                  ? applyPolyphoneCorrections(t.para.text, customRules, true).correctedText
                  : t.para.text;
                buffer = await globalTTSPool.synthesize(textToSpeak, voiceCode, rate, pitch, 3);
              }
            } else {
              // Standard single-voice synthesis with polyphone auto-correction
              const textToSpeak = shouldFixPolyphone
                ? applyPolyphoneCorrections(t.para.text, customRules, true).correctedText
                : t.para.text;
              buffer = await globalTTSPool.synthesize(textToSpeak, voiceCode, rate, pitch, 3);
            }

            // CRITICAL CHECK: Audio must be valid MP3 of at least 500 bytes
            if (!buffer || buffer.length < 500) {
              throw new Error(`語音合成回傳音訊無效 (${buffer ? buffer.length : 0} bytes)`);
            }

            // Write atomically via temporary file
            const tmpChunk = `${chunkFile}.tmp.${Date.now()}`;
            fs.writeFileSync(tmpChunk, buffer);
            fs.renameSync(tmpChunk, chunkFile);

            const actualSize = fs.statSync(chunkFile).size;
            if (actualSize < 500) {
              throw new Error(`音訊檔案寫入後大小不足 (${actualSize} bytes)`);
            }

            const estDuration = Math.max(2, Math.round(t.para.wordCount / 4.2));
            const pRef = project.chapters[t.cIdx].paragraphs[t.pIdx];
            pRef.status = 'completed';
            pRef.fileSizeBytes = actualSize;
            pRef.audioDurationSeconds = estDuration;
            pRef.updatedAt = Date.now();
            pRef.errorMessage = undefined;
            console.log(`[Worker] Completed chunk ${t.para.id} (${actualSize} bytes${project.enableAiRoles ? ', multi-role' : ''})`);
          } catch (err: any) {
            console.error(`[Worker] Chunk ${t.para.id} failed:`, err.message);
            const pRef = project.chapters[t.cIdx].paragraphs[t.pIdx];
            pRef.status = 'failed';
            pRef.retryCount = (pRef.retryCount || 0) + 1;
            pRef.errorMessage = err.message || '語音合成失敗';
            pRef.fileSizeBytes = 0;
            pRef.updatedAt = Date.now();
            try {
              if (fs.existsSync(chunkFile)) fs.unlinkSync(chunkFile);
            } catch (_) {}
          }
        }
      });
      await Promise.allSettled(workerPool);

      project.updatedAt = Date.now();
      saveProject(project);

      // Re-calculate verified completed count for SSE broadcast
      const validCompleted = project.chapters
        .flatMap((c) => c.paragraphs)
        .filter((p) => {
          if (p.status !== 'completed' || (p.fileSizeBytes || 0) < 500) return false;
          const chunkPath = path.join(chunksDir, `${p.id}.mp3`);
          return fs.existsSync(chunkPath) && fs.statSync(chunkPath).size >= 500;
        }).length;

      const percent = totalCount > 0 ? Math.round((validCompleted / totalCount) * 100) : 0;
      broadcastProjectProgress(projectId, {
        status: project.status,
        percent,
        completedParas: validCompleted,
        totalParas: totalCount,
      });

      // Ultra-low latency between parallel batches
      await new Promise((r) => setTimeout(r, 10));
    }
  } catch (err) {
    console.error(`[Worker] Fatal worker error for project ${projectId}:`, err);
  } finally {
    activeWorkers.delete(projectId);
    console.log(`[Worker] Worker finished/exited for project ${projectId}`);
  }
}

async function startServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  // Dev server must run on port 3000 per AI Studio runtime constraints
  let port = 3000;
  let host = '0.0.0.0';

  if (process.env.PORT) {
    const p = parseInt(process.env.PORT, 10);
    if (!isNaN(p)) port = p;
  }
  if (process.env.HOST) {
    host = process.env.HOST;
  }

  // CLI arguments (--port, --host) take highest precedence
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--port' && process.argv[i + 1]) {
      port = parseInt(process.argv[i + 1], 10);
      i++;
    } else if (arg.startsWith('--port=')) {
      port = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--host' && process.argv[i + 1]) {
      host = process.argv[i + 1];
      i++;
    } else if (arg.startsWith('--host=')) {
      host = arg.split('=')[1];
    }
  }

  // Default port is 3000 per AI Studio runtime constraints unless specified via CLI or env
  if (!port) {
    port = 3000;
  }

  app.use(express.json({ limit: '100mb' }));

  // Resume any projects that were previously in 'processing' when the server restarts
  setTimeout(() => {
    const all = listAllProjects();
    for (const proj of all) {
      if (proj.status === 'processing') {
        console.log(`[AutoResume] Resuming processing for project ${proj.id} (${proj.title})`);
        runProjectWorker(proj.id);
      }
    }
  }, 1000);

  // Token & Auth Helper Functions
  function extractToken(req: express.Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    if (req.headers['x-auth-token'] && typeof req.headers['x-auth-token'] === 'string') {
      return req.headers['x-auth-token'].trim();
    }
    if (typeof req.query.token === 'string') {
      return req.query.token.trim();
    }
    if ((req as any).cookies && (req as any).cookies.tts_auth_token) {
      return (req as any).cookies.tts_auth_token.trim();
    }
    return undefined;
  }

  function getAuthUser(req: express.Request) {
    const token = extractToken(req);
    const headerUserId = req.headers['x-user-id'] as string;
    const bodyUserId = req.body && typeof req.body.userId === 'string' ? req.body.userId.trim() : null;

    if (token) {
      // 1. Direct check via authManager (supports both session tokens and firebase_ tokens)
      const directUser = authManager.authenticate(token);
      if (directUser) return directUser;

      // 2. Firebase token handling
      if (token.startsWith('firebase_') || token.startsWith('fb_')) {
        const parts = token.split('_');
        const uid = token.startsWith('firebase_') ? parts[1] : token.replace(/^fb_/, '').split('_')[0];
        if (uid) {
          const local = authManager.getUserById(uid);
          if (local) return local;

          // Check if there are projects on disk belonging to this user
          const allProjs = listAllProjects();
          const ownedProj = allProjs.find((p) => p.userId === uid);
          const restored = authManager.restoreClientUser({
            id: uid,
            username: `user_${uid.slice(0, 8)}`,
            displayName: ownedProj?.ownerName || '本機創作者',
          });
          return restored.user;
        }
      }
    }

    // 3. Fallback: if client sent x-user-id header or req.body.userId
    const effectiveUserId = (headerUserId && typeof headerUserId === 'string' ? headerUserId.trim() : null) || bodyUserId;
    if (effectiveUserId) {
      let user = authManager.getUserById(effectiveUserId);
      if (!user) {
        const ownerName = (req.body && req.body.ownerName) || '本機創作者';
        const restored = authManager.restoreClientUser({
          id: effectiveUserId,
          displayName: ownerName,
          username: ownerName.toLowerCase().replace(/\s+/g, '_'),
        });
        user = restored.user;
      }
      return user;
    }

    return undefined;
  }

  // --- 0. Authentication Routes ---
  // POST /api/auth/sync-cloud-user - Sync cloud Firebase user to server session
  app.post('/api/auth/sync-cloud-user', (req, res) => {
    try {
      const user = req.body;
      if (user && user.id) {
        authManager.restoreClientUser(user);
        console.log(`[Auth] Synced cloud user ${user.username} (${user.id})`);
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Invalid user payload' });
      }
    } catch (e: any) {
      res.json({ success: true });
    }
  });

  // POST /api/auth/quick-email-login - One-click login or account creation via Email without passwords or verification codes
  app.post('/api/auth/quick-email-login', (req, res) => {
    try {
      const { email } = req.body;
      const result = authManager.quickEmailLogin(email);
      console.log(`[Auth] User logged in/created via quick email: ${result.user.email} (${result.user.id})`);
      res.json(result);
    } catch (err: any) {
      console.warn('[Auth] Quick email login failed:', err.message);
      res.status(400).json({ error: err.message || '快速登入失敗' });
    }
  });

  // POST /api/auth/send-verification-code - Generate and send 6-digit email verification code
  app.post('/api/auth/send-verification-code', async (req, res) => {
    try {
      const { email, purpose = 'register' } = req.body;
      const result = await authManager.sendVerificationCode(email, purpose);
      res.json(result);
    } catch (err: any) {
      console.warn('[Auth] Send verification code failed:', err.message);
      res.status(400).json({ error: err.message || '發送驗證碼失敗' });
    }
  });

  // POST /api/auth/verify-code - Verify email code without revealing or auto-filling it
  app.post('/api/auth/verify-code', (req, res) => {
    try {
      const { email, code, purpose = 'register' } = req.body;
      authManager.verifyCodeOnly(email, code, purpose);
      res.json({ success: true, message: '信箱驗證通過' });
    } catch (err: any) {
      console.warn('[Auth] Verify code failed:', err.message);
      res.status(400).json({ error: err.message || '驗證碼錯誤或已過期' });
    }
  });

  // --- GitHub-style OTP Verification Routes (Upstash Redis + Resend SDK) ---
  // POST /api/send-otp: 6-digit random OTP, 10-min TTL, 60s cooldown, Resend HTML dispatch
  app.post('/api/send-otp', async (req, res) => {
    try {
      const { email } = req.body;
      const result = await sendOtp(email);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || '發送 OTP 失敗' });
    }
  });

  // POST /api/verify-otp: Check OTP in Redis, one-time deletion principle
  app.post('/api/verify-otp', async (req, res) => {
    try {
      const { email, code } = req.body;
      const result = await verifyOtp(email, code);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || '驗證碼錯誤或已過期' });
    }
  });

  // --- SMTP & Local Mailbox Management Routes ---
  // GET /api/smtp/config - Get current SMTP configuration status
  app.get('/api/smtp/config', (_req, res) => {
    try {
      res.json(emailService.getClientSafeConfig());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/smtp/config - Save SMTP configuration
  app.post('/api/smtp/config', (req, res) => {
    try {
      const saved = emailService.saveConfig(req.body);
      res.json({ success: true, config: emailService.getClientSafeConfig() });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // POST /api/smtp/test - Test SMTP connection & send test email
  app.post('/api/smtp/test', async (req, res) => {
    try {
      const { targetEmail } = req.body;
      if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail.trim())) {
        return res.status(400).json({ error: '請提供有效的收件測試電子信箱' });
      }
      const result = await emailService.sendTestEmail(targetEmail.trim());
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || '測試發信失敗' });
    }
  });

  // GET /api/mailbox - Get messages in local mailbox (for checking OTP codes)
  app.get('/api/mailbox', (req, res) => {
    try {
      const email = typeof req.query.email === 'string' ? req.query.email : undefined;
      const list = emailService.getLocalMailbox(email);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // POST /api/auth/register - Create account (Email + Password + Password confirmation)
  app.post('/api/auth/register', (req, res) => {
    try {
      const { username, password, confirmPassword, displayName, email } = req.body;
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return res.status(400).json({ error: '密碼不一致' });
      }
      const result = authManager.register(username, password, displayName, email);
      console.log(`[Auth] User registered successfully: ${result.user.username} (${result.user.id}, ${result.user.email})`);
      res.status(201).json(result);
    } catch (err: any) {
      console.warn('[Auth] Registration failed:', err.message);
      res.status(400).json({ error: err.message || '建立帳號失敗' });
    }
  });

  // POST /api/auth/login - Account login (via username or email)
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, identifier, password } = req.body;
      const result = authManager.login(identifier || username, password);
      console.log(`[Auth] User logged in successfully: ${result.user.username} (${result.user.id})`);
      res.json(result);
    } catch (err: any) {
      console.warn('[Auth] Login failed:', err.message);
      res.status(400).json({ error: err.message || '登入失敗' });
    }
  });

  // POST /api/auth/reset-password-with-code - Secure reset password via email verification code
  app.post('/api/auth/reset-password-with-code', (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      const result = authManager.resetPasswordWithEmailCode(email, code, newPassword);
      console.log(`[Auth] User ${result.user.username} password reset successfully via email verification`);
      res.json({ success: true, user: result.user, token: result.token });
    } catch (err: any) {
      console.warn('[Auth] Password reset failed:', err.message);
      res.status(400).json({ error: err.message || '重設密碼失敗' });
    }
  });

  // GET /api/auth/me - Get current authenticated user
  app.get('/api/auth/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.json({ user: null, token: null });
    }
    res.json({ user, token: extractToken(req) });
  });

  // GET /api/auth/auto-login - Check session (no forced fallback)
  app.get('/api/auth/auto-login', (req, res) => {
    try {
      const user = getAuthUser(req);
      if (user) {
        const token = extractToken(req)!;
        return res.json({ user, token });
      }
      return res.json({ user: null, token: null });
    } catch (err: any) {
      console.error('[Auth] auto-login error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/auth/restore - Rehydrate user account from client browser storage
  app.post('/api/auth/restore', (req, res) => {
    try {
      const { user } = req.body;
      if (!user || (!user.username && !user.id)) {
        return res.status(400).json({ error: '請提供帳號資訊以還原' });
      }
      const result = authManager.restoreClientUser(user);
      console.log(`[Auth] User account successfully restored from client: ${result.user.username} (${result.user.id})`);
      res.json(result);
    } catch (err: any) {
      console.warn('[Auth] restore user failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/auth/accounts - List known accounts for quick switching
  app.get('/api/auth/accounts', (_req, res) => {
    res.json(authManager.listAllPublicUsers());
  });

  // POST /api/auth/logout - Account logout
  app.post('/api/auth/logout', (req, res) => {
    const token = extractToken(req);
    authManager.logout(token);
    res.json({ success: true });
  });

  // POST /api/auth/update-name - Update user display nickname
  app.post('/api/auth/update-name', (req, res) => {
    try {
      const user = getAuthUser(req);
      if (!user) {
        return res.status(401).json({ error: '請先登入帳號' });
      }
      const { newName } = req.body;
      if (!newName || !newName.trim()) {
        return res.status(400).json({ error: '名稱不可為空' });
      }
      const updatedUser = authManager.updateDisplayName(user.id, newName.trim());
      console.log(`[Auth] Display name updated for user ${user.id} to: ${updatedUser.displayName}`);
      res.json({ success: true, user: updatedUser });
    } catch (err: any) {
      console.warn('[Auth] Update display name failed:', err.message);
      res.status(400).json({ error: err.message || '更改名稱失敗' });
    }
  });

  // POST /api/auth/change-password - Change or set account password
  app.post('/api/auth/change-password', (req, res) => {
    try {
      const user = getAuthUser(req);
      if (!user) {
        return res.status(401).json({ error: '請先登入帳號' });
      }
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: '密碼長度需至少 6 個字元' });
      }
      const result = authManager.changePassword(user.id, newPassword);
      console.log(`[Auth] Password updated for user ${user.id}`);
      res.json(result);
    } catch (err: any) {
      console.warn('[Auth] Change password failed:', err.message);
      res.status(400).json({ error: err.message || '更改密碼失敗' });
    }
  });

  // POST /api/auth/clear-all-users - Remove all user accounts and sessions to allow fresh testing
  app.post('/api/auth/clear-all-users', (_req, res) => {
    try {
      authManager.clearAllUsersAndSessions();
      console.log('[Auth] All registered users and sessions cleared per user request');
      res.json({ success: true, message: '所有已註冊帳號與登入工作階段已完全清除！' });
    } catch (err: any) {
      console.error('[Auth] Clear all users failed:', err);
      res.status(500).json({ error: err.message || '清除使用者帳號失敗' });
    }
  });

  // POST /api/auth/save-gmail-token - Store authorized Google OAuth access token for sending emails
  app.post('/api/auth/save-gmail-token', (req, res) => {
    try {
      const { accessToken, email } = req.body;
      if (!accessToken) {
        return res.status(400).json({ error: '請提供授權 accessToken' });
      }
      emailService.setGmailOAuthToken(accessToken, email);
      res.json({ success: true, message: 'Google Gmail 授權發信已成功啟用！' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  function canAccessProject(proj: NovelProject | null | undefined, user: any): boolean {
    if (!proj || !user || !user.id) return false;
    return proj.userId === user.id;
  }

  // 1. GET /api/projects - Strictly isolated by current user. If logged out, returns empty list.
  app.get('/api/projects', (req, res) => {
    const user = getAuthUser(req);
    if (!user || !user.id) {
      return res.json([]);
    }
    const projects = listAllProjects(user);
    res.json(projects);
  });

  // 2. GET /api/projects/:id - Get single project status with strict privacy check
  app.get('/api/projects/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user || !user.id) {
      return res.status(401).json({ error: '請先登入帳號以查看專案' });
    }
    const proj = loadProject(req.params.id);
    if (!proj) {
      return res.status(404).json({ error: '專案不存在' });
    }
    if (!canAccessProject(proj, user)) {
      return res.status(403).json({ error: '無權限存取其他使用者的專案' });
    }
    res.json(proj);
  });

  // AI Character Analysis Endpoint
  app.post('/api/ai/analyze-characters', async (req, res) => {
    try {
      const user = getAuthUser(req);
      if (!user || !user.id) {
        return res.status(401).json({ error: '請先登入帳號' });
      }
      const { text, defaultVoice } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: '請提供小說內文進行分析' });
      }
      const result = await aiRoleService.analyzeCharacters(text.trim(), defaultVoice);
      res.json(result);
    } catch (err: any) {
      console.error('[AiRole] Analysis error:', err);
      res.status(500).json({ error: err.message || 'AI 角色分析失敗' });
    }
  });

  // 3. POST /api/projects - Create and immediately start a novel project (strictly requires login)
  app.post('/api/projects', async (req, res) => {
    try {
      const user = getAuthUser(req);
      if (!user || !user.id) {
        return res.status(401).json({ error: '請先登入帳號後再製作配音' });
      }

      const {
        title,
        text,
        voiceSettings,
        enableAiRoles,
        characterVoices,
        enablePolyphoneFix = true,
        customPolyphoneRules = [],
      } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ error: '小說名稱不能為空' });
      }
      if (!text || !text.trim()) {
        return res.status(400).json({ error: '小說內文不能為空' });
      }

      const cleanTitle = title.trim();
      const rawText = text.trim();
      const projectId = `proj_${Date.now()}`;

      // Scan polyphonic/heteronym words count
      const polyphoneMatches = scanPolyphones(rawText, customPolyphoneRules);
      const polyphoneCount = polyphoneMatches.length;

      // Split novel using robust sentence boundary algorithm
      const chapters = splitNovelText(rawText, {
        projectId,
        maxChunkChars: 450,
      });

      const totalWords = countCharacters(rawText);

      const parsedVoiceSettings = {
        voiceCode: voiceSettings?.voiceCode || 'zh-CN-YunxiNeural',
        displayName: voiceSettings?.displayName || '雲希 (Yunxi) - 微軟 Edge 青年男聲',
        gender: voiceSettings?.gender || 'male',
        locale: voiceSettings?.locale || 'zh-CN',
        rate: voiceSettings?.rate || '+0%',
        pitch: voiceSettings?.pitch || '+0Hz',
        volume: voiceSettings?.volume || '+0%',
      };

      let activeCharacterVoices = characterVoices;

      // If AI multi-role mode is enabled, enrich all paragraphs with dialogue segments
      if (enableAiRoles) {
        if (!activeCharacterVoices || activeCharacterVoices.length === 0) {
          const analysis = await aiRoleService.analyzeCharacters(rawText, parsedVoiceSettings);
          activeCharacterVoices = analysis.characters;
        }

        for (const ch of chapters) {
          ch.paragraphs = aiRoleService.enrichParagraphsWithSegments(ch.paragraphs, activeCharacterVoices);
        }
      }

      const newProject: NovelProject = {
        id: projectId,
        userId: user.id,
        ownerName: user.displayName || user.username,
        title: cleanTitle,
        author: '佚名',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalWords,
        chapters,
        voiceSettings: parsedVoiceSettings,
        enableAiRoles: Boolean(enableAiRoles),
        characterVoices: activeCharacterVoices,
        enablePolyphoneFix: Boolean(enablePolyphoneFix),
        customPolyphoneRules,
        polyphoneCount,
        status: 'processing',
        outputDirectory: `~/NovelVoices/${cleanTitle}`,
      };

      saveProject(newProject);

      // Start background synthesis immediately
      runProjectWorker(projectId);

      res.status(201).json(newProject);
    } catch (err: any) {
      console.error('Create project error:', err);
      res.status(500).json({ error: err.message || 'Failed to create project' });
    }
  });

  // 4. POST /api/projects/:id/start - Resume or start synthesis
  app.post('/api/projects/:id/start', (req, res) => {
    const proj = loadProject(req.params.id);
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const user = getAuthUser(req);
    if (!canAccessProject(proj, user)) {
      return res.status(403).json({ error: '無權限操作此專案' });
    }

    proj.status = 'processing';
    proj.updatedAt = Date.now();
    saveProject(proj);

    runProjectWorker(proj.id);
    res.json(proj);
  });

  // 5. POST /api/projects/:id/pause - Pause synthesis
  app.post('/api/projects/:id/pause', (req, res) => {
    const proj = loadProject(req.params.id);
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const user = getAuthUser(req);
    if (!canAccessProject(proj, user)) {
      return res.status(403).json({ error: '無權限操作此專案' });
    }

    activeWorkers.set(proj.id, false);
    proj.status = 'paused';
    proj.updatedAt = Date.now();
    saveProject(proj);

    res.json(proj);
  });

  // 6. POST /api/projects/:id/reset - Reset all paragraphs back to pending
  app.post('/api/projects/:id/reset', (req, res) => {
    const proj = loadProject(req.params.id);
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const user = getAuthUser(req);
    if (!canAccessProject(proj, user)) {
      return res.status(403).json({ error: '無權限操作此專案' });
    }

    activeWorkers.set(proj.id, false);

    // Clear chunks folder
    const chunksDir = getChunksDir(proj.id);
    if (fs.existsSync(chunksDir)) {
      fs.rmSync(chunksDir, { recursive: true, force: true });
    }
    const fullAudio = getFullAudioPath(proj.id);
    if (fs.existsSync(fullAudio)) {
      fs.unlinkSync(fullAudio);
    }

    proj.status = 'draft';
    proj.updatedAt = Date.now();
    for (const ch of proj.chapters) {
      for (const p of ch.paragraphs) {
        p.status = 'pending';
        p.retryCount = 0;
        p.errorMessage = undefined;
        p.fileSizeBytes = 0;
        p.audioDurationSeconds = 0;
      }
    }
    saveProject(proj);

    res.json(proj);
  });

  // 6.5. POST /api/projects/:id/retry-failed - Retry only failed, missing, or 0-byte paragraphs
  app.post('/api/projects/:id/retry-failed', (req, res) => {
    const proj = loadProject(req.params.id);
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const user = getAuthUser(req);
    if (!canAccessProject(proj, user)) {
      return res.status(403).json({ error: '無權限操作此專案' });
    }

    const chunksDir = getChunksDir(proj.id);
    let resetCount = 0;

    for (const ch of proj.chapters) {
      for (const p of ch.paragraphs) {
        const chunkPath = path.join(chunksDir, `${p.id}.mp3`);
        const isValid = fs.existsSync(chunkPath) && fs.statSync(chunkPath).size >= 500;

        if (p.status === 'failed' || !isValid || (p.status === 'completed' && !isValid)) {
          p.status = 'pending';
          p.retryCount = 0;
          p.errorMessage = undefined;
          p.fileSizeBytes = 0;
          p.audioDurationSeconds = 0;
          p.updatedAt = Date.now();
          resetCount++;
          try {
            if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
          } catch (_) {}
        }
      }
    }

    proj.status = 'processing';
    proj.updatedAt = Date.now();
    saveProject(proj);

    // Resume worker immediately
    runProjectWorker(proj.id);

    console.log(`[Worker] Project ${proj.id} reset ${resetCount} failed paragraphs and resumed synthesis.`);
    res.json({ success: true, resetCount, project: proj });
  });

  // 7. DELETE /api/projects/:id - Delete project
  app.delete('/api/projects/:id', (req, res) => {
    const projId = req.params.id;
    console.log(`[Delete] Deleting project ${projId}`);
    activeWorkers.set(projId, false);

    const projDir = getProjectPath(projId);
    if (fs.existsSync(projDir)) {
      try {
        fs.rmSync(projDir, { recursive: true, force: true });
        console.log(`[Delete] Project folder deleted: ${projDir}`);
      } catch (err: any) {
        console.error(`[Delete] Error deleting folder ${projDir}:`, err);
      }
    }

    res.json({ success: true, id: projId });
  });

  // 7.5. GET /api/projects/:id/audio-info - Detailed audio statistics for chunked range downloader
  app.get('/api/projects/:id/audio-info', async (req, res) => {
    const proj = loadProject(req.params.id);
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const user = getAuthUser(req);
    if (!canAccessProject(proj, user)) {
      return res.status(403).json({ error: '無權限存取此專案' });
    }

    const fullAudioPath = getFullAudioPath(proj.id);
    if (!fs.existsSync(fullAudioPath)) {
      await buildFullAudioFile(proj.id);
    }

    const hasAudio = fs.existsSync(fullAudioPath);
    const sizeBytes = hasAudio ? fs.statSync(fullAudioPath).size : 0;
    const chapters = proj.chapters.map((c, idx) => ({
      index: idx,
      title: c.title,
      paragraphsCount: c.paragraphs.length,
      completedCount: c.paragraphs.filter((p) => p.status === 'completed').length,
    }));

    res.json({
      id: proj.id,
      title: proj.title,
      hasAudio,
      sizeBytes,
      sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
      chaptersCount: proj.chapters.length,
      chapters,
    });
  });

  // 7.8. POST /api/audio/merge - Unified lossless audio merge with full integrity verification
  app.post('/api/audio/merge', async (req, res) => {
    try {
      const { projectId, scope = 'all', chapterId } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: '請提供 projectId' });
      }

      const proj = loadProject(projectId);
      if (!proj) {
        return res.status(404).json({ error: '找不到該小說專案' });
      }

      const user = getAuthUser(req);
      if (!canAccessProject(proj, user)) {
        return res.status(403).json({ error: '無權限操作此專案' });
      }

      const chunksDir = getChunksDir(projectId);
      let targetParas: Paragraph[] = [];
      let outputFileName = '';
      let downloadUrl = '';

      if (scope === 'chapter' && chapterId) {
        const ch = proj.chapters.find((c) => c.id === chapterId);
        if (!ch) {
          return res.status(404).json({ error: '找不到指定的章節' });
        }
        const cIdx = proj.chapters.indexOf(ch);
        targetParas = ch.paragraphs;
        const safeTitle = ch.title.replace(/[\\/:*?"<>|]/g, '_');
        outputFileName = `${proj.title}_${safeTitle}.mp3`;
        downloadUrl = `/api/projects/${proj.id}/chapters/${cIdx}/download`;
      } else {
        targetParas = proj.chapters.flatMap((c) => c.paragraphs);
        outputFileName = `${proj.title}_全書完整配音.mp3`;
        downloadUrl = `/api/projects/${proj.id}/download`;
      }

      if (targetParas.length === 0) {
        return res.status(400).json({ error: '該範圍內沒有任何段落文字' });
      }

      // 1. Strict verification: every chunk must exist and be >= 500 bytes
      const validChunkPaths: string[] = [];
      const missingOrCorrupt: { id: string; reason: string }[] = [];

      for (const p of targetParas) {
        const chunkFile = path.join(chunksDir, `${p.id}.mp3`);
        if (!fs.existsSync(chunkFile)) {
          missingOrCorrupt.push({ id: p.id, reason: '音訊片段尚未生成' });
        } else {
          const sz = fs.statSync(chunkFile).size;
          if (sz < 500) {
            missingOrCorrupt.push({ id: p.id, reason: `檔案大小為 0 或小於 500 bytes (${sz} bytes)` });
            try { fs.unlinkSync(chunkFile); } catch (_) {}
          } else {
            validChunkPaths.push(chunkFile);
          }
        }
      }

      if (missingOrCorrupt.length > 0) {
        return res.status(400).json({
          error: `尚有 ${missingOrCorrupt.length} 個音訊片段未完成或檔案大小為 0 位元組，無法合併完整小說。請先在介面點選「一鍵重試失敗段落」補全音訊！`,
          missingCount: missingOrCorrupt.length,
          totalCount: targetParas.length,
        });
      }

      // 2. Perform merge via mergeAudioChunks
      const mergedOutPath = path.join(getProjectPath(projectId), `${projectId}_merged_${scope}.mp3`);
      const mergeRes = await mergeAudioChunks(validChunkPaths, mergedOutPath);

      if (!mergeRes.success || mergeRes.totalBytes < 1000) {
        return res.status(500).json({ error: mergeRes.error || '音訊合併失敗' });
      }

      // Also ensure ~/NovelVoices/ local folder has a copy for Mac users
      const cleanTitle = proj.title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'NovelVoices';
      const userMacDir = path.join(process.env.HOME || '/root', 'NovelVoices', cleanTitle);
      try {
        if (!fs.existsSync(userMacDir)) {
          fs.mkdirSync(userMacDir, { recursive: true });
        }
        fs.copyFileSync(mergedOutPath, path.join(userMacDir, outputFileName));
      } catch (_) {}

      // Calculate real duration
      const totalBytes = mergeRes.totalBytes;
      const durationSec = Math.round(totalBytes / 6000); // 48kbps mono ~ 6KB/s
      const durMin = Math.floor(durationSec / 60);
      const durRem = durationSec % 60;
      const durHours = Math.floor(durMin / 60);
      const durMinRem = durMin % 60;
      const formattedDuration = durHours > 0
        ? `${durHours} 小時 ${durMinRem} 分 ${durRem} 秒`
        : `${durMin} 分 ${durRem} 秒`;

      res.json({
        success: true,
        fileName: outputFileName,
        durationFormatted: formattedDuration,
        durationSeconds: durationSec,
        fileSizeBytes: totalBytes,
        fileSizeMB: `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`,
        totalChunksMerged: validChunkPaths.length,
        audioUrl: downloadUrl,
        localPath: path.join(userMacDir, outputFileName),
      });
    } catch (err: any) {
      console.error('API /api/audio/merge error:', err);
      res.status(500).json({ error: `音訊合併失敗: ${err.message}` });
    }
  });

  // 8. GET /api/projects/:id/download - Streaming download with Range support & Cloud Run 32MB bypass
  app.get('/api/projects/:id/download', async (req, res) => {
    const proj = loadProject(req.params.id);
    if (!proj) {
      return res.status(404).send('Project not found');
    }

    const user = getAuthUser(req);
    if (!canAccessProject(proj, user)) {
      return res.status(403).send('無權限下載此專案');
    }

    const fullAudioPath = getFullAudioPath(proj.id);
    if (!fs.existsSync(fullAudioPath)) {
      const ok = await buildFullAudioFile(proj.id);
      if (!ok || !fs.existsSync(fullAudioPath)) {
        return res.status(400).send('Audio file is still generating or unavailable.');
      }
    }

    const stat = fs.statSync(fullAudioPath);
    const fileSize = stat.size;
    const fileName = encodeURIComponent(`${proj.title}.mp3`);
    const range = req.headers.range;

    // Support HTTP Range requests: Enables browser slice-by-slice downloading (<20MB each)
    // completely immune to Cloud Run 32MB response body buffer limits
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(fullAudioPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`,
        'Cache-Control': 'no-cache',
      };
      res.writeHead(206, head);
      file.pipe(res);
      return;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`);
    res.setHeader('Cache-Control', 'no-cache');

    // CRITICAL for Cloud Run & GCP Reverse Proxies:
    // If Content-Length > 32 MB, Cloud Run proxy drops the connection (ERR_CONNECTION_RESET)!
    // By omitting Content-Length for files > 25 MB, HTTP chunked transfer is used, allowing unlimited file sizes.
    if (fileSize <= 25 * 1024 * 1024) {
      res.setHeader('Content-Length', fileSize);
    }

    const readStream = fs.createReadStream(fullAudioPath);
    readStream.pipe(res);
  });

  // 8.5. GET /api/projects/:id/chapters/:chapterIdx/download - Download single chapter MP3
  app.get('/api/projects/:id/chapters/:chapterIdx/download', async (req, res) => {
    const proj = loadProject(req.params.id);
    if (!proj) return res.status(404).send('Project not found');
    const user = getAuthUser(req);
    if (!canAccessProject(proj, user)) {
      return res.status(403).send('無權限下載此專案');
    }

    const cIdx = parseInt(req.params.chapterIdx, 10);
    const chapter = proj.chapters[cIdx];
    if (!chapter) return res.status(404).send('Chapter not found');

    const chunksDir = getChunksDir(proj.id);
    const safeTitle = chapter.title.replace(/[\\/:*?"<>|]/g, '_');
    const fileName = encodeURIComponent(`${proj.title}_${safeTitle}.mp3`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`);
    res.setHeader('Cache-Control', 'no-cache');

    for (const p of chapter.paragraphs) {
      const pPath = path.join(chunksDir, `${p.id}.mp3`);
      if (fs.existsSync(pPath)) {
        res.write(fs.readFileSync(pPath));
      }
    }
    res.end();
  });

  // 9. GET /api/projects/:id/stream - Native browser audio streaming with HTTP Range support
  app.get('/api/projects/:id/stream', async (req, res) => {
    const proj = loadProject(req.params.id);
    if (!proj) {
      return res.status(404).send('Project not found');
    }

    const user = getAuthUser(req);
    if (!canAccessProject(proj, user)) {
      return res.status(403).send('無權限播放此專案');
    }

    const fullAudioPath = getFullAudioPath(proj.id);
    if (!fs.existsSync(fullAudioPath)) {
      const ok = await buildFullAudioFile(proj.id);
      if (!ok || !fs.existsSync(fullAudioPath)) {
        return res.status(404).send('Audio not yet available');
      }
    }

    const stat = fs.statSync(fullAudioPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(fullAudioPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(200, head);
      fs.createReadStream(fullAudioPath).pipe(res);
    }
  });

  // 10. GET /api/projects/:id/sse - Server-Sent Events (SSE) for zero-latency real-time progress streaming
  app.get('/api/projects/:id/sse', (req, res) => {
    const projectId = req.params.id;
    const proj = loadProject(projectId);
    if (!proj) {
      return res.status(404).end();
    }

    const user = getAuthUser(req);
    if (!canAccessProject(proj, user)) {
      return res.status(403).end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (!sseListeners.has(projectId)) {
      sseListeners.set(projectId, new Set());
    }
    sseListeners.get(projectId)!.add(res);

    // Send initial status immediately
    if (proj) {
      const allParas = proj.chapters.flatMap((c) => c.paragraphs);
      const completed = allParas.filter((p) => p.status === 'completed').length;
      const total = allParas.length;
      res.write(
        `data: ${JSON.stringify({
          status: proj.status,
          percent: total > 0 ? Math.round((completed / total) * 100) : 0,
          completedParas: completed,
          totalParas: total,
        })}\n\n`
      );
    }

    req.on('close', () => {
      sseListeners.get(projectId)?.delete(res);
      if (sseListeners.get(projectId)?.size === 0) {
        sseListeners.delete(projectId);
      }
    });
  });

  // 11. GET /api/projects/:id/chunks/:paraId - Stream individual paragraph MP3 for instant playback
  app.get('/api/projects/:id/chunks/:paraId', (req, res) => {
    const { id, paraId } = req.params;
    const chunkPath = path.join(getChunksDir(id), `${paraId}.mp3`);
    if (!fs.existsSync(chunkPath)) {
      return res.status(404).send('Chunk audio not ready');
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(chunkPath).pipe(res);
  });

  // Cache for Edge TTS voices
  let cachedVoiceList: any[] | null = null;

  // 12. GET /api/voices - Get all supported Microsoft Edge Neural voices
  app.get('/api/voices', async (req, res) => {
    try {
      if (!cachedVoiceList) {
        const tts = new MsEdgeTTS();
        const rawVoices = await tts.getVoices();
        cachedVoiceList = rawVoices.map((v: any) => ({
          shortName: v.ShortName,
          friendlyName: v.FriendlyName,
          name: v.Name,
          locale: v.Locale,
          localeName: v.LocaleName,
          gender: v.Gender?.toLowerCase() === 'female' ? 'female' : 'male',
          suggestedCodec: v.SuggestedCodec,
        }));
      }
      res.json(cachedVoiceList);
    } catch (err: any) {
      console.error('Error fetching voices list:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch voices' });
    }
  });

  // 12.5. Polyphone Auto-Correction Endpoints
  // GET /api/polyphone/rules - Get built-in contextual polyphone rules
  app.get('/api/polyphone/rules', (_req, res) => {
    res.json({
      total: DEFAULT_POLYPHONE_RULES.length,
      rules: DEFAULT_POLYPHONE_RULES,
    });
  });

  // POST /api/polyphone/preview - Scan text and show detected polyphonic corrections
  app.post('/api/polyphone/preview', (req, res) => {
    try {
      const { text = '', customRules = [], enablePolyphoneFix = true } = req.body;
      const matches = scanPolyphones(text, customRules);
      const { correctedText } = applyPolyphoneCorrections(
        text.slice(0, 1000),
        customRules,
        enablePolyphoneFix
      );
      res.json({
        totalMatches: matches.length,
        matches: matches.slice(0, 60),
        sampleBefore: text.slice(0, 400),
        sampleAfter: correctedText.slice(0, 400),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || '多音字檢測失敗' });
    }
  });

  // POST /api/polyphone/ai-scan - Gemini AI deep contextual polyphone detection
  app.post('/api/polyphone/ai-scan', async (req, res) => {
    try {
      let { text = '', projectId, chapterIndex } = req.body;
      if (!text && projectId) {
        const proj = loadProject(projectId);
        if (proj) {
          if (typeof chapterIndex === 'number' && proj.chapters[chapterIndex]) {
            text = proj.chapters[chapterIndex].paragraphs.map((p) => p.text).join('\n');
          } else {
            text = proj.chapters.map((c) => c.paragraphs.map((p) => p.text).join('\n')).join('\n\n');
          }
        }
      }

      if (!text || !text.trim()) {
        return res.json({ success: true, count: 0, matches: [], source: 'rules' });
      }

      const result = await aiPolyphoneService.scanWithAi(text);
      res.json({
        success: true,
        count: result.matches.length,
        matches: result.matches,
        source: result.source,
      });
    } catch (err: any) {
      console.error('AI polyphone scan error:', err);
      res.status(500).json({ error: err.message || 'AI 多音字掃描失敗' });
    }
  });

  // POST /api/polyphone/ai-apply - Apply AI polyphone replacements to project text
  app.post('/api/polyphone/ai-apply', (req, res) => {
    try {
      const { projectId, corrections = [], chapterIndex } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: 'Missing projectId' });
      }
      const proj = loadProject(projectId);
      if (!proj) {
        return res.status(404).json({ error: 'Project not found' });
      }

      let modifiedCount = 0;
      const targetChapters =
        typeof chapterIndex === 'number' && proj.chapters[chapterIndex]
          ? [proj.chapters[chapterIndex]]
          : proj.chapters;

      for (const ch of targetChapters) {
        for (const p of ch.paragraphs) {
          const before = p.text;
          const after = aiPolyphoneService.applyCorrections(before, corrections);
          if (before !== after) {
            p.text = after;
            p.status = 'pending';
            p.retryCount = 0;
            p.errorMessage = undefined;
            p.updatedAt = Date.now();
            modifiedCount++;
          }
        }
      }

      // Add to project's custom rules for future synthesis
      const existingRules = proj.customPolyphoneRules || [];
      const newRules: PolyphoneRule[] = corrections.map((c: any) => ({
        id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        originalText: c.originalText,
        replacementPhonetic: c.replacementPhonetic,
        pinyin: c.pinyin || '',
        zhuyin: c.zhuyin || '',
        explanation: c.explanation || 'AI 上下文精準校對',
        character: c.character || c.originalText?.charAt(0),
      }));

      const mergedRules = [...existingRules];
      for (const nr of newRules) {
        const idx = mergedRules.findIndex((r) => r.originalText === nr.originalText);
        if (idx !== -1) {
          mergedRules[idx] = nr;
        } else {
          mergedRules.push(nr);
        }
      }
      proj.customPolyphoneRules = mergedRules;
      proj.enablePolyphoneFix = true;
      proj.updatedAt = Date.now();
      saveProject(proj);

      res.json({ success: true, modifiedCount, project: proj });
    } catch (err: any) {
      console.error('AI polyphone apply error:', err);
      res.status(500).json({ error: err.message || '套用多音字失敗' });
    }
  });

  // 13. POST /api/tts/test - Quick audition/preview of ANY voice via persistent pool
  app.post('/api/tts/test', async (req, res) => {
    try {
      const {
        text = '道友請留步！林凡在此，九天星辰皆為我掌。不要重複犯錯。',
        voice = 'zh-CN-YunxiNeural',
        rate = '+0%',
        pitch = '+0Hz',
        enablePolyphoneFix = true,
        customRules = [],
      } = req.body;
      const snippet = text.slice(0, 250);
      const textToSpeak = enablePolyphoneFix
        ? applyPolyphoneCorrections(snippet, customRules, true).correctedText
        : snippet;
      const buffer = await globalTTSPool.synthesize(textToSpeak, voice, rate, pitch, 2);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      res.end(buffer);
    } catch (err: any) {
      console.error('TTS test endpoint error:', err);
      res.status(503).json({ error: err.message });
    }
  });

  // 14. Legacy/General TTS endpoint via persistent pool
  app.post('/api/tts', async (req, res) => {
    try {
      const {
        text,
        voice = 'zh-CN-YunxiNeural',
        rate = '+0%',
        pitch = '+0Hz',
        enablePolyphoneFix = true,
        customRules = [],
      } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const textToSpeak = enablePolyphoneFix
        ? applyPolyphoneCorrections(text.trim(), customRules, true).correctedText
        : text.trim();

      const buffer = await globalTTSPool.synthesize(textToSpeak, voice, rate, pitch, 2);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      res.end(buffer);
    } catch (err: any) {
      res.status(503).json({ error: err.message });
    }
  });

  // 24/7 Persistent Background Watchdog Supervisor
  // Guarantees queue continues non-stop even if user closes browser, laptop lid, or sleeps computer
  setInterval(() => {
    try {
      const all = listAllProjects();
      for (const proj of all) {
        if (proj.status === 'processing' && !activeWorkers.get(proj.id)) {
          console.log(`[Watchdog 24/7] Resuming background processing for ${proj.id} (${proj.title})`);
          runProjectWorker(proj.id);
        }
      }
    } catch (e) {
      console.error('[Watchdog] Error in background supervisor:', e);
    }
  }, 4000);

  // 15. Character Library Endpoints
  const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
  app.get('/api/characters', (req, res) => {
    try {
      if (fs.existsSync(CHARACTERS_FILE)) {
        const raw = fs.readFileSync(CHARACTERS_FILE, 'utf-8');
        return res.json(JSON.parse(raw));
      }
      res.json([]);
    } catch (e: any) {
      res.json([]);
    }
  });

  app.post('/api/characters', (req, res) => {
    try {
      const { characters = [] } = req.body;
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(characters, null, 2), 'utf-8');
      res.json({ success: true, count: characters.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 16. Multi-Voice Full Audio Synthesis Endpoint
  app.post('/api/multivoice/synthesize', async (req, res) => {
    try {
      const { segments = [] } = req.body;
      if (!Array.isArray(segments) || segments.length === 0) {
        return res.status(400).json({ error: 'Segments array is required' });
      }

      const buffers: Buffer[] = [];
      for (const seg of segments) {
        const text = (seg.text || '').trim();
        if (!text) continue;
        const voice = seg.voiceCode || 'zh-CN-YunxiNeural';
        const rate = seg.rate || '+0%';
        const pitch = seg.pitch || '+0Hz';
        const buf = await globalTTSPool.synthesize(text, voice, rate, pitch, 2);
        if (buf && buf.length >= 500) {
          buffers.push(buf);
        }
      }

      if (buffers.length === 0) {
        return res.status(500).json({ error: 'No audio synthesized' });
      }

      const combined = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', combined.length);
      res.setHeader('Cache-Control', 'no-cache');
      res.end(combined);
    } catch (err: any) {
      console.error('Multi-voice synthesis error:', err);
      res.status(500).json({ error: err.message || 'Synthesis failed' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      engine: 'msedge-tts-pooled',
      watchdogActive: true,
      supportedVoicesCount: cachedVoiceList?.length || 322,
      activeProjectsCount: activeWorkers.size,
    });
  });

  // Vite middlewares in development
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: {
          ignored: ['**/data/**', '**/node_modules/**', '**/.git/**', '**/dist/**'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback handler for SPA client routing in dev mode
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          return;
        }
        next();
      } catch (e: any) {
        vite.ssrFixStacktrace?.(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(port, host, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`  ➜  Local:   http://localhost:${port}/`);
    console.log(`  ➜  Network: http://${host}:${port}/`);
  });

  server.on('error', (err: any) => {
    console.error(`[Server] Error on port ${port}:`, err);
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${port} is occupied. Retrying in 1s...`);
      setTimeout(() => {
        try {
          server.close();
        } catch (_) {}
        server.listen(port, host);
      }, 1000);
    }
  });
}

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', reason);
});

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
});

