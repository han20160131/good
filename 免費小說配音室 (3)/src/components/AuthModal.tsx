/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { setStoredToken, setStoredUser } from '../utils/authClient';
import { safeFetchJson } from '../utils/apiClient';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';
import { syncUserProfileToCloud } from '../utils/cloudSyncService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialTab?: string;
  message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  message,
}) => {
  // view: 'choose' | 'email_flow'
  const [view, setView] = useState<'choose' | 'email_flow'>('choose');
  // emailSubTab: 'login' | 'register'
  const [emailSubTab, setEmailSubTab] = useState<'login' | 'register'>('login');

  // Form Fields - strictly empty initially, zero developer email autofill
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');

  // Captcha State
  const [captchaCode, setCaptchaCode] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Generate randomized 4-char alphanumeric captcha string
  const generateNewCaptcha = useCallback(() => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setCaptchaCode(code);
    setCaptchaInput('');
  }, []);

  // Draw graphical captcha on canvas
  const drawCaptcha = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !captchaCode) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Random noise lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `hsl(${Math.random() * 360}, 60%, 45%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Random noise dots
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.5, 1.5);
    }

    // Draw characters with slight rotation
    const colors = ['#f59e0b', '#38bdf8', '#34d399', '#f43f5e', '#a855f7'];
    ctx.font = 'bold 20px monospace';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < captchaCode.length; i++) {
      const char = captchaCode[i];
      const charColor = colors[i % colors.length];
      const x = 14 + i * 20;
      const y = canvas.height / 2 + (Math.random() * 4 - 2);
      const angle = (Math.random() * 20 - 10) * (Math.PI / 180);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = charColor;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, [captchaCode]);

  useEffect(() => {
    if (view === 'email_flow' && emailSubTab === 'register') {
      drawCaptcha();
    }
  }, [view, emailSubTab, captchaCode, drawCaptcha]);

  // Reset form upon opening
  useEffect(() => {
    if (isOpen) {
      setView('choose');
      setEmailSubTab('login');
      setLoginEmail('');
      setLoginPassword('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setCaptchaInput('');
      setErrorMessage(null);
      setSuccessInfo(null);
      setIsLoading(false);
      generateNewCaptcha();
    }
  }, [isOpen, generateNewCaptcha]);

  if (!isOpen) return null;

  // 1. Google 快速登入建立
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const user: User = {
        id: firebaseUser.uid,
        username: firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.slice(0, 6)}`,
        displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Google 用戶'),
        email: firebaseUser.email || undefined,
        createdAt: Date.now(),
      };

      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        fetch('/api/auth/save-gmail-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: credential.accessToken,
            email: firebaseUser.email,
          }),
        }).catch(() => {});
      }

      let token = `firebase_${firebaseUser.uid}_${Date.now()}`;
      try {
        const restoreRes = await fetch('/api/auth/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user }),
        });
        if (restoreRes.ok) {
          const restoreData = await restoreRes.json();
          if (restoreData && restoreData.token) {
            token = restoreData.token;
          }
        }
      } catch (syncErr) {
        console.warn('Backend session registration note:', syncErr);
      }

      setStoredToken(token);
      setStoredUser(user);
      onSuccess(user);
      onClose();
      syncUserProfileToCloud(user).catch(() => {});
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Google 登入已取消');
      } else if (String(err?.message || err).includes('access_denied') || String(err?.message || err).includes('403')) {
        setErrorMessage('Google 專案未完成公開驗證（錯誤 403 access_denied），請改點選「2. 用 Email 登入建立」直接使用！');
      } else {
        setErrorMessage(`Google 登入失敗: ${err.message || '建議改用 Email 登入建立'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Email 登入 (輸入電子郵件及密碼)
  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim();
    const password = loginPassword.trim();

    if (!email) {
      setErrorMessage('請輸入電子郵件');
      return;
    }
    if (!password) {
      setErrorMessage('請輸入密碼');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    try {
      const res = await safeFetchJson<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      });

      if (!res.ok || !res.data || !res.data.user) {
        throw new Error(res.data?.error || '帳號或密碼錯誤，請重新確認');
      }

      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      onSuccess(res.data.user);
      onClose();
      syncUserProfileToCloud(res.data.user).catch(() => {});
    } catch (err: any) {
      setErrorMessage(err.message || '登入失敗，請確認電子郵件與密碼是否正確');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Email 建立 (輸入電子郵件、設定的密碼、確認密碼再輸入一次、圖形驗證碼)
  const handleEmailRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = registerEmail.trim();
    const password = registerPassword.trim();
    const confirmPassword = registerConfirmPassword.trim();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrorMessage('請輸入正確的電子郵件地址');
      return;
    }
    if (!password) {
      setErrorMessage('請輸入要設定的密碼');
      return;
    }
    if (password.length < 3) {
      setErrorMessage('密碼長度至少需 3 個字元');
      return;
    }

    // 密碼兩次驗證：如果不一樣，顯示「密碼不一致」
    if (password !== confirmPassword) {
      setErrorMessage('密碼不一致');
      return;
    }

    // 圖形驗證碼防偽檢驗
    if (!captchaInput || captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setErrorMessage('圖形驗證碼不正確，請重新輸入');
      generateNewCaptcha();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    try {
      const username = email.split('@')[0] || `user_${Date.now()}`;
      const res = await safeFetchJson<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username,
          password,
          confirmPassword,
          displayName: username,
        }),
      });

      if (!res.ok || !res.data || !res.data.user) {
        throw new Error(res.data?.error || '建立帳號失敗，請稍後再試');
      }

      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      onSuccess(res.data.user);
      onClose();
      syncUserProfileToCloud(res.data.user).catch(() => {});
    } catch (err: any) {
      setErrorMessage(err.message || '建立帳號失敗，請重新確認資料');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          aria-label="關閉"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-xl mb-3 shadow-inner">
            🎙️
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">小說 AI 多角色配音室</h2>
          <p className="text-xs text-slate-400 mt-1">
            {view === 'choose'
              ? '請選擇登入或建立帳號方式'
              : emailSubTab === 'login'
              ? '輸入電子郵件及密碼登入'
              : '輸入電子郵件、密碼並再輸入一次確認'}
          </p>
          {message && (
            <div className="mt-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg py-1.5 px-3">
              {message}
            </div>
          )}
        </div>

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
            <span className="shrink-0 font-bold">⚠️</span>
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}
        {successInfo && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-start gap-2">
            <span className="shrink-0 font-bold">✓</span>
            <span className="leading-relaxed">{successInfo}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: INITIAL CHOOSE (Google vs Email) */}
        {/* ======================================================== */}
        {view === 'choose' && (
          <div className="space-y-3.5">
            {/* 1. 用 Google 快速登入建立 */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-sm font-semibold text-white transition-all shadow-md group disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? '處理中...' : '1. 用 Google 快速登入建立'}</span>
            </button>

            {/* 2. 用 Email 登入建立 */}
            <button
              type="button"
              onClick={() => {
                setView('email_flow');
                setEmailSubTab('login');
                setErrorMessage(null);
                setSuccessInfo(null);
              }}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-sm font-bold text-amber-300 transition-all shadow-md group disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span>2. 用 Email 登入建立</span>
            </button>

            <div className="pt-3 text-center">
              <span className="text-[11px] text-slate-500">
                作品與音訊專屬隔離保存 · 安全隱私保障
              </span>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: EMAIL FLOW (登入 與 建立) */}
        {/* ======================================================== */}
        {view === 'email_flow' && (
          <div className="space-y-4">
            {/* Top Sub-Tabs: 1. 登入 | 2. 建立 */}
            <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setEmailSubTab('login');
                  setErrorMessage(null);
                  setSuccessInfo(null);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  emailSubTab === 'login'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. 登入
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailSubTab('register');
                  setErrorMessage(null);
                  setSuccessInfo(null);
                  generateNewCaptcha();
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  emailSubTab === 'register'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2. 建立
              </button>
            </div>

            {/* ----------------- SUB-TAB 1: 登入 (電子郵件 + 密碼) ----------------- */}
            {emailSubTab === 'login' && (
              <form onSubmit={handleEmailLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    電子郵件 (Email)
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="off"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="例如：name@example.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    密碼
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="off"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="請輸入密碼"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-400/20 active:scale-[0.99]"
                >
                  {isLoading ? '登入中...' : '立即登入'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSubTab('register');
                      setErrorMessage(null);
                      generateNewCaptcha();
                    }}
                    className="text-xs text-amber-400/90 hover:text-amber-300 hover:underline"
                  >
                    還沒有帳號？點此前往「建立帳號」
                  </button>
                </div>
              </form>
            )}

            {/* ----------------- SUB-TAB 2: 建立 (電子郵件 + 設定密碼 + 確認密碼 + 圖形驗證碼) ----------------- */}
            {emailSubTab === 'register' && (
              <form onSubmit={handleEmailRegisterSubmit} className="space-y-3">
                {/* 1. 電子郵件 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    電子郵件 (Email)
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    value={registerEmail}
                    onChange={(e) => {
                      setRegisterEmail(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="例如：name@example.com"
                    className="w-full px-3.5 py-2 text-sm bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                  />
                </div>

                {/* 2. 要設定的密碼 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    要設定的密碼
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="off"
                    value={registerPassword}
                    onChange={(e) => {
                      setRegisterPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="請設定密碼（例如：123）"
                    className="w-full px-3.5 py-2 text-sm bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                  />
                </div>

                {/* 3. 密碼驗證（再輸入一次密碼） */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    確認密碼（再輸入一次）
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="off"
                    value={registerConfirmPassword}
                    onChange={(e) => {
                      setRegisterConfirmPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="請再次輸入相同的密碼"
                    className="w-full px-3.5 py-2 text-sm bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                  />
                </div>

                {/* 4. 圖形驗證碼 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    圖形驗證碼
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      maxLength={4}
                      value={captchaInput}
                      onChange={(e) => {
                        setCaptchaInput(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="輸入右方 4 位圖形碼"
                      className="flex-1 px-3.5 py-2 text-sm bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 tracking-widest uppercase font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <canvas
                        ref={canvasRef}
                        width={100}
                        height={38}
                        onClick={generateNewCaptcha}
                        title="點擊重新整理圖形驗證碼"
                        className="rounded-xl border border-slate-700 shadow-inner cursor-pointer hover:border-amber-500/50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={generateNewCaptcha}
                        title="重新整理圖形碼"
                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-400/20 active:scale-[0.99]"
                >
                  {isLoading ? '建立帳號中...' : '確認建立帳號'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSubTab('login');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-amber-400/90 hover:text-amber-300 hover:underline"
                  >
                    已有帳號？點此前往「登入」
                  </button>
                </div>
              </form>
            )}

            {/* Back to 2 Options button */}
            <div className="pt-2 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={() => {
                  setView('choose');
                  setErrorMessage(null);
                  setSuccessInfo(null);
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                ← 返回選擇其他方式
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
