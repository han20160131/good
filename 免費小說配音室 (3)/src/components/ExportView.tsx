/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NovelProject, BackendStatus, Paragraph } from '../types';
import { TabKey } from './TopNav';
import { getStoredToken } from '../utils/authClient';

interface ExportViewProps {
  project: NovelProject | undefined;
  backendStatus: BackendStatus;
  onNavigate: (tab: TabKey) => void;
  onRetryFailed?: (projectId: string) => Promise<void> | void;
}

export const ExportView: React.FC<ExportViewProps> = ({
  project,
  backendStatus,
  onNavigate,
  onRetryFailed,
}) => {
  const [exportScope, setExportScope] = useState<'all' | 'chapter'>('chapter');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergedAudioResult, setMergedAudioResult] = useState<{
    fileName: string;
    durationFormatted: string;
    fileSizeBytes: number;
    url?: string;
    isMock: boolean;
  } | null>(null);

  if (!project) {
    return (
      <div className="p-12 text-center rounded-xl bg-slate-800/30 border border-slate-700/60 text-slate-400 space-y-3">
        <p className="text-base font-semibold text-slate-200">未選取任何小說專案</p>
        <p className="text-xs">請先至儀表板或匯入新小說。</p>
      </div>
    );
  }

  const currentChapter =
    project.chapters.find((c) => c.id === selectedChapterId) || project.chapters[0];

  // Integrity Check
  const paragraphsToCheck: Paragraph[] =
    exportScope === 'all'
      ? project.chapters.flatMap((c) => c.paragraphs)
      : currentChapter
      ? currentChapter.paragraphs
      : [];

  const missingOrFailed = paragraphsToCheck.filter((p) => p.status !== 'completed');
  const totalCount = paragraphsToCheck.length;
  const completedCount = totalCount - missingOrFailed.length;
  const canMerge = missingOrFailed.length === 0 && totalCount > 0;

  const handleRunMerge = async () => {
    if (!canMerge) return;
    setIsMerging(true);
    setMergeError(null);

    const token = getStoredToken();
    try {
      // Call unified /api/audio/merge (provided by Node.js with real FFmpeg stream copy and chunk integrity checks)
      const res = await fetch('/api/audio/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          projectId: project.id,
          scope: exportScope,
          chapterId: exportScope === 'chapter' ? currentChapter?.id : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '音訊合併失敗');
      }

      setMergedAudioResult({
        fileName: data.fileName,
        durationFormatted: data.durationFormatted,
        fileSizeBytes: data.fileSizeBytes,
        url: data.audioUrl,
        isMock: false,
      });
    } catch (err: any) {
      console.error('Merge error:', err);
      setMergeError(err.message || '音訊合併遇到錯誤');
    } finally {
      setIsMerging(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">音訊無損合併與匯出</h1>
        <p className="text-xs text-slate-400 mt-1">
          合併前嚴格執行全段落完整性檢查，杜絕漏段；支援單章備份與全書 MP3 串流無損封裝
        </p>
      </div>

      {/* Scope Selector Card */}
      <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-5">
        <h2 className="text-sm font-bold text-slate-200">1. 選取輸出範圍</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label
            onClick={() => setExportScope('chapter')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              exportScope === 'chapter'
                ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="space-y-1">
              <div className="font-semibold text-slate-200 text-sm">單章節音訊合併</div>
              <p className="text-xs text-slate-400">
                將選定章節下的所有段落 MP3 合併為單一音訊，方便分集收聽與校對。
              </p>
            </div>
            <div className="pt-3">
              <span className="text-xs font-medium text-amber-400">推薦日常檢查</span>
            </div>
          </label>

          <label
            onClick={() => setExportScope('all')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              exportScope === 'all'
                ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="space-y-1">
              <div className="font-semibold text-slate-200 text-sm">全書完整合併</div>
              <p className="text-xs text-slate-400">
                按全書章節與段落順序串流拼接，生成數十萬字的大型有聲書 MP3 檔案。
              </p>
            </div>
            <div className="pt-3">
              <span className="text-xs font-medium text-slate-400">全書完成後使用</span>
            </div>
          </label>
        </div>

        {exportScope === 'chapter' && (
          <div className="space-y-2 pt-2 border-t border-slate-700/50">
            <label className="block text-xs font-medium text-slate-300">
              選擇目標章節
            </label>
            <select
              value={selectedChapterId || project.chapters[0]?.id}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-400"
            >
              {project.chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.title} ({ch.paragraphs.length} 段落 · {ch.totalWords} 字)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Integrity Audit Card */}
      <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200">
            2. 合併前段落完整性檢查（防漏段保證）
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            完成度：{completedCount} / {totalCount} 段
          </span>
        </div>

        {canMerge ? (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
            <div className="text-xs text-emerald-300 space-y-0.5">
              <div className="font-semibold">✓ 完整性驗證通過！</div>
              <div>該範圍內的所有段落均已成功生成音訊，無缺失或失敗段落，允許合併。</div>
            </div>
            <button
              onClick={handleRunMerge}
              disabled={isMerging}
              className="px-5 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              {isMerging ? '串流合併中...' : '開始無損合併 MP3 →'}
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-3">
            <div className="text-xs text-rose-300 space-y-1">
              <div className="font-semibold text-sm">✕ 禁止合併：檢測到尚未完成之段落</div>
              <p>
                為保障有聲書聆聽品質，本系統嚴格禁止在段落缺失的情況下靜默跳過。
                目前尚有 <strong>{missingOrFailed.length}</strong> 個段落未完成或生成失敗。
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => onNavigate('maker')}
                className="px-4 py-1.5 text-xs font-medium text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
              >
                前往配音室處理缺失段落 →
              </button>
            </div>

            {/* Missing Paragraphs Table Preview */}
            <div className="mt-3 max-h-48 overflow-y-auto rounded bg-slate-950/70 p-2.5 font-mono text-[11px] space-y-1.5 border border-rose-900/40">
              <div className="text-rose-400 font-semibold mb-1">未完成段落清單：</div>
              {missingOrFailed.slice(0, 8).map((p) => (
                <div key={p.id} className="flex justify-between text-slate-300 py-0.5 border-b border-slate-900">
                  <span>{p.id}</span>
                  <span className="text-slate-400">{p.wordCount} 字</span>
                  <span className={p.status === 'failed' ? 'text-rose-400' : 'text-slate-500'}>
                    {p.status === 'failed' ? '生成失敗' : '尚未排程'}
                  </span>
                </div>
              ))}
              {missingOrFailed.length > 8 && (
                <div className="text-slate-500 text-center py-1">
                  ...其餘 {missingOrFailed.length - 8} 個段落
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Merge Error Alert */}
      {mergeError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2 animate-in fade-in">
          <div className="font-bold flex items-center gap-2">
            <span>⚠️ 合併失敗</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">{mergeError}</p>
          <div className="pt-1 flex gap-2">
            <button
              onClick={() => onNavigate('maker')}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded text-xs font-semibold"
            >
              前往配音室檢視並重試失敗段落 →
            </button>
          </div>
        </div>
      )}

      {/* Merged Audio Result Card */}
      {mergedAudioResult && (
        <div className="p-6 rounded-xl bg-slate-800/50 border border-amber-500/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-amber-400">
              ✓ 無損合併成功完成
            </h2>
            <span className="text-xs text-emerald-400 font-mono font-bold">
              {formatFileSize(mergedAudioResult.fileSizeBytes)}
            </span>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="font-semibold text-slate-200">
                {mergedAudioResult.fileName}
              </div>
              <div className="text-slate-400 font-mono tabular-nums">
                總時長：{mergedAudioResult.durationFormatted}
              </div>
            </div>

            {/* Playable audio preview */}
            {mergedAudioResult.url && (
              <div className="pt-1">
                <audio
                  controls
                  src={mergedAudioResult.url}
                  className="w-full h-8"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {mergedAudioResult.url && (
                <a
                  href={mergedAudioResult.url}
                  download={mergedAudioResult.fileName}
                  className="px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>💾 下載完整 MP3 檔案</span>
                </a>
              )}
              <div className="text-[11px] text-slate-400">
                本地自動備份路徑：<code className="text-amber-300 font-mono">~/NovelVoices/{project.title}/</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FFmpeg Streaming Architecture Box */}
      <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700/60 space-y-3">
        <h3 className="text-sm font-bold text-slate-300">
          Mac M1 串流合併技術規格 (Memory Safe)
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          針對十萬字甚至千萬字的大型小說，本機後端不將幾十個小時的音訊全數載入 8GB RAM，而是透過 FFmpeg Concat Demuxer 直接進行檔案描述符串流封裝：
        </p>
        <pre className="p-3 bg-slate-950 rounded-lg text-[11px] text-amber-300/90 font-mono overflow-x-auto border border-slate-800">
          {`# 後端執行的無損直接拼接指令（記憶體佔用小於 50MB）
ffmpeg -f concat -safe 0 -i chunks_list.txt -c copy full_novel_output.mp3`}
        </pre>
      </div>
    </div>
  );
};
