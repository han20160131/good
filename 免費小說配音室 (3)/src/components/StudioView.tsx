/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NovelProject, Paragraph, BackendStatus } from '../types';

interface StudioViewProps {
  project: NovelProject | undefined;
  onUpdateProject: (updated: NovelProject) => void;
  backendStatus: BackendStatus;
  allProjects: NovelProject[];
  onSelectProject: (id: string) => void;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const StudioView: React.FC<StudioViewProps> = ({
  project,
  allProjects,
  onSelectProject,
  isRunning,
  onStart,
  onPause,
  onReset,
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  if (!project) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-800/20 border border-slate-800 text-slate-400 space-y-3 max-w-xl mx-auto">
        <p className="text-base font-semibold text-slate-200">未選取小說專案</p>
        <p className="text-xs">請返回主畫面選取要配音的小說。</p>
      </div>
    );
  }

  // Calculate clean, steady progress percentage (0 to 100%)
  const allParagraphs: Paragraph[] = project.chapters.flatMap((c) => c.paragraphs);
  const totalParas = allParagraphs.length;
  const completedParas = allParagraphs.filter((p) => p.status === 'completed').length;
  const progressPercent = totalParas > 0 ? Math.round((completedParas / totalParas) * 100) : 0;
  const isDone = progressPercent === 100;
  const isPaused = project.status === 'paused' && !isRunning;

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-8">
      {/* Project Switcher Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">{project.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {project.totalWords.toLocaleString()} 字 · 微軟雲希 (zh-CN-YunxiNeural)
          </p>
        </div>

        {allProjects.length > 1 && (
          <select
            value={project.id}
            onChange={(e) => onSelectProject(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400"
          >
            {allProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main Calm Studio Card */}
      <div className="p-8 sm:p-12 rounded-3xl bg-slate-800/40 border border-slate-700/60 text-center space-y-8 shadow-xl">
        {/* Steady Big Percentage (1 to 100%) */}
        <div className="space-y-2">
          <div className="text-7xl sm:text-8xl font-black font-mono tracking-tight text-amber-400 tabular-nums">
            {progressPercent}
            <span className="text-4xl sm:text-5xl font-sans text-slate-400 font-normal ml-1">
              %
            </span>
          </div>

          <div className="text-sm font-medium">
            {isDone ? (
              <span className="text-emerald-400 font-semibold">✓ 配音已全部完成</span>
            ) : isRunning ? (
              <span className="text-amber-400 font-semibold flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                正在配音中（已進入本機自動儲存狀態）
              </span>
            ) : isPaused ? (
              <span className="text-slate-300">已暫停（進度已安全保存）</span>
            ) : (
              <span className="text-slate-400">尚未開始</span>
            )}
          </div>
        </div>

        {/* Clean 1 to 100% Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-3 rounded-full bg-slate-700/70 overflow-hidden p-0.5 border border-slate-600/30">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>0%</span>
            <span>已完成 {completedParas} / {totalParas} 段落</span>
            <span>100%</span>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {!isRunning && !isDone && (
            <button
              onClick={onStart}
              className="px-8 py-3 text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95"
            >
              {isPaused ? '▶ 繼續配音' : '▶ 開始配音'}
            </button>
          )}

          {isRunning && (
            <button
              onClick={onPause}
              className="px-8 py-3 text-sm font-semibold text-slate-100 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all border border-slate-600 shadow-sm"
            >
              ⏸ 暫停
            </button>
          )}

          {isDone && (
            <button
              onClick={() => {
                alert(`配音已全數完成！音訊已儲存在您的本機目錄：\n${project.outputDirectory}`);
              }}
              className="px-8 py-3 text-sm font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md"
            >
              下載 / 開啟本機 MP3 音訊
            </button>
          )}

          {(isRunning || isPaused || isDone || completedParas > 0) && (
            <button
              onClick={onReset}
              className="px-4 py-3 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              重新開始
            </button>
          )}
        </div>

        {/* Background Reassurance */}
        <div className="pt-2 text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>全域背景守護已開啟：切換至主畫面、瀏覽其他網頁或縮小視窗，配音絕不中斷</span>
        </div>
      </div>

      {/* Optional Collapsed Details */}
      <div className="pt-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 mx-auto"
        >
          <span>{showDetails ? '隱藏詳細章節資訊' : '顯示章節與儲存設定'}</span>
          <span>{showDetails ? '▲' : '▼'}</span>
        </button>

        {showDetails && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-800/30 border border-slate-800 text-xs text-slate-400 space-y-3">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span>儲存目錄</span>
              <span className="font-mono text-slate-300">{project.outputDirectory}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span>章節總數</span>
              <span className="font-mono text-slate-300">{project.chapters.length} 章</span>
            </div>
            <div className="flex justify-between py-1 text-slate-400">
              <span>儲存狀態</span>
              <span className="text-emerald-400">✓ 每段生成立即寫入本機硬碟與儲存庫</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
