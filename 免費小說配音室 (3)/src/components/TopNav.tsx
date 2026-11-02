/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BackendStatus, User } from '../types';

export type TabKey = 'dashboard' | 'characters' | 'maker' | 'multivoice' | 'export' | 'voices';

interface TopNavProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  backendStatus: BackendStatus;
  onCheckBackend: () => void;
  isCheckingBackend: boolean;
  onNewDraft?: () => void;
  currentUser: User | null;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onLogout: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onSelectTab,
  backendStatus,
  onCheckBackend,
  isCheckingBackend,
  onNewDraft,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const navItems: { key: TabKey; label: string }[] = [
    { key: 'dashboard', label: '我的專案' },
    { key: 'characters', label: '角色庫' },
    { key: 'maker', label: '製作新配音' },
    { key: 'multivoice', label: '製作多人配音' },
    { key: 'export', label: '音訊匯出' },
    { key: 'voices', label: '配音員音庫' },
  ];

  const handleTabClick = (key: TabKey) => {
    if ((key === 'maker' || key === 'multivoice') && !currentUser) {
      onOpenAuth('login');
      return;
    }
    if (key === 'maker' && onNewDraft && activeTab === 'maker') {
      onNewDraft();
    } else {
      onSelectTab(key);
    }
  };

  const userNickname = currentUser
    ? currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : currentUser.username)
    : '';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-100 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <span className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-sm">
              聲
            </span>
            <span className="font-extrabold tracking-tight">免費小說配音室</span>
          </button>
        </div>

        {/* Zone 2: Nav Links (All clean, whitespace-nowrap, zero squishing or vertical wrap) */}
        <nav className="flex items-center gap-1.5 shrink-0 overflow-x-auto py-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleTabClick(item.key)}
                className={`px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 rounded-lg inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'text-amber-400 bg-amber-500/15 font-bold shadow-sm ring-1 ring-amber-500/30'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                {item.key === 'maker' && <span className="text-amber-400 text-[11px]">✨</span>}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: User Info & Connection indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1 shrink-0 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center justify-center shrink-0">
                {userNickname ? userNickname.slice(0, 1).toUpperCase() : '用'}
              </div>
              <span className="text-xs font-semibold text-slate-200 max-w-[140px] truncate" title={userNickname}>
                {userNickname}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors border border-amber-500/30 whitespace-nowrap"
              >
                登入 / 建立帳號
              </button>
            </div>
          )}

          <button
            onClick={onCheckBackend}
            disabled={isCheckingBackend}
            title={
              backendStatus.connected
                ? 'Edge TTS 雲端極速引擎 (1,000~10,000 條並行通道已連線)'
                : '點擊檢查連線'
            }
            className="px-2.5 py-1 text-[11px] rounded-lg transition-colors border flex items-center gap-1.5 bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 shrink-0 whitespace-nowrap"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus.connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline font-mono">
              {isCheckingBackend
                ? '檢查中'
                : backendStatus.connected
                ? '已連線 (1,000+通道)'
                : '離線'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
