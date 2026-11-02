/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * High-Performance Microsoft Edge TTS Client with Sec-MS-GEC v2 Support
 * Solves the October 2026 Microsoft WebSocket handshake changes (Unexpected server response: 200).
 */

import WebSocket from 'ws';
import crypto from 'crypto';
import { execSync } from 'child_process';
import path from 'path';

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const SEC_MS_GEC_VERSION = `2-${CHROMIUM_FULL_VERSION}`;

let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Generates or retrieves a cached Sec-MS-GEC v2 token.
 * Valid for 4 minutes (Microsoft token window rounds to 5 minutes).
 */
export function getSecMsGecV2Token(): string {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  try {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'drm.py');
    const token = execSync(`python3 -c "import sys; sys.path.insert(0, 'scripts'); import drm; print(drm.generate_sec_ms_gec_v2())"`, {
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();

    if (token && token.includes('-')) {
      cachedToken = token;
      tokenExpiry = now + 240000; // 4 minutes
      return token;
    }
  } catch (err) {
    console.warn('[NativeEdgeTTS] Failed to compute v2 token via python drm.py, falling back to cached or emergency token:', err);
    if (cachedToken) return cachedToken;
  }

  // Fallback to static valid token if Python fails
  return '674A4BE99BFD07B5-66903F55EB0D41F968A3B3F5656D8E3D5BCA188377BB4CC82FEEADB31B4F04F4';
}

export interface NativeTTSOptions {
  voice?: string;
  rate?: string;
  pitch?: string;
  timeoutMs?: number;
}

/**
 * Synthesize text into MP3 Buffer using Microsoft Edge Speech Platform WebSocket.
 */
export async function synthesizeSpeech(
  text: string,
  options: NativeTTSOptions = {}
): Promise<Buffer> {
  const {
    voice = 'zh-CN-YunxiNeural',
    rate = '+0%',
    pitch = '+0Hz',
    timeoutMs = 15000,
  } = options;

  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error('Empty text cannot be synthesized');
  }

  return new Promise((resolve, reject) => {
    const token = getSecMsGecV2Token();
    const connectionId = crypto.randomUUID().replace(/-/g, '');
    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${token}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectionId}`;

    const ws = new WebSocket(url, {
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-WebSocket-Version': '13',
      },
    });

    const audioChunks: Buffer[] = [];
    let isFinished = false;

    const timer = setTimeout(() => {
      if (!isFinished) {
        try { ws.terminate(); } catch (_) {}
        reject(new Error(`Edge TTS timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    ws.on('open', () => {
      // 1. Send speech.config
      const speechConfig = JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataoptions: {
                sentenceBoundaryEnabled: 'false',
                wordBoundaryEnabled: 'true',
              },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
            },
          },
        },
      });
      ws.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${speechConfig}`);

      // 2. Escape XML and send SSML
      const escaped = trimmedText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      const requestId = crypto.randomBytes(16).toString('hex');
      const lang = voice.startsWith('zh-TW') ? 'zh-TW' : voice.startsWith('zh-HK') ? 'zh-HK' : 'zh-CN';
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}"><voice name="${voice}"><prosody rate="${rate}" pitch="${pitch}">${escaped}</prosody></voice></speak>`;

      ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
    });

    ws.on('message', (data: WebSocket.Data, isBinary: boolean) => {
      if (isBinary && Buffer.isBuffer(data)) {
        const sep = 'Path:audio\r\n';
        const idx = data.indexOf(sep);
        if (idx !== -1) {
          audioChunks.push(data.subarray(idx + sep.length));
        }
      } else {
        const message = data.toString();
        if (message.includes('Path:turn.end')) {
          isFinished = true;
          clearTimeout(timer);
          try { ws.close(); } catch (_) {}
          const fullAudio = Buffer.concat(audioChunks);
          if (fullAudio.length >= 200) {
            resolve(fullAudio);
          } else {
            reject(new Error(`Synthesized audio too small (${fullAudio.length} bytes)`));
          }
        }
      }
    });

    ws.on('error', (err: any) => {
      clearTimeout(timer);
      try { ws.terminate(); } catch (_) {}
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timer);
      if (!isFinished && audioChunks.length === 0) {
        reject(new Error('WebSocket closed before receiving audio data'));
      }
    });
  });
}
