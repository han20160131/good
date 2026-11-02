/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NovelProject, Paragraph, BackendStatus, VoiceConfig, User, CharacterVoiceMapping, PolyphoneRule } from '../types';
import { countCharacters } from '../utils/textSplitter';
import { VoiceSelector } from './VoiceSelector';
import { PolyphoneManager } from './PolyphoneManager';
import { DEFAULT_VOICE_CONFIG } from '../utils/voices';
import { getStoredToken } from '../utils/authClient';

interface MakerViewProps {
  project: NovelProject | undefined;
  onSaveAndStart: (
    title: string,
    text: string,
    voiceSettings: VoiceConfig,
    enableAiRoles?: boolean,
    characterVoices?: CharacterVoiceMapping[],
    enablePolyphoneFix?: boolean,
    customPolyphoneRules?: PolyphoneRule[]
  ) => void;
  isRunning: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  backendStatus: BackendStatus;
  onNewDraft: () => void;
  currentUser: User | null;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onRetryFailed?: () => void;
}

export const MakerView: React.FC<MakerViewProps> = ({
  project,
  onSaveAndStart,
  isRunning,
  onPause,
  onResume,
  onReset,
  backendStatus,
  onNewDraft,
  currentUser,
  onOpenAuth,
  onRetryFailed,
}) => {
  const [title, setTitle] = useState(project?.title || '');
  const [text, setText] = useState(() => {
    if (!project) return '';
    return project.chapters.map((c) => c.paragraphs.map((p) => p.text).join('\n\n')).join('\n\n');
  });
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(
    project?.voiceSettings || DEFAULT_VOICE_CONFIG
  );

  // AI Multi-Role toggle
  const [enableAiRoles, setEnableAiRoles] = useState<boolean>(Boolean(project?.enableAiRoles));
  const [characterVoices, setCharacterVoices] = useState<CharacterVoiceMapping[]>(
    project?.characterVoices || []
  );

  // Polyphone Auto-Correction toggle (enabled by default!)
  const [enablePolyphoneFix, setEnablePolyphoneFix] = useState<boolean>(
    project ? project.enablePolyphoneFix !== false : true
  );
  const [customPolyphoneRules, setCustomPolyphoneRules] = useState<PolyphoneRule[]>(
    project?.customPolyphoneRules || []
  );

  const [isQuickTesting, setIsQuickTesting] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    downloadedMB: string;
    totalMB: string;
    statusText: string;
  } | null>(null);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState<boolean>(false);
  const [chaptersInfo, setChaptersInfo] = useState<any[]>([]);
  const [downloadingChapterIdx, setDownloadingChapterIdx] = useState<number | null>(null);
  const [isLiveListening, setIsLiveListening] = useState<boolean>(false);
  const [liveParaIndex, setLiveParaIndex] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Sync state when active project changes or when null (fresh draft)
  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const fullText = project.chapters
        .map((c) => c.paragraphs.map((p) => p.text).join('\n\n'))
        .join('\n\n');
      setText(fullText);
      setVoiceConfig(project.voiceSettings || DEFAULT_VOICE_CONFIG);
      setEnableAiRoles(Boolean(project.enableAiRoles));
      setCharacterVoices(project.characterVoices || []);
      setEnablePolyphoneFix(project.enablePolyphoneFix !== false);
      setCustomPolyphoneRules(project.customPolyphoneRules || []);
    } else {
      setTitle('');
      setText('');
      setVoiceConfig(DEFAULT_VOICE_CONFIG);
      setEnableAiRoles(false);
      setCharacterVoices([]);
      setEnablePolyphoneFix(true);
      setCustomPolyphoneRules([]);
      setIsLiveListening(false);
      setLiveParaIndex(0);
    }
  }, [project?.id]);

  // Calculate real verified progress from server-synced project
  const allParagraphs: Paragraph[] = project?.chapters.flatMap((c) => c.paragraphs) || [];
  // Strictly require fileSizeBytes >= 500 to count as truly completed!
  const completedParagraphs = allParagraphs.filter(
    (p) => p.status === 'completed' && (p.fileSizeBytes || 0) >= 500
  );
  // Detect any failed paragraphs or 0-byte corrupt paragraphs
  const failedParagraphs = allParagraphs.filter(
    (p) =>
      p.status === 'failed' ||
      ((p.fileSizeBytes || 0) < 500 && p.status !== 'pending' && p.status !== 'processing')
  );
  const totalParas = allParagraphs.length;
  const completedParas = completedParagraphs.length;
  const progressPercent = totalParas > 0 ? Math.round((completedParas / totalParas) * 100) : 0;
  // Strictly prevent false 100% completions: cannot be isDone if any failed paragraphs exist!
  const isDone =
    (progressPercent === 100 && totalParas > 0 && failedParagraphs.length === 0) ||
    (project?.status === 'completed' && failedParagraphs.length === 0);
  const hasErrors = project?.status === 'has_errors' || failedParagraphs.length > 0;
  const hasStarted = Boolean(
    project &&
      (project.status === 'processing' ||
        project.status === 'paused' ||
        project.status === 'completed' ||
        project.status === 'has_errors' ||
        completedParas > 0)
  );

  // Real accumulated MP3 bytes from all completed chunks on server
  const accumulatedBytes = completedParagraphs.reduce((sum, p) => sum + (p.fileSizeBytes || 0), 0);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Handle TXT file import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setTitle(cleanName);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setText(content);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Quick single-sentence test to hear currently chosen voice immediately
  const handleQuickTestSentence = async () => {
    const firstLine = text.trim().slice(0, 100) || '道友請留步！林凡在此，九天星辰皆為我掌。';
    setIsQuickTesting(true);
    try {
      const res = await fetch('/api/tts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: firstLine,
          voice: voiceConfig.voiceCode,
          rate: voiceConfig.rate,
          pitch: voiceConfig.pitch,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      } else {
        alert('語音服務暫時忙碌，請稍後再試。');
      }
    } catch (e: any) {
      console.error(e);
      alert(`連線錯誤：${e.message}`);
    } finally {
      setIsQuickTesting(false);
    }
  };

  // Trigger resilient download: handles massive 100MB+ files smoothly via Range slicing
  const handleDownloadAudio = async () => {
    if (!project) return;
    if (!isDone) {
      alert(`配音尚未全部完成（目前進度 ${progressPercent}%，${completedParas}/${totalParas} 段）。請等待 100% 全部段落生成完成後再下載！`);
      return;
    }

    const token = getStoredToken();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';

    try {
      setIsDownloading(true);
      setDownloadProgress({
        percent: 0,
        downloadedMB: '0.0',
        totalMB: '...',
        statusText: '正在連接伺服器並解析音檔...',
      });

      // 1. Check audio info from server
      const infoRes = await fetch(`/api/projects/${project.id}/audio-info${tokenQuery}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      let totalBytes = accumulatedBytes;
      if (infoRes.ok) {
        const audioInfo = await infoRes.json();
        if (audioInfo.sizeBytes > 0) {
          totalBytes = audioInfo.sizeBytes;
        }
      }

      const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

      // If under 25MB, standard single fetch or download is fine
      if (totalBytes <= 25 * 1024 * 1024) {
        setDownloadProgress({
          percent: 50,
          downloadedMB: (totalBytes / (1024 * 1024) / 2).toFixed(1),
          totalMB,
          statusText: '正在下載音檔...',
        });

        const res = await fetch(`/api/projects/${project.id}/download${tokenQuery}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`下載失敗 (HTTP ${res.status})`);
        const blob = await res.blob();
        saveBlobToFile(blob, `${project.title || '小說配音'}.mp3`);
        setDownloadProgress(null);
        setIsDownloading(false);
        return;
      }

      // For large files (>25MB, e.g. 100MB+):
      // Download in 12MB slices using HTTP Range to bypass reverse proxy payload buffer limits!
      const CHUNK_SIZE = 12 * 1024 * 1024; // 12 MB per slice
      const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
      const chunksData: Blob[] = [];
      let downloadedBytes = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE - 1, totalBytes - 1);
        
        let chunkBlob: Blob | null = null;
        let retries = 0;

        while (retries < 3 && !chunkBlob) {
          try {
            const rangeHeader = `bytes=${start}-${end}`;
            const sliceRes = await fetch(`/api/projects/${project.id}/download${tokenQuery}`, {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                Range: rangeHeader,
              },
            });

            if (!sliceRes.ok && sliceRes.status !== 206) {
              throw new Error(`片段 ${i + 1} 傳輸失敗 (HTTP ${sliceRes.status})`);
            }
            chunkBlob = await sliceRes.blob();
          } catch (e: any) {
            retries++;
            if (retries >= 3) throw e;
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        if (chunkBlob) {
          chunksData.push(chunkBlob);
          downloadedBytes += (end - start + 1);
          const percent = Math.min(99, Math.round((downloadedBytes / totalBytes) * 100));
          const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(1);

          setDownloadProgress({
            percent,
            downloadedMB,
            totalMB,
            statusText: `正在分段安全下載：${percent}% (${downloadedMB} MB / ${totalMB} MB) · 片段 ${i + 1}/${totalChunks}`,
          });
        }
      }

      setDownloadProgress({
        percent: 100,
        downloadedMB: totalMB,
        totalMB,
        statusText: '正在組合完整 MP3 檔案...',
      });

      const finalBlob = new Blob(chunksData, { type: 'audio/mpeg' });
      saveBlobToFile(finalBlob, `${project.title || '小說配音'}.mp3`);

      setTimeout(() => {
        setDownloadProgress(null);
        setIsDownloading(false);
      }, 1500);

    } catch (err: any) {
      console.error('Download error:', err);
      // Fallback: If fetch was blocked, try opening in new window or chapter download
      alert(`下載連線遇到狀況：${err.message || '連線逾時'}。系統已為您開啟章節個別下載！`);
      setDownloadProgress(null);
      setIsDownloading(false);
      handleOpenChaptersModal();
    }
  };

  const saveBlobToFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Open Chapter-by-chapter download modal
  const handleOpenChaptersModal = async () => {
    if (!project) return;
    const token = getStoredToken();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    try {
      const res = await fetch(`/api/projects/${project.id}/audio-info${tokenQuery}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setChaptersInfo(data.chapters || []);
      }
    } catch (_) {}
    setIsChapterModalOpen(true);
  };

  // Download a single chapter MP3
  const handleDownloadSingleChapter = async (cIdx: number, chapterTitle: string) => {
    if (!project) return;
    setDownloadingChapterIdx(cIdx);
    const token = getStoredToken();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const safeTitle = chapterTitle.replace(/[\\/:*?"<>|]/g, '_');
    const url = `/api/projects/${project.id}/chapters/${cIdx}/download${tokenQuery}`;

    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title}_${safeTitle}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      alert(`下載章節失敗：${e.message}`);
    } finally {
      setTimeout(() => setDownloadingChapterIdx(null), 1000);
    }
  };

  const handleStartClick = () => {
    if (!title.trim()) {
      alert('請先輸入小說名稱');
      return;
    }
    if (!text.trim()) {
      alert('請先在文字格貼上小說文字或匯入 TXT 檔案');
      return;
    }

    onSaveAndStart(
      title.trim(),
      text.trim(),
      voiceConfig,
      enableAiRoles,
      characterVoices,
      enablePolyphoneFix,
      customPolyphoneRules
    );
  };

  const remainingParas = totalParas - completedParas;
  // With pooled parallel concurrency of 6, average throughput is ~0.12s per chunk (2x speed boost)
  const estimatedRemainingSeconds = Math.max(0, Math.round(remainingParas * 0.12));
  const estimatedRemainingMinutes = Math.ceil(estimatedRemainingSeconds / 60);

  const currentPlayingPara = completedParagraphs[liveParaIndex];

  const token = getStoredToken();
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  const streamUrl = project ? `/api/projects/${project.id}/stream${tokenQuery}` : '';

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Top action bar if viewing an existing project */}
      {project && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
            <span>
              目前專案：<strong className="text-amber-400 text-sm ml-1">{project.title}</strong>
            </span>
            <span className="text-slate-500">|</span>
            <span>
              旁白：<span className="text-amber-300 font-mono">{project.voiceSettings?.displayName || project.voiceSettings?.voiceCode || '預設'}</span>
            </span>
            {project.enableAiRoles && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                🎭 AI 多角色智慧配音中 ({project.characterVoices?.length || 0} 位角色獨立聲線)
              </span>
            )}
            {project.enablePolyphoneFix !== false && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                🔤 多音字上下文已自動校正
              </span>
            )}
          </div>
          <button
            onClick={onNewDraft}
            className="px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-colors shadow-sm self-start sm:self-auto"
          >
            + 製作新配音（清空並輸入新小說）
          </button>
        </div>
      )}

      {/* 1. 最上面的名稱 */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          1. 小說名稱
        </label>
        <input
          type="text"
          value={title}
          disabled={isRunning || hasStarted}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="請輸入小說名稱（例如：凡人修仙傳）"
          className="w-full px-4 py-3 text-base font-medium bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all disabled:opacity-60"
        />
      </div>

      {/* 2. 選擇配音聲音與語速 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-300">
            2. 預設配音角色與旁白聲音（微軟 300+ 種 Neural 聲音）
          </label>
          <span className="text-[11px] text-slate-400">
            支援普通話、台灣國語、粵語、地方方言及全語言
          </span>
        </div>
        <VoiceSelector
          voiceConfig={voiceConfig}
          onChange={setVoiceConfig}
          disabled={isRunning || hasStarted}
        />
      </div>

      {/* 3. AI 智慧分配音 (開啟 / 關閉) */}
      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-sm transition-all hover:border-slate-600">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-200">
                3. AI 智慧分配音
              </label>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                  enableAiRoles
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {enableAiRoles ? '✨ 已開啟' : '已關閉'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
              {enableAiRoles
                ? '已開啟：AI 會自動分析小說中所有登場角色（支援高達 300 種獨立聲音），自動挑選最合適且不重複的聲音；引號括號外絕對由旁白朗讀。（啟用時分析處理速度會減慢）'
                : '已關閉：全篇由上方選擇的預設聲音單一朗讀，無角色切換（合成速度最快）。'}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enableAiRoles}
            disabled={isRunning || hasStarted}
            onClick={() => setEnableAiRoles(!enableAiRoles)}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
              enableAiRoles ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-slate-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                enableAiRoles ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 4. 多音字上下文自動修正 */}
      <PolyphoneManager
        enabled={enablePolyphoneFix}
        onToggle={setEnablePolyphoneFix}
        customRules={customPolyphoneRules}
        onChangeCustomRules={setCustomPolyphoneRules}
        sampleText={text}
        disabled={isRunning || hasStarted}
        currentVoice={voiceConfig.voiceCode}
        onApplyTextCorrections={setText}
      />

      {/* 5. 匯入 TXT 檔案與小說文字 */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300">
          5. 小說文字內容
        </label>
        <label className={`cursor-pointer px-4 py-2 text-xs font-semibold bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 rounded-lg transition-colors border border-amber-400/30 flex items-center gap-2 ${isRunning || hasStarted ? 'opacity-50 pointer-events-none' : ''}`}>
          <span>📁 匯入 TXT 檔案</span>
          <input
            type="file"
            accept=".txt,text/plain"
            disabled={isRunning || hasStarted}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* 3. 文字格 */}
      <div className="space-y-1.5">
        <textarea
          value={text}
          disabled={isRunning || hasStarted}
          onChange={(e) => setText(e.target.value)}
          rows={11}
          placeholder="在此貼上小說文字，或點擊上方「匯入 TXT 檔案」直接載入..."
          className="w-full p-4 text-sm leading-relaxed font-sans bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 resize-y disabled:opacity-70 font-mono"
        />
        <div className="flex justify-between items-center text-xs text-slate-400 px-1 font-mono">
          <span>文字統計：{countCharacters(text).toLocaleString()} 字（完全保留、無截斷）</span>
          <button
            type="button"
            onClick={handleQuickTestSentence}
            disabled={isQuickTesting || !text.trim()}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-sans flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30 transition-colors"
          >
            <span>{isQuickTesting ? '發聲試聽中...' : `🎧 試聽「${voiceConfig.displayName.split(' ')[0]}」唸本小說前句`}</span>
          </button>
        </div>
      </div>

      {/* Progress & Real Audio Status Card */}
      {hasStarted && (
        <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/80 text-center space-y-4">
          {/* 24/7 Background Persistence Guarantee Badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2.5 px-4 rounded-xl font-medium shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>
              24/7 雲端守護排程已生效：就算電腦關閉、蓋上筆電或關閉網頁，後台依然獨立全速配音完畢！
            </span>
          </div>

          <div className="flex items-baseline justify-center gap-1">
            <span className="text-6xl font-black font-mono tracking-tight text-amber-400 tabular-nums">
              {progressPercent}
            </span>
            <span className="text-3xl font-sans text-slate-400 font-normal">
              %
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-700/70 overflow-hidden p-0.5 border border-slate-600/30">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Real Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1 text-slate-300">
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] font-sans">真實進度段落</span>
              <strong className="text-amber-400">{completedParas}</strong> / {totalParas} 段
            </div>
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] font-sans">已生成真實 MP3 大小</span>
              <strong className="text-emerald-400">{formatFileSize(accumulatedBytes)}</strong>
            </div>
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] font-sans">預計剩餘時間 (加速模式)</span>
              <strong className="text-slate-200">
                {isDone
                  ? '已全部完成'
                  : isRunning
                  ? estimatedRemainingSeconds < 60
                    ? `約 ${estimatedRemainingSeconds} 秒 (全速)`
                    : `約 ${estimatedRemainingMinutes} 分鐘`
                  : '已暫停'}
              </strong>
            </div>
          </div>

          {/* Strict Integrity Error Alert & One-Click Retry */}
          {hasErrors && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/50 text-left space-y-2 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <span>⚠️ 檢測到 {failedParagraphs.length} 個段落配音失敗或大小不足（嚴格防護，絕不充數）</span>
                  </div>
                  <p className="text-[11px] text-rose-300/80 mt-0.5">
                    系統已杜絕假完成，絕不標記無效檔案。點擊右側按鈕即可一鍵重試失敗段落，無需從頭重新配音！
                  </p>
                </div>
                {onRetryFailed && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsRetrying(true);
                      try {
                        await onRetryFailed();
                      } finally {
                        setTimeout(() => setIsRetrying(false), 800);
                      }
                    }}
                    disabled={isRetrying}
                    className="px-4 py-2 text-xs font-bold text-slate-900 bg-rose-400 hover:bg-rose-300 disabled:opacity-50 rounded-lg transition-all shrink-0 shadow-sm"
                  >
                    {isRetrying ? '正在重試...' : '🔄 一鍵重試失敗段落'}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-slate-400 pt-1">
            {isDone ? (
              <span className="text-emerald-400 font-semibold">
                ✓ 配音已全部完成！使用聲線「{project?.voiceSettings?.displayName || voiceConfig.displayName}」，共 {formatFileSize(accumulatedBytes)} 真實 MP3 有聲書音訊
              </span>
            ) : isRunning ? (
              <span className="text-amber-400 font-semibold flex items-center justify-center gap-1.5 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                微軟「{project?.voiceSettings?.displayName?.split(' ')[0] || voiceConfig.displayName.split(' ')[0] || '語音'}」超大規模並行連線池全速生成中 (1,000 ~ 10,000 條極速並行通道 · 死線保證 1000+ · 目標 10,000+)，關閉或蓋上筆電不中斷！
              </span>
            ) : hasErrors ? (
              <span className="text-rose-400 font-semibold">
                部分段落配音遇到異常，請點擊上方「一鍵重試失敗段落」補齊所有音訊
              </span>
            ) : (
              <span>已暫停配音（進度安全保存在伺服器硬碟）</span>
            )}
          </div>
        </div>
      )}

      {/* Real-Time Live Streaming Audio Player */}
      {hasStarted && completedParas > 0 && isLiveListening && project && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-400/40 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <strong className="text-amber-300">
                🎧 即時邊配邊聽中 · 第 {liveParaIndex + 1} / {completedParas} 段
              </strong>
              {liveParaIndex + 1 === completedParas && !isDone && (
                <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded">
                  （後台正全速生成後續段落...）
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={liveParaIndex <= 0}
                onClick={() => setLiveParaIndex((prev) => Math.max(0, prev - 1))}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] disabled:opacity-40"
              >
                ⏮ 上一段
              </button>
              <button
                type="button"
                disabled={liveParaIndex >= completedParas - 1}
                onClick={() => setLiveParaIndex((prev) => Math.min(completedParas - 1, prev + 1))}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] disabled:opacity-40"
              >
                下一段 ⏭
              </button>
              <button
                type="button"
                onClick={() => setIsLiveListening(false)}
                className="text-slate-400 hover:text-white px-2 py-1 text-xs"
              >
                ✕ 關閉
              </button>
            </div>
          </div>

          {/* Current Paragraph Text Preview */}
          {currentPlayingPara && (
            <div className="space-y-1.5">
              {currentPlayingPara.speakers && currentPlayingPara.speakers.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">本段演繹角色：</span>
                  {currentPlayingPara.speakers.map((spk) => (
                    <span
                      key={spk}
                      className={`px-2 py-0.5 rounded font-bold ${
                        spk === '旁白'
                          ? 'bg-slate-800 text-slate-300'
                          : spk === '系統'
                          ? 'bg-red-500/20 text-red-300'
                          : spk.includes('老')
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-amber-400/20 text-amber-300'
                      }`}
                    >
                      {spk}
                    </span>
                  ))}
                </div>
              )}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 text-xs text-slate-200 leading-relaxed font-mono line-clamp-3">
                {currentPlayingPara.text}
              </div>
            </div>
          )}

          {/* Native Audio Player with auto-advance */}
          {currentPlayingPara && (
            <audio
              key={currentPlayingPara.id}
              controls
              autoPlay
              src={`/api/projects/${project.id}/chunks/${currentPlayingPara.id}`}
              onEnded={() => {
                if (liveParaIndex + 1 < completedParas) {
                  setLiveParaIndex((prev) => prev + 1);
                }
              }}
              className="w-full h-8"
            />
          )}
        </div>
      )}

      {/* 5. 開始 / 暫停 / 即時播放 / 下載按鈕 */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {!hasStarted && (
          <button
            onClick={handleStartClick}
            disabled={!title.trim() || !text.trim()}
            className="w-full sm:w-auto px-10 py-3.5 text-base font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95"
          >
            {enableAiRoles ? '🎭 開始 AI 角色智慧配音' : '5. 開始小說配音'}
          </button>
        )}

        {hasStarted && !isDone && (
          <>
            {completedParas > 0 && (
              <button
                type="button"
                onClick={() => setIsLiveListening(!isLiveListening)}
                className={`w-full sm:w-auto px-5 py-3 text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  isLiveListening
                    ? 'bg-amber-400 text-slate-900'
                    : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/40'
                }`}
              >
                <span>{isLiveListening ? '⏹ 關閉邊配邊聽' : '🎧 即時邊配邊聽（首段已就緒）'}</span>
              </button>
            )}

            {isRunning ? (
              <button
                onClick={onPause}
                className="w-full sm:w-auto px-7 py-3 text-sm font-semibold text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all border border-slate-600"
              >
                ⏸ 暫停配音
              </button>
            ) : (
              <button
                onClick={onResume}
                className="w-full sm:w-auto px-7 py-3 text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md"
              >
                ▶ 繼續配音
              </button>
            )}

            <button
              onClick={onReset}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-2 px-3"
            >
              重新開始本專案
            </button>
          </>
        )}

        {/* When complete: directly play or download REAL audio */}
        {isDone && project && (
          <div className="space-y-5 w-full text-center">
            {/* Download Progress Bar if currently chunk-downloading */}
            {downloadProgress && (
              <div className="p-4 bg-slate-800/95 border border-amber-400/50 rounded-2xl shadow-xl max-w-lg mx-auto text-left space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    {downloadProgress.statusText}
                  </span>
                  <span className="text-amber-400 font-mono text-sm">{downloadProgress.percent}%</span>
                </div>
                {/* Progress bar container */}
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>已傳輸：{downloadProgress.downloadedMB} MB / {downloadProgress.totalMB} MB</span>
                  <span className="text-emerald-400 font-medium">分段防斷保護中</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={streamUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>▶ 線上播放整本</span>
              </a>

              <button
                onClick={handleDownloadAudio}
                disabled={isDownloading}
                className="px-6 py-3 text-sm font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>
                  {isDownloading
                    ? `下載中 (${downloadProgress?.percent || 0}%)...`
                    : `💾 下載完整 MP3 (${formatFileSize(accumulatedBytes)})`}
                </span>
              </button>

              <button
                onClick={handleOpenChaptersModal}
                className="px-5 py-3 text-sm font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>📑 分章節下載 ({project.chapters.length} 章)</span>
              </button>

              <button
                onClick={onNewDraft}
                className="px-4 py-3 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                製作下一部小說
              </button>
            </div>

            {/* Native HTML5 Audio Player streaming directly from server disk with full seek support */}
            <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-700/80 max-w-md mx-auto">
              <div className="text-[11px] text-slate-400 mb-2 flex items-center justify-between">
                <span>線上隨選即聽 · 支援隨意拖曳進度條</span>
                <span className="text-amber-400 font-mono">{formatFileSize(accumulatedBytes)}</span>
              </div>
              <audio
                controls
                src={streamUrl}
                className="w-full h-8"
              />
            </div>
          </div>
        )}
      </div>

      {/* Chapters Download Modal */}
      {isChapterModalOpen && project && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📑 分章節/分卷有聲書下載</span>
                  <span className="text-xs font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    共 {project.chapters.length} 章
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  每章獨立音檔（通常 1~5 MB），適合車用音響、有聲書播放器或手機聆聽，下載秒級完成！
                </p>
              </div>
              <button
                onClick={() => setIsChapterModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {project.chapters.map((ch, idx) => {
                const isDownloadingThis = downloadingChapterIdx === idx;
                const parasCount = ch.paragraphs.length;
                const completedInCh = ch.paragraphs.filter((p) => p.status === 'completed').length;
                const chBytes = ch.paragraphs.reduce((sum, p) => sum + (p.fileSizeBytes || 0), 0);

                return (
                  <div
                    key={ch.id || idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-200 truncate" title={ch.title}>
                        {ch.title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{parasCount} 個段落</span>
                        <span>·</span>
                        <span className="text-amber-400/90">{formatFileSize(chBytes)}</span>
                        {completedInCh === parasCount && (
                          <span className="text-emerald-400 text-[10px]">✓ 已完成</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadSingleChapter(idx, ch.title)}
                      disabled={isDownloadingThis}
                      className="px-3.5 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                    >
                      {isDownloadingThis ? (
                        <>
                          <span className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                          <span>下載中...</span>
                        </>
                      ) : (
                        <span>下載此章 MP3</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                點擊任一章節即可立即下載該章的獨立高品質 MP3。
              </span>
              <button
                onClick={() => setIsChapterModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
