/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Chapter, NovelProject } from '../types';
import { splitNovelText, countCharacters, estimateAudioDuration } from '../utils/textSplitter';
import { TabKey } from './TopNav';

interface NovelImportProps {
  onAddProject: (newProject: NovelProject) => void;
  onNavigate: (tab: TabKey) => void;
}

export const NovelImport: React.FC<NovelImportProps> = ({ onAddProject, onNavigate }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [rawText, setRawText] = useState('');
  const [chapterRegexStr, setChapterRegexStr] = useState('(?:^|\\n)\\s*(第[0-9一二三四五六七八九十百千萬]+[章回節卷部篇][^\\n]*)');
  const [maxChunkChars, setMaxChunkChars] = useState(280);
  const [outputDir, setOutputDir] = useState('~/NovelVoices/');
  const [previewChapters, setPreviewChapters] = useState<Chapter[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPreviewChapterIndex, setSelectedPreviewChapterIndex] = useState(0);

  // Load long demo novel
  const handleLoadDemo = () => {
    setTitle('大荒星神傳（十萬字長篇測試精華）');
    setAuthor('夢入神機');
    setOutputDir('~/NovelVoices/dahuang');

    const demoChaptersText = `第一章 北嶺獵獸，偶得星石
茫茫十萬大山，積雪漫山，狂風呼嘯如巨獸低鳴。
少年葉辰伏在雪嶺邊緣，手中緊握玄鐵硬弓，雙眸冷靜地盯著百丈之外的一頭通體雪白的冰魄靈鹿。
在天南大陸，武者開闢命宮，接引九天星辰之力方能淬體成聖。葉辰自幼父母雙亡，寄居在葉家外堂，因命宮閉塞，被族人視為無法修行的廢柴。然而他從未放棄，每日天未破曉便深入雪山深處採藥搏獸。
忽然，冰魄靈鹿警惕地豎起長耳，轉身化作一道白色殘影朝深谷疾馳。
幾乎在同時，高空雲層被撕開一道巨大的赤色裂痕，一枚通體纏繞著混沌雷光的赤紅隕石呼嘯墜落，宛如烈陽墜地，重重砸在數里外的雪谷之中，掀起滔天雪浪！
「那是九天星隕？！」葉辰心神劇震，握緊短刀，踩著厚厚的積雪快步朝著撞擊核心掠去。

第二章 命宮重開，太古星帝訣
墜落之處化為一片焦黑的天坑，滾滾熱浪升騰，四周冰雪瞬間消融殆盡。
在那深坑的最中央，靜靜躺著一枚龍眼大小的菱形晶石，其上流轉著紫金色的古老星紋，深邃浩瀚如一整座微型銀河。
葉辰剛邁步踏入深坑，那枚菱形星石彷彿生出靈性一般，猛地爆發出一道沖天紫金光柱，徑直沒入他的眉心！
「啊——！」
一股足以焚山煮海的磅礡能量瞬間湧入葉辰四肢百骸。他體內多年阻塞死寂的三十六道經脈，在此刻如同乾涸的河床遭遇暴洪，被摧枯拉朽般生生衝破！
腦海深處，一道古老而威嚴的宏大天音悠悠迴盪：
「吾乃太古荒星神帝，受奸人所害神體崩碎。今留《太古星帝訣》待有緣人，若承吾道，必逆九天！」
葉辰咬緊牙關，任由筋脈撕裂重組，額頭青筋暴起，卻死死咬住舌尖不讓自己昏迷過去。
不知過了多久，劇痛化為一股溫潤充沛的清涼之氣。他內視己身，赫然發現自己原本黯淡無光的命宮之中，竟然點亮了九顆璀璨的本命星辰！
「命宮……終於開闢了！」葉辰仰天長嘯，眼眶微紅。

第三章 踏雪歸宗，族會風雲起
三日之後，落葉城葉家府邸前張燈結綵，三年一度的族內年會即將拉開帷幕。
演武場周圍座無虛席，年輕一代的葉家子弟個個摩拳擦掌，眼神熾熱。
「聽說外堂那個廢物葉辰已經進山三日未歸，怕不是早已葬身妖獸之腹了吧？」一名錦衣少年譏笑道。
「死了也是活該，一個連命宮都無法覺醒的下人，留在葉家也是白白浪費米糧。」另一人附和道。
正在眾人冷嘲熱諷之際，府邸大門外傳來沉穩有力的腳步聲。
只見一名身披獸皮大氅的少年踏步而入，黑髮隨風飄揚，雙眸如寒星般深邃，背後背著一口用布裹住的沉重兵刃，正是歷經脫胎換骨歸來的葉辰！
主座之上，葉家族長與長老們眉頭一皺，顯然感應到了少年身上那股沉凝如淵的浩瀚氣血……`;

    setRawText(demoChaptersText);
    runAnalysis(demoChaptersText, '(?:^|\\n)\\s*(第[0-9一二三四五六七八九十百千萬]+[章回節卷部篇][^\\n]*)', maxChunkChars);
  };

  // Handle local text file selection via HTML5 FileReader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(cleanName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        runAnalysis(content, chapterRegexStr, maxChunkChars);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const runAnalysis = (textToAnalyze: string, regexStr: string, chunkLimit: number) => {
    setIsAnalyzing(true);
    try {
      const chapters = splitNovelText(textToAnalyze, {
        projectId: 'import_temp',
        chapterRegexStr: regexStr,
        maxChunkChars: chunkLimit,
      });
      setPreviewChapters(chapters);
      setSelectedPreviewChapterIndex(0);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualAnalyze = () => {
    if (!rawText.trim()) return;
    runAnalysis(rawText, chapterRegexStr, maxChunkChars);
  };

  // Submit and create real project
  const handleCreateProject = () => {
    if (!title.trim()) {
      alert('請輸入小說名稱');
      return;
    }
    if (!rawText.trim()) {
      alert('請貼上小說文字或匯入 TXT 檔案');
      return;
    }

    const projectId = `proj_${Date.now()}`;
    const finalizedChapters = splitNovelText(rawText, {
      projectId,
      chapterRegexStr,
      maxChunkChars,
    });

    const totalWords = finalizedChapters.reduce((sum, ch) => sum + ch.totalWords, 0);

    const newProject: NovelProject = {
      id: projectId,
      title: title.trim(),
      author: author.trim() || '佚名',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalWords,
      chapters: finalizedChapters,
      voiceSettings: {
        voiceCode: 'zh-CN-YunxiNeural',
        displayName: '雲希 (Yunxi) - 微軟 Edge 青年男聲',
        gender: 'male',
        rate: '+0%',
        pitch: '+0Hz',
        volume: '+0%',
      },
      status: 'draft',
      outputDirectory: outputDir.trim() || '~/NovelVoices/',
    };

    onAddProject(newProject);
    onNavigate('maker');
  };

  const rawCharCount = countCharacters(rawText);
  const totalParagraphCount = previewChapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0);

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">長篇小說匯入與智慧分段</h1>
          <p className="text-xs text-slate-400 mt-1">
            支援直接貼上文字或選擇本機 TXT 檔，自動依標點斷句與章節切割，保障 M1 8GB 記憶體流暢度
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLoadDemo}
            className="px-3.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors whitespace-nowrap"
          >
            載入十萬字長篇小說範例
          </button>
        </div>
      </div>

      {/* Input Form & Split Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input Form (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
            <h2 className="text-sm font-bold text-slate-200">1. 小說基本資訊</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  小說書名 <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：凡人修仙傳、遮天"
                  className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  作者名
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="例如：忘語、辰東"
                  className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                本機儲存與輸出資料夾
              </label>
              <input
                type="text"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder="~/NovelVoices/my_novel"
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                分段音訊與合併 MP3 將保存在此 Mac 本機路徑，完全不傳送至雲端。
              </p>
            </div>
          </div>

          {/* File Picker or Paste */}
          <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200">2. 文字來源與匯入</h2>
              <label className="cursor-pointer px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors border border-slate-600 flex items-center gap-2">
                <span>選擇本機 TXT 檔案</span>
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                }}
                rows={12}
                placeholder="在此貼上小說全文（支援數萬至十萬字以上），或點擊上方「選擇本機 TXT 檔案」直接載入..."
                className="w-full p-3.5 text-xs font-mono leading-relaxed bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-400 resize-y"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span>字數統計：{rawCharCount.toLocaleString()} 字</span>
                <span aria-hidden="true">·</span>
                <span>預估時長：{estimateAudioDuration(rawCharCount)}</span>
              </div>
              <button
                onClick={handleManualAnalyze}
                disabled={!rawText.trim() || isAnalyzing}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-40"
              >
                {isAnalyzing ? '切段計算中...' : '重新套用切段規則'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Splitting Controls & Live Stats */}
        <div className="space-y-5">
          <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
            <h2 className="text-sm font-bold text-slate-200">3. 智慧分段防截斷規則</h2>
            
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                章節識別正規表示式 (Regex)
              </label>
              <input
                type="text"
                value={chapterRegexStr}
                onChange={(e) => setChapterRegexStr(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-amber-400"
              />
              <div className="flex flex-wrap gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const pattern = '(?:^|\\n)\\s*(第[0-9一二三四五六七八九十百千萬]+[章回節卷部篇][^\\n]*)';
                    setChapterRegexStr(pattern);
                    runAnalysis(rawText, pattern, maxChunkChars);
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded border border-slate-700"
                >
                  第X章/回/節
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pattern = '(?:^|\\n)\\s*(Chapter\\s*\\d+[^\\n]*)';
                    setChapterRegexStr(pattern);
                    runAnalysis(rawText, pattern, maxChunkChars);
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded border border-slate-700"
                >
                  Chapter X
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-700/50">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300">單段最大字數上限</span>
                <span className="font-mono tabular-nums text-amber-400 font-semibold">
                  {maxChunkChars} 字
                </span>
              </div>
              <input
                type="range"
                min={150}
                max={450}
                step={10}
                value={maxChunkChars}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaxChunkChars(val);
                  runAnalysis(rawText, chapterRegexStr, val);
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                建議值 250~300 字。段落嚴格依據句號「。」「！」「？」等標點斷開，絕對不會在句子中間截斷。
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <h2 className="text-sm font-bold text-slate-200">切段分析結果</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-700/50 text-slate-400">
                <span>識別出章節</span>
                <span className="font-mono tabular-nums font-semibold text-slate-200">
                  {previewChapters.length} 章
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700/50 text-slate-400">
                <span>預計切分段落</span>
                <span className="font-mono tabular-nums font-semibold text-slate-200">
                  {totalParagraphCount} 段
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700/50 text-slate-400">
                <span>平均每段字數</span>
                <span className="font-mono tabular-nums font-semibold text-slate-200">
                  {totalParagraphCount > 0
                    ? Math.round(rawCharCount / totalParagraphCount)
                    : 0}{' '}
                  字/段
                </span>
              </div>
            </div>

            <button
              onClick={handleCreateProject}
              disabled={previewChapters.length === 0}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:hover:bg-amber-400 rounded-lg transition-colors shadow-sm mt-2"
            >
              建立專案並前往配音室 →
            </button>
          </div>
        </div>
      </div>

      {/* Chapters & Paragraphs Live Preview */}
      {previewChapters.length > 0 && (
        <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">切段預覽與防斷句檢驗</h2>
            <div className="flex items-center gap-2 overflow-x-auto max-w-lg scrollbar-none py-1">
              {previewChapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedPreviewChapterIndex(idx)}
                  className={`px-3 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                    selectedPreviewChapterIndex === idx
                      ? 'bg-amber-400 text-slate-900 font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ch.title.length > 12 ? ch.title.slice(0, 12) + '...' : ch.title}
                </button>
              ))}
            </div>
          </div>

          {previewChapters[selectedPreviewChapterIndex] && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="font-semibold text-slate-200">
                  {previewChapters[selectedPreviewChapterIndex].title}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {previewChapters[selectedPreviewChapterIndex].totalWords} 字
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  共 {previewChapters[selectedPreviewChapterIndex].paragraphs.length} 個切段
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {previewChapters[selectedPreviewChapterIndex].paragraphs.map((para) => (
                  <div
                    key={para.id}
                    className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex justify-between items-center text-slate-400 font-mono text-[11px]">
                      <span>{para.id}</span>
                      <span className="text-amber-400 font-semibold">{para.wordCount} 字</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed line-clamp-3">
                      {para.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
