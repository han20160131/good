/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

export interface SmtpConfig {
  provider: 'gmail' | 'smtp' | 'resend' | 'gmail_oauth';
  gmailOAuthToken?: string;
  gmailUser?: string;
  gmailAppPass?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  smtpSecure?: boolean;
  resendApiKey?: string;
  isConfigured?: boolean;
}

export interface MailboxMessage {
  id: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  code: string;
  sentAt: number;
  isExternal: boolean;
  provider: string;
  deliveryStatus: 'delivered_external' | 'saved_to_local_mailbox';
  errorDetails?: string;
}

export interface EmailSendResult {
  sentToExternalInbox: boolean;
  provider: 'smtp' | 'gmail' | 'resend' | 'local_mailbox' | 'none' | 'gmail_oauth';
  message: string;
  error?: string;
}

class EmailService {
  private configFile: string;
  private mailboxFile: string;
  private transporter: nodemailer.Transporter | null = null;
  private cachedConfig: SmtpConfig | null = null;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (_) {}
    }
    this.configFile = path.join(DATA_DIR, 'smtp-config.json');
    this.mailboxFile = path.join(DATA_DIR, 'local_mailbox.json');
    this.loadConfig();
  }

  /**
   * Load SMTP settings from disk or environment variables
   */
  public loadConfig(): SmtpConfig {
    let config: Partial<SmtpConfig> = {};
    try {
      if (fs.existsSync(this.configFile)) {
        const raw = fs.readFileSync(this.configFile, 'utf-8');
        if (raw.trim()) {
          config = JSON.parse(raw);
        }
      }
    } catch (e) {
      console.warn('[EmailService] Failed reading smtp-config.json:', e);
    }

    const gmailOAuthToken = config.gmailOAuthToken || this.runtimeGmailToken || process.env.GMAIL_OAUTH_TOKEN;
    const gmailUser = config.gmailUser || process.env.GMAIL_USER || process.env.EMAIL_USER;
    const gmailAppPass = config.gmailAppPass || process.env.GMAIL_APP_PASS || process.env.EMAIL_PASS;
    const smtpHost = config.smtpHost || process.env.SMTP_HOST;
    const smtpPort = config.smtpPort || parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = config.smtpUser || process.env.SMTP_USER;
    const smtpPass = config.smtpPass || process.env.SMTP_PASS;
    const smtpFrom = config.smtpFrom || process.env.SMTP_FROM || 'noreply@novelsound.ai';
    const smtpSecure = config.smtpSecure ?? (process.env.SMTP_SECURE === 'true' || smtpPort === 465);
    const resendApiKey = config.resendApiKey || process.env.RESEND_API_KEY;

    let provider: 'gmail' | 'smtp' | 'resend' | 'gmail_oauth' = config.provider || 'gmail';
    if (!config.provider) {
      if (gmailOAuthToken) provider = 'gmail_oauth';
      else if (gmailUser && gmailAppPass) provider = 'gmail';
      else if (smtpHost && smtpUser && smtpPass) provider = 'smtp';
      else if (resendApiKey) provider = 'resend';
    } else if (gmailOAuthToken && provider === 'gmail') {
      provider = 'gmail_oauth';
    }

    const isConfigured = Boolean(
      (gmailOAuthToken) ||
      (provider === 'gmail' && gmailUser && gmailAppPass) ||
      (provider === 'smtp' && smtpHost && smtpUser && smtpPass) ||
      (provider === 'resend' && resendApiKey)
    );

    this.cachedConfig = {
      provider,
      gmailOAuthToken,
      gmailUser,
      gmailAppPass,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      smtpSecure,
      resendApiKey,
      isConfigured,
    };

    return this.cachedConfig;
  }

  private runtimeGmailToken: string | null = null;

  public setGmailOAuthToken(token: string, email?: string): void {
    this.runtimeGmailToken = token;
    const update: Partial<SmtpConfig> = {
      provider: 'gmail_oauth',
      gmailOAuthToken: token,
    };
    if (email) {
      update.gmailUser = email;
    }
    this.saveConfig(update);
    console.log(`[EmailService] Google OAuth access token set for Gmail sending! (account: ${email || 'unknown'})`);
  }

  /**
   * Save SMTP config to disk
   */
  public saveConfig(newConfig: Partial<SmtpConfig>): SmtpConfig {
    const current = this.loadConfig();
    const merged: SmtpConfig = {
      ...current,
      ...newConfig,
      provider: newConfig.provider || current.provider || 'gmail',
    };

    // Recompute isConfigured
    merged.isConfigured = Boolean(
      (merged.provider === 'gmail' && merged.gmailUser && merged.gmailAppPass) ||
      (merged.provider === 'smtp' && merged.smtpHost && merged.smtpUser && merged.smtpPass) ||
      (merged.provider === 'resend' && merged.resendApiKey)
    );

    try {
      fs.writeFileSync(this.configFile, JSON.stringify(merged, null, 2), 'utf-8');
      console.log(`[EmailService] Saved SMTP configuration. Provider: ${merged.provider}, Configured: ${merged.isConfigured}`);
    } catch (e) {
      console.error('[EmailService] Error writing smtp-config.json:', e);
    }

    this.cachedConfig = merged;
    this.transporter = null; // Invalidate transporter to pick up new credentials
    return merged;
  }

  public isConfigured(): boolean {
    return Boolean(this.loadConfig().isConfigured);
  }

  /**
   * Get safe config representation for client UI (passwords masked)
   */
  public getClientSafeConfig(): Record<string, any> {
    const conf = this.loadConfig();
    return {
      provider: conf.provider,
      isConfigured: conf.isConfigured,
      gmailUser: conf.gmailUser || '',
      hasGmailAppPass: Boolean(conf.gmailAppPass),
      smtpHost: conf.smtpHost || '',
      smtpPort: conf.smtpPort || 587,
      smtpUser: conf.smtpUser || '',
      hasSmtpPass: Boolean(conf.smtpPass),
      smtpFrom: conf.smtpFrom || '',
      smtpSecure: conf.smtpSecure ?? false,
      hasResendApiKey: Boolean(conf.resendApiKey),
    };
  }

  /**
   * Initialize or retrieve Nodemailer Transporter
   */
  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const conf = this.loadConfig();
    if (!conf.isConfigured) return null;

    try {
      if (conf.provider === 'gmail' && conf.gmailUser && conf.gmailAppPass) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: conf.gmailUser,
            pass: conf.gmailAppPass.replace(/\s+/g, ''), // Strip whitespace in app password
          },
        });
        console.log(`[EmailService] Initialized Gmail Transporter for: ${conf.gmailUser}`);
        return this.transporter;
      }

      if (conf.provider === 'smtp' && conf.smtpHost && conf.smtpUser && conf.smtpPass) {
        this.transporter = nodemailer.createTransport({
          host: conf.smtpHost,
          port: conf.smtpPort || 587,
          secure: conf.smtpSecure ?? (conf.smtpPort === 465),
          auth: {
            user: conf.smtpUser,
            pass: conf.smtpPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
        console.log(`[EmailService] Initialized SMTP Transporter for: ${conf.smtpHost}:${conf.smtpPort}`);
        return this.transporter;
      }
    } catch (err) {
      console.warn('[EmailService] Failed creating nodemailer transporter:', err);
    }

    return null;
  }

  /**
   * Record message into local mailbox
   */
  private saveToLocalMailbox(msg: MailboxMessage): void {
    try {
      let list: MailboxMessage[] = [];
      if (fs.existsSync(this.mailboxFile)) {
        try {
          const raw = fs.readFileSync(this.mailboxFile, 'utf-8');
          if (raw.trim()) list = JSON.parse(raw);
        } catch (_) {}
      }

      // Add to front, keep last 100 messages
      list.unshift(msg);
      if (list.length > 100) {
        list = list.slice(0, 100);
      }

      fs.writeFileSync(this.mailboxFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[EmailService] Failed saving to local mailbox:', e);
    }
  }

  /**
   * Get messages from local mailbox
   */
  public getLocalMailbox(targetEmail?: string): MailboxMessage[] {
    try {
      if (!fs.existsSync(this.mailboxFile)) return [];
      const raw = fs.readFileSync(this.mailboxFile, 'utf-8');
      if (!raw.trim()) return [];
      const list: MailboxMessage[] = JSON.parse(raw);
      if (targetEmail) {
        const lower = targetEmail.trim().toLowerCase();
        return list.filter((m) => m.to.toLowerCase() === lower);
      }
      return list;
    } catch (e) {
      console.warn('[EmailService] Failed reading local mailbox:', e);
      return [];
    }
  }

  /**
   * Send test email to target recipient
   */
  public async sendTestEmail(targetEmail: string): Promise<{ success: boolean; message: string }> {
    const conf = this.loadConfig();
    if (!conf.isConfigured) {
      throw new Error('尚未完成發信伺服器設定，請先填寫 Gmail 帳密或 SMTP 伺服器資訊並儲存！');
    }

    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await this.sendVerificationEmail(targetEmail, testCode, 'register');
    if (result.sentToExternalInbox) {
      return {
        success: true,
        message: `測試郵件已成功發送至「${targetEmail}」，請至您的信箱查收！`,
      };
    } else {
      throw new Error(result.error || result.message || '測試郵件寄送失敗');
    }
  }

  /**
   * Send 6-digit verification code to recipient's email inbox
   */
  public async sendVerificationEmail(
    toEmail: string,
    code: string,
    purpose: 'register' | 'reset' = 'register'
  ): Promise<EmailSendResult> {
    const cleanToEmail = (toEmail || '').trim().toLowerCase();
    if (!cleanToEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanToEmail)) {
      throw new Error('請輸入格式正確的電子郵件地址（例如：ham0131@proton.me）');
    }

    const isRegister = purpose === 'register';
    const purposeText = isRegister ? '建立帳號' : '密碼重設';
    const subject = `【小說AI配音】您的${purposeText}安全驗證碼：${code}`;

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background-color: #111827; border: 1px solid #374151; border-radius: 12px; padding: 32px 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background-color: #f59e0b; color: #000; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
    p { font-size: 14px; line-height: 1.6; color: #9ca3af; margin: 0 0 20px 0; }
    .code-box { text-align: center; margin: 24px 0; background-color: #1f2937; border: 1px solid #d97706; border-radius: 10px; padding: 18px; }
    .code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #fbbf24; font-family: monospace; }
    .note { font-size: 12px; color: #9ca3af; margin-top: 18px; text-align: center; }
    .footer { font-size: 11px; color: #4b5563; text-align: center; margin-top: 28px; border-top: 1px solid #1f2937; padding-top: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">小說AI角色配音系統</div>
    <h1>${purposeText}安全驗證碼</h1>
    <p>您好，您正在進行「小說AI多角色配音系統」的${purposeText}流程。請在驗證碼輸入框中填入下方的 6 位數安全驗證碼：</p>
    <div class="code-box">
      <div class="code">${code}</div>
    </div>
    <div class="note">⚠️ 此驗證碼有效期限為 10 分鐘，請勿提供給任何人。若非您本人操作，請忽略此郵件。</div>
    <div class="footer">小說AI角色配音工作室 · 獨立運行版</div>
  </div>
</body>
</html>`.trim();

    const plainText = `【小說AI配音系統】您的${purposeText}安全驗證碼為：${code}（有效期限 10 分鐘）。`;

    const conf = this.loadConfig();
    const resendKey = conf.resendApiKey || process.env.RESEND_API_KEY;

    // 1. Primary Email Provider: Resend SDK (HTTP API, supports all email domains including Tuta, Proton, Gmail)
    if (resendKey) {
      const fromAddress = conf.smtpFrom || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [cleanToEmail],
            subject,
            html: htmlContent,
          }),
        });

        if (!response.ok) {
          let errDetail = response.statusText;
          try {
            const errJson = await response.json();
            errDetail = errJson.message || errJson.error || JSON.stringify(errJson);
          } catch (_) {
            errDetail = await response.text();
          }
          console.warn(`[EmailService] Resend API error (${response.status}):`, errDetail);
          throw new Error(`Resend 郵件服務發送失敗（HTTP ${response.status}）: ${errDetail}`);
        }

        const data = await response.json();
        if (!data || !data.id) {
          throw new Error('Resend 郵件服務未確認接收郵件，發送未完成');
        }

        console.log(`[EmailService] Resend successfully dispatched verification email to ${cleanToEmail}. Message ID: ${data.id}`);
        return {
          sentToExternalInbox: true,
          provider: 'resend',
          message: `驗證信已透過 Resend 成功送達「${cleanToEmail}」，請至信箱查收 6 位數安全驗證碼！`,
        };
      } catch (err: any) {
        throw new Error(err.message || 'Resend 郵件發送連線失敗');
      }
    }

    // 2. Secondary Email Provider: Standard SMTP Transporter (if configured)
    const transporter = this.getTransporter();
    if (transporter) {
      try {
        const fromAddress = conf.smtpFrom || conf.gmailUser || conf.smtpUser || 'noreply@novelsound.ai';
        const info = await transporter.sendMail({
          from: `"小說AI配音系統" <${fromAddress}>`,
          to: cleanToEmail,
          subject,
          text: plainText,
          html: htmlContent,
        });

        if (!info || !info.messageId) {
          throw new Error('SMTP 伺服器未回傳郵件識別碼');
        }

        console.log(`[EmailService] SMTP delivered to ${cleanToEmail}. ID: ${info.messageId}`);
        return {
          sentToExternalInbox: true,
          provider: conf.provider || 'smtp',
          message: `驗證信已透過 SMTP 伺服器成功發送至「${cleanToEmail}」，請至信箱查收！`,
        };
      } catch (smtpErr: any) {
        console.warn(`[EmailService] SMTP delivery failed for ${cleanToEmail}:`, smtpErr.message);
        throw new Error(`SMTP 發信伺服器連線失敗: ${smtpErr.message}`);
      }
    }

    // 3. No Email Provider Configured: Strictly report configuration error, DO NOT fake success!
    console.warn(`[EmailService] Cannot send verification email to ${cleanToEmail}: RESEND_API_KEY is not configured.`);
    throw new Error(
      `系統尚未配置真實發信服務（RESEND_API_KEY）。請在 AI Studio 左下角 Secrets 面板新增「RESEND_API_KEY」（Resend 每日免費 100 封），方能將驗證信送達「${cleanToEmail}」。`
    );
  }
}

export const emailService = new EmailService();
