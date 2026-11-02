/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client if credentials exist
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redisClient =
  upstashUrl && upstashToken
    ? new Redis({ url: upstashUrl, token: upstashToken })
    : null;

// In-memory fallback if Upstash Redis credentials not configured yet in local env
const memoryStore = new Map<string, { code: string; expiresAt: number }>();
const cooldownStore = new Map<string, number>();

export async function sendOtp(email: string): Promise<{
  success: boolean;
  message: string;
  cooldownSeconds: number;
}> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('請輸入格式正確的電子郵件地址');
  }

  const otpKey = `otp:${cleanEmail}`;
  const cooldownKey = `cooldown:${cleanEmail}`;

  // 1. Check Cooldown (60 seconds)
  if (redisClient) {
    const isCoolingDown = await redisClient.get(cooldownKey);
    if (isCoolingDown) {
      const ttl = await redisClient.ttl(cooldownKey);
      throw new Error(`發送太過頻繁，請等待 ${ttl > 0 ? ttl : 60} 秒後再試`);
    }
  } else {
    const nextAllowed = cooldownStore.get(cleanEmail) || 0;
    if (Date.now() < nextAllowed) {
      const remaining = Math.ceil((nextAllowed - Date.now()) / 1000);
      throw new Error(`發送太過頻繁，請等待 ${remaining} 秒後再試`);
    }
  }

  // 2. Generate 6-digit random numeric code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Save to Redis with 10-minute (600s) TTL
  if (redisClient) {
    await redisClient.set(otpKey, code, { ex: 600 });
    await redisClient.set(cooldownKey, '1', { ex: 60 });
  } else {
    memoryStore.set(cleanEmail, { code, expiresAt: Date.now() + 600 * 1000 });
    cooldownStore.set(cleanEmail, Date.now() + 60 * 1000);
  }

  // 4. Send HTML Email via Resend REST API (using native fetch, zero external dependency issues)
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #c9d1d9; margin: 0; padding: 24px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 32px 24px;">
        <div style="font-size: 18px; font-weight: bold; color: #f0f6fc; margin-bottom: 16px;">安全驗證碼</div>
        <p style="font-size: 14px; line-height: 1.6; color: #8b949e;">您好，請使用下方的 6 位數安全驗證碼完成驗證：</p>
        <div style="text-align: center; margin: 24px 0; background-color: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 20px;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #58a6ff;">${code}</span>
        </div>
        <p style="font-size: 12px; color: #8b949e;">此驗證碼有效期限為 10 分鐘（600 秒）。若非您本人操作，請忽略此郵件。</p>
      </div>
    </body>
    </html>
  `.trim();

  if (resendApiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [cleanEmail],
        subject: `【安全驗證碼】您的 6 位數代碼是 ${code}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      let errDetail = res.statusText;
      try {
        const errJson = await res.json();
        errDetail = errJson.message || errJson.error || JSON.stringify(errJson);
      } catch (_) {
        errDetail = await res.text();
      }
      console.warn('[Resend] Send error:', errDetail);
      throw new Error(`Resend 郵件發送失敗: ${errDetail}`);
    }

    const data = await res.json();
    console.log(`[Resend] OTP email sent to ${cleanEmail}, id: ${data?.id}`);
    return {
      success: true,
      message: `驗證信已透過 Resend 成功送達「${cleanEmail}」，請至信箱查收！`,
      cooldownSeconds: 60,
    };
  }

  // If Resend API key is not yet configured in environment variables
  throw new Error(
    `系統尚未設定發信服務金鑰（RESEND_API_KEY）。請在 AI Studio 左下角 Secrets 面板新增「RESEND_API_KEY」（免費每日 100 封），方能將驗證信發送至「${cleanEmail}」。`
  );
}

export async function verifyOtp(
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').trim();

  if (!cleanEmail || !cleanCode) {
    throw new Error('請提供電子郵件與 6 位數驗證碼');
  }

  const otpKey = `otp:${cleanEmail}`;
  let storedCode: string | null = null;

  if (redisClient) {
    storedCode = await redisClient.get<string>(otpKey);
  } else {
    const item = memoryStore.get(cleanEmail);
    if (item) {
      if (Date.now() > item.expiresAt) {
        memoryStore.delete(cleanEmail);
        storedCode = null;
      } else {
        storedCode = item.code;
      }
    }
  }

  if (!storedCode) {
    throw new Error('驗證碼已過期或不存在，請重新獲取');
  }

  if (storedCode !== cleanCode) {
    throw new Error('驗證碼不正確，請重新檢查信件內容');
  }

  // 一次性原則：比對成功後立刻刪除 Redis Key
  if (redisClient) {
    await redisClient.del(otpKey);
  } else {
    memoryStore.delete(cleanEmail);
  }

  return {
    success: true,
    message: '驗證成功！已依照一次性原則銷毀驗證碼。',
  };
}
