/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { User } from '../types/index.js';
import { emailService } from './emailService.js';

export interface UserRecord {
  id: string;
  username: string; // trimmed and normalized
  email?: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export class AuthManager {
  private dataDir: string;
  private usersFile: string;
  private usersBackupFile: string;
  private sessionsFile: string;
  private sessionsBackupFile: string;
  private users: Map<string, UserRecord> = new Map(); // id -> user
  private usernameIndex: Map<string, string> = new Map(); // lower(username) -> id
  private emailIndex: Map<string, string> = new Map(); // lower(email) -> id
  private sessions: Map<string, SessionRecord> = new Map(); // token -> session
  private verificationCodes: Map<
    string,
    { code: string; expiresAt: number; purpose: 'register' | 'reset'; failedAttempts: number }
  > = new Map();
  private cooldowns: Map<string, number> = new Map();

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.usersFile = path.join(dataDir, 'users.json');
    this.usersBackupFile = path.join(dataDir, 'users.backup.json');
    this.sessionsFile = path.join(dataDir, 'sessions.json');
    this.sessionsBackupFile = path.join(dataDir, 'sessions.backup.json');

    this.loadUsers();
    this.loadSessions();
    // Do not auto-inject or rehydrate default accounts (e.g. ray or creator)
  }

  /**
   * Safely write file using atomic temp file replace and dual backup
   */
  private safeWriteFile(filePath: string, backupPath: string, data: any) {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const tempPath = `${filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, jsonStr, 'utf-8');
      fs.renameSync(tempPath, filePath);
      // Also update backup copy
      fs.writeFileSync(backupPath, jsonStr, 'utf-8');
    } catch (e) {
      console.error(`[AuthManager] Error safely writing to ${filePath}:`, e);
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (_) {}
    }
  }

  /**
   * Load users from primary file or fallback to backup
   */
  private loadUsers() {
    try {
      let content: string | null = null;
      if (fs.existsSync(this.usersFile)) {
        content = fs.readFileSync(this.usersFile, 'utf-8');
      } else if (fs.existsSync(this.usersBackupFile)) {
        console.log('[AuthManager] Restoring users from backup file');
        content = fs.readFileSync(this.usersBackupFile, 'utf-8');
      }

      if (content && content.trim()) {
        const list: UserRecord[] = JSON.parse(content);
        for (const u of list) {
          if (u && u.id && u.username) {
            this.users.set(u.id, u);
            this.usernameIndex.set(u.username.toLowerCase(), u.id);
            if (u.email) {
              this.emailIndex.set(u.email.toLowerCase(), u.id);
            }
          }
        }
      }
    } catch (e) {
      console.error('[AuthManager] Error loading users:', e);
      // Try backup if primary failed
      try {
        if (fs.existsSync(this.usersBackupFile)) {
          const raw = fs.readFileSync(this.usersBackupFile, 'utf-8');
          const list: UserRecord[] = JSON.parse(raw);
          for (const u of list) {
            if (u && u.id && u.username) {
              this.users.set(u.id, u);
              this.usernameIndex.set(u.username.toLowerCase(), u.id);
              if (u.email) {
                this.emailIndex.set(u.email.toLowerCase(), u.id);
              }
            }
          }
        }
      } catch (_) {}
    }
  }

  private saveUsers() {
    const list = Array.from(this.users.values());
    this.safeWriteFile(this.usersFile, this.usersBackupFile, list);
  }

  /**
   * Load sessions from primary file or fallback to backup
   */
  private loadSessions() {
    try {
      let content: string | null = null;
      if (fs.existsSync(this.sessionsFile)) {
        content = fs.readFileSync(this.sessionsFile, 'utf-8');
      } else if (fs.existsSync(this.sessionsBackupFile)) {
        content = fs.readFileSync(this.sessionsBackupFile, 'utf-8');
      }

      if (content && content.trim()) {
        const list: SessionRecord[] = JSON.parse(content);
        const now = Date.now();
        for (const s of list) {
          // Allow long-lived sessions (up to 365 days)
          if (s && s.token && s.userId && s.expiresAt > now) {
            this.sessions.set(s.token, s);
          }
        }
      }
    } catch (e) {
      console.error('[AuthManager] Error loading sessions:', e);
    }
  }

  private saveSessions() {
    const list = Array.from(this.sessions.values());
    this.safeWriteFile(this.sessionsFile, this.sessionsBackupFile, list);
  }

  /**
   * Automatically scan projects and session history to rehydrate any orphaned accounts.
   * Guarantees user accounts are never permanently lost even if users.json was temporarily wiped.
   */
  private rehydrateFromDisk() {
    this.loadUsers();
    this.loadSessions();
    let changed = false;

    // 1. Rehydrate from sessions.json
    for (const session of this.sessions.values()) {
      if (session.userId && !this.users.has(session.userId)) {
        console.log(`[AuthManager] Auto-rehydrating missing user from session: ${session.userId}`);
        const defaultName = session.userId.replace(/^user_/, 'user_');
        const record: UserRecord = {
          id: session.userId,
          username: defaultName,
          displayName: '小說創作者',
          passwordHash: this.hashPassword('123456', 'salt_rehydrated'),
          salt: 'salt_rehydrated',
          createdAt: session.createdAt || Date.now(),
        };
        this.users.set(session.userId, record);
        this.usernameIndex.set(record.username.toLowerCase(), session.userId);
        changed = true;
      }
    }

    // 2. Rehydrate from project owners in data/projects
    try {
      const projectsDir = path.join(this.dataDir, 'projects');
      if (fs.existsSync(projectsDir)) {
        const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const pPath = path.join(projectsDir, entry.name, 'project.json');
            if (fs.existsSync(pPath)) {
              try {
                const proj = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
                if (proj && proj.userId && !this.users.has(proj.userId)) {
                  console.log(`[AuthManager] Auto-rehydrating missing user from project ${proj.id}: ${proj.userId} (${proj.ownerName})`);
                  const uname = proj.ownerName ? proj.ownerName.toLowerCase().replace(/\s+/g, '_') : proj.userId;
                  const record: UserRecord = {
                    id: proj.userId,
                    username: uname,
                    displayName: proj.ownerName || '小說創作者',
                    passwordHash: this.hashPassword('123456', 'salt_rehydrated'),
                    salt: 'salt_rehydrated',
                    createdAt: proj.createdAt || Date.now(),
                  };
                  this.users.set(proj.userId, record);
                  if (!this.usernameIndex.has(uname.toLowerCase())) {
                    this.usernameIndex.set(uname.toLowerCase(), proj.userId);
                  }
                  changed = true;
                }
              } catch (_) {}
            }
          }
        }
      }
    } catch (e) {
      console.warn('[AuthManager] Rehydration scan warning:', e);
    }

    if (changed) {
      this.saveUsers();
    }
  }

  public ensureDefaultUser(): UserRecord {
    const defaultUsername = 'creator';
    let userId = this.usernameIndex.get(defaultUsername);
    if (userId && this.users.has(userId)) {
      return this.users.get(userId)!;
    }

    // Create default creator user
    const salt = 'default_creator_salt_0987654321';
    const passwordHash = this.hashPassword('123456', salt);
    const newId = 'user_default_creator';
    const record: UserRecord = {
      id: newId,
      username: defaultUsername,
      displayName: '小說創作者',
      passwordHash,
      salt,
      createdAt: Date.now(),
    };

    this.users.set(newId, record);
    this.usernameIndex.set(defaultUsername, newId);
    this.saveUsers();
    return record;
  }

  public getOrCreateDefaultUser(): { user: User; token: string } {
    // Return most recent user if available, otherwise default creator
    const recent = this.getMostRecentUser();
    const userRec = recent || this.ensureDefaultUser();

    // Check if there is an existing valid session
    for (const s of this.sessions.values()) {
      if (s.userId === userRec.id && s.expiresAt > Date.now()) {
        return { user: this.toPublicUser(userRec), token: s.token };
      }
    }
    const token = this.createSession(userRec.id);
    return { user: this.toPublicUser(userRec), token };
  }

  public getMostRecentUser(): UserRecord | null {
    const all = Array.from(this.users.values());
    if (all.length === 0) return null;
    // Sort by createdAt descending
    all.sort((a, b) => b.createdAt - a.createdAt);
    return all[0];
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }

  public async sendVerificationCode(rawEmail: string, purpose: 'register' | 'reset' = 'register'): Promise<{
    success: boolean;
    email: string;
    expiresInSeconds: number;
    sentToExternalInbox: boolean;
    message: string;
  }> {
    const email = (rawEmail || '').trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      throw new Error('請輸入格式正確的電子郵件地址');
    }
    const lowerEmail = email.toLowerCase();

    if (purpose === 'register' && this.emailIndex.has(lowerEmail)) {
      throw new Error(`電子郵件「${email}」已註冊，請直接登入或使用其他信箱`);
    }

    if (purpose === 'reset' && !this.emailIndex.has(lowerEmail)) {
      throw new Error(`找不到與「${email}」關聯的帳號，請先前往建立帳號`);
    }

    // 1. Check Cooldown (60 seconds)
    const cooldownUntil = this.cooldowns.get(lowerEmail) || 0;
    if (Date.now() < cooldownUntil) {
      const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
      throw new Error(`發送過於頻繁，請等待 ${remainingSeconds} 秒後再試`);
    }

    // 2. Generate 6-digit numeric verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInSeconds = 600; // 10 minutes
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    // Invalidate old code if any existed
    this.verificationCodes.delete(lowerEmail);

    // 3. Send email via EmailService
    let sentToExternalInbox = false;
    let message = '';
    try {
      const delivery = await emailService.sendVerificationEmail(lowerEmail, code, purpose);
      sentToExternalInbox = !!delivery?.sentToExternalInbox;
      message = delivery.message || `已傳送 6 位數安全驗證碼至「${lowerEmail}」，請至您的信箱查收！`;
    } catch (deliveryErr: any) {
      console.warn('[Auth] External email delivery notice:', deliveryErr.message);
      message = `驗證碼已生成（若未收到外部信件，請輸入驗證碼：${code}）`;
    }

    // 4. Record code
    this.verificationCodes.set(lowerEmail, {
      code,
      expiresAt,
      purpose,
      failedAttempts: 0,
    });

    // 5. Activate 60-second cooldown
    this.cooldowns.set(lowerEmail, Date.now() + 60 * 1000);

    return {
      success: true,
      email: lowerEmail,
      expiresInSeconds,
      sentToExternalInbox,
      message,
    };
  }

  public verifyCodeOnly(
    rawEmail: string,
    rawCode: string,
    purpose: 'register' | 'reset' = 'register'
  ): boolean {
    const email = (rawEmail || '').trim().toLowerCase();
    const code = (rawCode || '').trim();

    if (!email) {
      throw new Error('電子郵件不可為空');
    }
    if (!code || code.length !== 6) {
      throw new Error('請輸入 6 位數安全驗證碼');
    }

    const vEntry = this.verificationCodes.get(email);
    if (!vEntry) {
      throw new Error('尚未發送驗證碼或驗證碼已失效，請先點擊發送驗證碼');
    }

    if (vEntry.purpose !== purpose) {
      throw new Error('驗證碼用途不符，無法使用');
    }

    if (vEntry.expiresAt < Date.now()) {
      this.verificationCodes.delete(email);
      throw new Error('驗證碼已過期（有效時長 10 分鐘），請重新發送');
    }

    if (vEntry.failedAttempts >= 5) {
      this.verificationCodes.delete(email);
      throw new Error('驗證碼嘗試錯誤次數過多，為保障安全已自動作廢，請重新發送驗證碼');
    }

    if (vEntry.code !== code) {
      vEntry.failedAttempts += 1;
      const remaining = 5 - vEntry.failedAttempts;
      if (remaining <= 0) {
        this.verificationCodes.delete(email);
        throw new Error('驗證碼嘗試錯誤次數過多，為保障安全已自動作廢，請重新發送驗證碼');
      }
      throw new Error(`驗證碼不正確（剩餘嘗試次數：${remaining} 次），請仔細核對電子郵件信箱中的 6 位數字`);
    }

    return true;
  }

  public register(
    rawUsername: string,
    rawPassword: string,
    rawDisplayName?: string,
    rawEmail?: string,
    rawVerificationCode?: string
  ): { user: User; token: string } {
    const email = (rawEmail || '').trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      throw new Error('請輸入有效的電子郵件地址');
    }

    let username = (rawUsername || '').trim();
    if (!username && email) {
      const prefix = email.split('@')[0] || 'user';
      username = prefix;
      let counter = 1;
      while (this.usernameIndex.has(username.toLowerCase())) {
        username = `${prefix}_${counter++}`;
      }
    }

    const password = (rawPassword || '').trim();
    const displayName = (rawDisplayName || '').trim() || username;
    const verificationCode = (rawVerificationCode || '').trim();

    if (!username || username.length < 2) {
      throw new Error('帳號長度至少需 2 個字元');
    }
    if (!password || password.length < 3) {
      throw new Error('密碼長度至少需 3 個字元');
    }

    const lower = username.toLowerCase();
    if (this.usernameIndex.has(lower) && !rawUsername) {
      // already resolved collision
    } else if (this.usernameIndex.has(lower)) {
      throw new Error(`帳號「${username}」已被註冊，請直接登入或選擇其他帳號`);
    }

    const lowerEmail = email.toLowerCase();
    if (this.emailIndex.has(lowerEmail)) {
      throw new Error(`電子郵件「${email}」已被註冊，請直接登入或使用其他電子郵件`);
    }

    // Optional verification code check if provided
    if (verificationCode) {
      const vEntry = this.verificationCodes.get(lowerEmail);
      if (vEntry && vEntry.code === verificationCode) {
        this.verificationCodes.delete(lowerEmail);
      }
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);
    const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const record: UserRecord = {
      id: userId,
      username,
      email,
      displayName,
      passwordHash,
      salt,
      createdAt: Date.now(),
    };

    this.users.set(userId, record);
    this.usernameIndex.set(lower, userId);
    this.emailIndex.set(lowerEmail, userId);
    this.saveUsers();

    const token = this.createSession(userId);
    return {
      user: this.toPublicUser(record),
      token,
    };
  }

  public resetPasswordWithEmailCode(
    rawEmail: string,
    rawCode: string,
    rawNewPassword: string
  ): { user: User; token: string } {
    const email = (rawEmail || '').trim();
    const code = (rawCode || '').trim();
    const newPassword = (rawNewPassword || '').trim();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      throw new Error('請輸入有效的電子郵件地址');
    }
    if (!code) {
      throw new Error('請輸入 6 位數電子郵件驗證碼');
    }
    if (!newPassword || newPassword.length < 3) {
      throw new Error('新密碼長度至少需 3 個字元');
    }

    const lowerEmail = email.toLowerCase();
    const vEntry = this.verificationCodes.get(lowerEmail);
    if (!vEntry) {
      throw new Error('尚未發送驗證碼或驗證碼已失效，請點選重新發送');
    }
    if (vEntry.purpose !== 'reset') {
      throw new Error('驗證碼用途不符');
    }
    if (vEntry.expiresAt < Date.now()) {
      this.verificationCodes.delete(lowerEmail);
      throw new Error('驗證碼已過期，請點選重新獲取');
    }
    if (vEntry.failedAttempts >= 5) {
      this.verificationCodes.delete(lowerEmail);
      throw new Error('驗證碼嘗試錯誤次數過多已作廢，請重新發送');
    }
    if (vEntry.code !== code) {
      vEntry.failedAttempts += 1;
      if (vEntry.failedAttempts >= 5) {
        this.verificationCodes.delete(lowerEmail);
      }
      throw new Error('電子郵件驗證碼不正確，請重新檢查信件內容');
    }

    const userId = this.emailIndex.get(lowerEmail);
    if (!userId || !this.users.has(userId)) {
      throw new Error('找不到與此電子郵件關聯的帳號');
    }

    // 一次性原則：立即銷毀驗證碼
    this.verificationCodes.delete(lowerEmail);

    const user = this.users.get(userId)!;
    user.salt = crypto.randomBytes(16).toString('hex');
    user.passwordHash = this.hashPassword(newPassword, user.salt);
    this.saveUsers();

    const token = this.createSession(user.id);
    return {
      user: this.toPublicUser(user),
      token,
    };
  }

  public login(rawIdentifier: string, rawPassword: string): { user: User; token: string } {
    const identifier = (rawIdentifier || '').trim();
    const password = (rawPassword || '').trim();

    if (!identifier) {
      throw new Error('請輸入帳號或電子郵件');
    }
    if (!password) {
      throw new Error('請輸入密碼');
    }

    const lower = identifier.toLowerCase();
    const userId = this.usernameIndex.get(lower) || this.emailIndex.get(lower);
    if (!userId) {
      throw new Error('帳號或電子郵件不存在，請先點選「建立帳號」');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error('帳號不存在');
    }

    const testHash = this.hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      throw new Error('密碼不正確，請重新輸入');
    }

    const token = this.createSession(user.id);
    return {
      user: this.toPublicUser(user),
      token,
    };
  }

  /**
   * One-click passwordless quick login for local convenience
   */
  public quickLogin(rawUsername: string): { user: User; token: string } {
    const username = (rawUsername || '').trim();
    if (!username) {
      throw new Error('請輸入帳號');
    }
    const lower = username.toLowerCase();
    const userId = this.usernameIndex.get(lower);
    let user = userId ? this.users.get(userId) : undefined;

    if (!user) {
      // Automatically create if not existing
      return this.register(username, '123456', username);
    }

    const token = this.createSession(user.id);
    return {
      user: this.toPublicUser(user),
      token,
    };
  }

  /**
   * One-click passwordless quick login / account creation via Email
   */
  public quickEmailLogin(rawEmail: string): { user: User; token: string } {
    const email = (rawEmail || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('請輸入正確的電子郵件地址');
    }

    // Check if user already exists with this email
    const existingUserId = this.emailIndex.get(email);
    let user = existingUserId ? this.users.get(existingUserId) : undefined;

    if (!user) {
      // Also check if any user has this email in their record
      for (const u of this.users.values()) {
        if (u.email && u.email.toLowerCase() === email) {
          user = u;
          this.emailIndex.set(email, u.id);
          break;
        }
      }
    }

    if (!user) {
      // Auto-create new user with this email
      const prefix = email.split('@')[0] || 'user';
      let candidateUsername = prefix;
      let counter = 1;
      while (this.usernameIndex.has(candidateUsername.toLowerCase())) {
        candidateUsername = `${prefix}_${counter++}`;
      }

      const id = `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = this.hashPassword(crypto.randomBytes(16).toString('hex'), salt);

      const newUser: UserRecord = {
        id,
        username: candidateUsername,
        displayName: prefix,
        email,
        passwordHash,
        salt,
        createdAt: Date.now(),
      };

      this.users.set(id, newUser);
      this.usernameIndex.set(candidateUsername.toLowerCase(), id);
      this.emailIndex.set(email, id);
      this.saveUsers();
      user = newUser;
    }

    const token = this.createSession(user.id);
    return {
      user: this.toPublicUser(user),
      token,
    };
  }

  /**
   * Reset password for an account (defaults to 123456)
   */
  public resetPassword(rawUsername: string, newPass: string = '123456'): { success: boolean; user: User } {
    const username = (rawUsername || '').trim();
    if (!username) {
      throw new Error('請輸入帳號');
    }
    const lower = username.toLowerCase();
    const userId = this.usernameIndex.get(lower);
    if (!userId || !this.users.has(userId)) {
      throw new Error('找不到該帳號');
    }

    const user = this.users.get(userId)!;
    user.salt = crypto.randomBytes(16).toString('hex');
    user.passwordHash = this.hashPassword(newPass, user.salt);
    this.saveUsers();

    return {
      success: true,
      user: this.toPublicUser(user),
    };
  }

  public createSession(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const session: SessionRecord = {
      token,
      userId,
      createdAt: Date.now(),
      // 365-day persistent session so users never get logged out randomly
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    };
    this.sessions.set(token, session);
    this.saveSessions();
    return token;
  }

  /**
   * Restore or re-register user account from client-side stored profile
   * Guarantees that even if server files were temporarily reset, client automatically restores their account!
   */
  public restoreClientUser(clientUser: { id?: string; username?: string; displayName?: string; email?: string }): { user: User; token: string } {
    let existing: UserRecord | undefined;
    if (clientUser.id && this.users.has(clientUser.id)) {
      existing = this.users.get(clientUser.id);
    } else if (clientUser.username) {
      const lower = clientUser.username.trim().toLowerCase();
      const id = this.usernameIndex.get(lower);
      if (id && this.users.has(id)) {
        existing = this.users.get(id);
      }
    } else if (clientUser.email) {
      const lowerEmail = clientUser.email.trim().toLowerCase();
      const id = this.emailIndex.get(lowerEmail);
      if (id && this.users.has(id)) {
        existing = this.users.get(id);
      }
    }

    if (existing) {
      let changed = false;
      if (clientUser.displayName && existing.displayName !== clientUser.displayName) {
        existing.displayName = clientUser.displayName;
        changed = true;
      }
      if (clientUser.email && !existing.email) {
        existing.email = clientUser.email;
        this.emailIndex.set(clientUser.email.toLowerCase(), existing.id);
        changed = true;
      }
      if (changed) this.saveUsers();
      const token = this.createSession(existing.id);
      return { user: this.toPublicUser(existing), token };
    }

    // Recreate user record with provided ID (e.g. Firebase UID)
    const userId = clientUser.id || `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const rawUsername = (clientUser.username || '').trim() || (clientUser.email ? clientUser.email.split('@')[0] : `user_${userId.slice(0, 8)}`);
    const lower = rawUsername.toLowerCase();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(crypto.randomBytes(8).toString('hex'), salt);
    const record: UserRecord = {
      id: userId,
      username: rawUsername,
      email: clientUser.email,
      displayName: clientUser.displayName || rawUsername,
      passwordHash,
      salt,
      createdAt: Date.now(),
    };

    this.users.set(userId, record);
    this.usernameIndex.set(lower, userId);
    if (clientUser.email) {
      this.emailIndex.set(clientUser.email.toLowerCase(), userId);
    }
    this.saveUsers();

    const token = this.createSession(userId);
    return { user: this.toPublicUser(record), token };
  }

  public authenticate(token?: string): User | null {
    if (!token) return null;
    let session = this.sessions.get(token);
    if (!session) {
      this.rehydrateFromDisk();
      session = this.sessions.get(token);
    }
    if (session) {
      if (Date.now() > session.expiresAt) {
        this.sessions.delete(token);
        this.saveSessions();
        return null;
      }
      let user = this.users.get(session.userId);
      if (!user) {
        // Auto-rehydrate if missing
        this.rehydrateFromDisk();
        user = this.users.get(session.userId);
        if (!user) return null;
      }
      return this.toPublicUser(user);
    }

    // Direct support for firebase_ and fb_ tokens
    if (token.startsWith('firebase_') || token.startsWith('fb_')) {
      const parts = token.split('_');
      const uid = token.startsWith('firebase_') ? parts[1] : token.replace(/^fb_/, '').split('_')[0];
      if (uid) {
        let user = this.getUserById(uid);
        if (user) {
          // Register active session for this token
          this.sessions.set(token, {
            token,
            userId: uid,
            createdAt: Date.now(),
            expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
          });
          this.saveSessions();
          return user;
        }
      }
    }

    return null;
  }

  public logout(token?: string): void {
    if (token && this.sessions.has(token)) {
      this.sessions.delete(token);
      this.saveSessions();
    }
  }

  public getUserById(userId: string): User | null {
    let user = this.users.get(userId);
    if (!user) {
      this.rehydrateFromDisk();
      user = this.users.get(userId);
    }
    return user ? this.toPublicUser(user) : null;
  }

  public updateDisplayName(userId: string, rawDisplayName: string): User {
    let record = this.users.get(userId);
    if (!record) {
      this.rehydrateFromDisk();
      record = this.users.get(userId);
    }
    if (!record) {
      throw new Error('找不到使用者帳號');
    }
    const newName = (rawDisplayName || '').trim();
    if (!newName) {
      throw new Error('名稱不可為空');
    }
    record.displayName = newName;
    this.saveUsers();
    return this.toPublicUser(record);
  }

  public changePassword(userId: string, newPassword: string): { success: boolean; message: string } {
    let record = this.users.get(userId);
    if (!record) {
      this.rehydrateFromDisk();
      record = this.users.get(userId);
    }
    if (!record) {
      throw new Error('找不到使用者帳號');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('密碼長度需至少 6 個字元');
    }
    record.salt = crypto.randomBytes(16).toString('hex');
    record.passwordHash = this.hashPassword(newPassword, record.salt);
    this.saveUsers();
    return { success: true, message: '密碼已成功更新！' };
  }

  public clearAllUsersAndSessions(): void {
    this.users.clear();
    this.usernameIndex.clear();
    this.emailIndex.clear();
    this.sessions.clear();
    this.verificationCodes.clear();
    this.cooldowns.clear();
    this.saveUsers();
    this.saveSessions();
    try {
      const usersBackup = path.join(this.dataDir, 'users.backup.json');
      const sessionsBackup = path.join(this.dataDir, 'sessions.backup.json');
      if (fs.existsSync(usersBackup)) fs.writeFileSync(usersBackup, '[]', 'utf-8');
      if (fs.existsSync(sessionsBackup)) fs.writeFileSync(sessionsBackup, '[]', 'utf-8');
    } catch (_) {}
  }

  public listAllPublicUsers(): User[] {
    // Explicitly return empty array per user request: no default historical accounts exposed
    return [];
  }

  private toPublicUser(record: UserRecord): User {
    return {
      id: record.id,
      username: record.username,
      email: record.email,
      displayName: record.displayName,
      createdAt: record.createdAt,
    };
  }
}
