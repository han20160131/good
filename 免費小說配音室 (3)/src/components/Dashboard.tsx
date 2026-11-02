/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NovelProject, BackendStatus, User } from '../types';
import { TabKey } from './TopNav';

interface DashboardProps {
  projects: NovelProject[];
  backendStatus: BackendStatus;
  onOpenProject: (projectId: string) => void;
  onCreateNewProject: () => void;
  activeProjectId: string;
  onDeleteProject?: (projectId: string) => void;
  currentUser: User | null;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  stats?: any;
  onOpenCharacterLibrary?: () => void;
  onOpenMultiVoice?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  onOpenProject,
  onCreateNewProject,
  activeProjectId,
  onDeleteProject,
  currentUser,
  onOpenAuth,
  onOpenCharacterLibrary,
  onOpenMultiVoice,
}) => {
  const handleCreateClick = () => {
    if (!currentUser) {
      onOpenAuth('login');
    } else {
      onCreateNewProject();
    }
  };

  const handleMultiVoiceClick = () => {
    if (!currentUser) {
      onOpenAuth('login');
    } else if (onOpenMultiVoice) {
      onOpenMultiVoice();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Simple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-100">小說配音專案</h1>
            {currentUser && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {currentUser.displayName}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {currentUser
              ? `專屬獨立專案庫 · 共 ${projects.length} 部小說 · 背景自動持續運行`
              : '請登入或建立帳號，專屬小說專案獨立隔離保存'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenCharacterLibrary && (
            <button
              onClick={onOpenCharacterLibrary}
              className="px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <span>🎭 角色庫</span>
            </button>
          )}

          <button
            onClick={handleCreateClick}
            className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <span>🎙️ 製作新配音</span>
          </button>

          {onOpenMultiVoice && (
            <button
              onClick={handleMultiVoiceClick}
              className="px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 transition-all rounded-xl shadow-md flex items-center gap-1.5"
            >
              <span>👥 製作多人配音</span>
            </button>
          )}
        </div>
      </div>

      {/* Projects List / Grid */}
      {projects.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-800/20 border border-dashed border-slate-700/60 text-slate-400 space-y-4">
          {!currentUser ? (
            <>
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 text-xl font-bold">
                🔒
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">請先登入或建立帳號</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  小說配音專案依帳號完全隔離。登入帳號 A 時只會看到帳號 A 的專案；登出後登入帳號 B 則完全獨立。
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm"
                >
                  登入帳號
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-5 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                >
                  建立帳號
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xl">
                📚
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">帳號「{currentUser.displayName}」目前尚無小說專案</p>
                <p className="text-xs text-slate-500 mt-1">立即匯入長篇小說或點擊「+ 製作新配音」開始自動生成有聲書</p>
              </div>
              <button
                onClick={onCreateNewProject}
                className="px-5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm"
              >
                + 製作第一部小說配音
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((proj) => {
            const isSelected = proj.id === activeProjectId;
            const totalParas = proj.chapters.reduce(
              (sum, c) => sum + c.paragraphs.length,
              0
            );
            const completedParas = proj.chapters.reduce(
              (sum, c) =>
                sum + c.paragraphs.filter((p) => p.status === 'completed' && (p.fileSizeBytes || 0) >= 500).length,
              0
            );
            const failedParas = proj.chapters.reduce(
              (sum, c) =>
                sum + c.paragraphs.filter((p) => p.status === 'failed' || ((p.fileSizeBytes || 0) < 500 && p.status === 'completed')).length,
              0
            );
            const percent =
              totalParas > 0 ? Math.round((completedParas / totalParas) * 100) : 0;
            const isDone = percent === 100 && totalParas > 0 && failedParas === 0 && proj.status === 'completed';

            return (
              <div
                key={proj.id}
                onClick={() => onOpenProject(proj.id)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer space-y-4 ${
                  isSelected
                    ? 'bg-slate-800/80 border-amber-500/60 shadow-lg ring-1 ring-amber-500/30'
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/60 hover:border-slate-600'
                }`}
              >
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100 line-clamp-1">
                      {proj.title}
                    </h2>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                      <span>{proj.totalWords.toLocaleString()} 字</span>
                      <span aria-hidden="true">·</span>
                      <span>共 {proj.chapters.length} 章</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-400/90 font-medium">
                        {proj.voiceSettings?.displayName?.split(' ')[0] || proj.voiceSettings?.voiceCode || '微軟聲音'}
                      </span>
                      {proj.enableAiRoles && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          🎭 AI 多角色 ({proj.characterVoices?.length || 0})
                        </span>
                      )}
                      {proj.enablePolyphoneFix !== false && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                          🔤 多音字已校正
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-md font-medium shrink-0 flex items-center gap-1.5 ${
                      isDone
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : proj.status === 'has_errors' || failedParas > 0
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : proj.status === 'processing'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : proj.status === 'paused'
                        ? 'bg-slate-800 text-slate-300 border border-slate-700'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {proj.status === 'processing' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    {isDone
                      ? '已完成'
                      : proj.status === 'has_errors' || failedParas > 0
                      ? `⚠️ 待重試 (${failedParas})`
                      : proj.status === 'processing'
                      ? '配音進行中'
                      : proj.status === 'paused'
                      ? '已暫停'
                      : '未開始'}
                  </span>
                </div>

                {/* Calm Progress Bar */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-xs text-slate-300 font-mono">
                    <span>進度</span>
                    <span className="font-bold text-amber-400 text-sm">
                      {percent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-700/60 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {completedParas} / {totalParas} 段落
                    </span>
                    {onDeleteProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(proj.id);
                        }}
                        title="刪除此專案"
                        className="text-[11px] font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors px-2 py-1 rounded-lg flex items-center gap-1 border border-transparent hover:border-red-500/30"
                      >
                        <span>🗑️</span>
                        <span>刪除專案</span>
                      </button>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProject(proj.id);
                    }}
                    className="px-4 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
                  >
                    {isDone ? '查看音訊 →' : '進入配音 →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
