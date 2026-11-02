/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { authFetch, setStoredUser } from '../utils/authClient';

interface AccountSettingsGearProps {
  currentUser: User | null;
  onLogout: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

export const AccountSettingsGear: React.FC<AccountSettingsGearProps> = ({
  currentUser,
  onLogout,
  onUpdateUser,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<'none' | 'name' | 'password'>('none');

  // Name modal state
  const [newName, setNewName] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [nameSuccess, setNameSuccess] = useState<boolean>(false);

  // Password modal state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [isSavingPassword, setIsSavingPassword] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // If user is not logged in, do not render account settings
  if (!currentUser) {
    return null;
  }

  const currentDisplayName =
    currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : currentUser.username);

  const handleOpenNameModal = () => {
    setIsOpen(false);
    setNewName(currentDisplayName);
    setNameError('');
    setNameSuccess(false);
    setActiveModal('name');
  };

  const handleOpenPasswordModal = () => {
    setIsOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess(false);
    setActiveModal('password');
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setNameError('請輸入有效名稱');
      return;
    }

    setIsSavingName(true);
    setNameError('');
    try {
      const res = await authFetch('/api/auth/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '更改名稱失敗');
      }

      const updated = data.user || { ...currentUser, displayName: trimmed };
      setStoredUser(updated);
      onUpdateUser(updated);
      setNameSuccess(true);
      setTimeout(() => {
        setActiveModal('none');
      }, 800);
    } catch (err: any) {
      setNameError(err.message || '更改名稱失敗，請稍後再試');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('密碼長度需至少 6 個字元');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('兩次輸入的密碼不一致');
      return;
    }

    setIsSavingPassword(true);
    setPasswordError('');
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '更改密碼失敗');
      }

      setPasswordSuccess(true);
      setTimeout(() => {
        setActiveModal('none');
      }, 1000);
    } catch (err: any) {
      setPasswordError(err.message || '更改密碼失敗，請稍後再試');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <>
      {/* Bottom-left fixed gear icon button container */}
      <div ref={containerRef} className="fixed bottom-5 left-5 z-40">
        {/* Settings Popover Menu with 3 items */}
        {isOpen && (
          <div className="absolute bottom-14 left-0 mb-1 w-52 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-1.5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 ring-1 ring-white/10 z-50">
            <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
              <p className="text-[11px] text-slate-400 font-medium">目前登入帳號</p>
              <p className="text-xs font-bold text-amber-300 truncate">{currentDisplayName}</p>
            </div>

            <div className="space-y-0.5">
              {/* 1. 登出帳號 */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
              >
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-rose-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>登出帳號</span>
              </button>

              {/* 2. 更改名稱 */}
              <button
                type="button"
                onClick={handleOpenNameModal}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition-colors text-left"
              >
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                <span>更改名稱</span>
              </button>

              {/* 3. 更改密碼 */}
              <button
                type="button"
                onClick={handleOpenPasswordModal}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition-colors text-left"
              >
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>更改密碼</span>
              </button>
            </div>
          </div>
        )}

        {/* The Gear Icon Button: strictly a gear icon, without text "設定" per user instruction */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title="帳號管理與設定"
          aria-label="帳號設定"
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl border backdrop-blur-md ${
            isOpen
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 scale-105'
              : 'bg-slate-900/90 text-slate-300 hover:text-amber-400 border-slate-700/80 hover:border-amber-500/40 hover:bg-slate-800'
          }`}
        >
          {/* Refined SVG Gear / Cogwheel icon */}
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'hover:rotate-45'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      {/* Modal: 更改名稱 */}
      {activeModal === 'name' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/90 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>✏️</span> 更改名稱
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              修改您在系統右上角顯示的個人暱稱。
            </p>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  新名稱 / 暱稱
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setNameError('');
                  }}
                  placeholder="例如：熱愛小說的讀者"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                />
              </div>

              {nameError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {nameError}
                </div>
              )}

              {nameSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                  <span>✓</span> 名稱已成功更新！
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSavingName || nameSuccess}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-xl shadow-lg shadow-amber-400/20 transition-all"
                >
                  {isSavingName ? '儲存中...' : '儲存名稱'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: 更改密碼 */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/90 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔒</span> 更改密碼
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              為您的帳號設定或更新專屬密碼（至少 6 位字元）。
            </p>

            <form onSubmit={handleSavePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  新密碼
                </label>
                <input
                  type="password"
                  autoFocus
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="請輸入 6 位數以上新密碼"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  確認新密碼
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="請再次輸入新密碼以供確認"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                />
              </div>

              {passwordError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                  <span>✓</span> 密碼已成功更新！
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword || passwordSuccess}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-xl shadow-lg shadow-amber-400/20 transition-all"
                >
                  {isSavingPassword ? '更新中...' : '確認更改密碼'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
