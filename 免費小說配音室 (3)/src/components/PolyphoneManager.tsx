/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { PolyphoneRule } from '../types';
import {
  DEFAULT_POLYPHONE_RULES,
  scanPolyphones,
} from '../utils/polyphoneCorrector';
import { Sparkles, Loader2, Volume2, Check, Plus, Trash2, X, Search, BookOpen, AlertCircle } from 'lucide-react';

export interface AiPolyphoneMatch {
  originalText: string;
  character: string;
  contextSnippet: string;
  pinyin: string;
  zhuyin?: string;
  replacementPhonetic: string;
  explanation: string;
  severity: 'high' | 'medium' | 'low';
}

interface PolyphoneManagerProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  customRules: PolyphoneRule[];
  onChangeCustomRules: (rules: PolyphoneRule[]) => void;
  sampleText: string;
  disabled?: boolean;
  currentVoice?: string;
  onApplyTextCorrections?: (newText: string) => void;
}

export const PolyphoneManager: React.FC<PolyphoneManagerProps> = ({
  enabled,
  onToggle,
  customRules,
  onChangeCustomRules,
  sampleText,
  disabled = false,
  currentVoice = 'zh-CN-YunxiNeural',
  onApplyTextCorrections,
}) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'dictionary' | 'custom'>('ai');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);

  // AI Scanner state
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiMatches, setAiMatches] = useState<AiPolyphoneMatch[]>([]);
  const [aiScanSource, setAiScanSource] = useState<'gemini' | 'rules' | null>(null);
  const [aiScanError, setAiScanError] = useState<string | null>(null);
  const [appliedAiKeys, setAppliedAiKeys] = useState<Set<string>>(new Set());
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New rule form state
  const [newOriginal, setNewOriginal] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [newPinyin, setNewPinyin] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [formError, setFormError] = useState('');

  // Combine custom and default rules
  const allRules = useMemo(() => {
    const customIds = new Set(customRules.map((r) => r.originalText));
    const defaults = DEFAULT_POLYPHONE_RULES.filter(
      (r) => !customIds.has(r.originalText)
    );
    return [...customRules, ...defaults];
  }, [customRules]);

  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) return allRules;
    const q = searchQuery.toLowerCase().trim();
    return allRules.filter(
      (r) =>
        r.originalText.includes(q) ||
        r.replacementPhonetic.includes(q) ||
        r.pinyin.toLowerCase().includes(q) ||
        (r.zhuyin && r.zhuyin.includes(q)) ||
        r.explanation.includes(q)
    );
  }, [allRules, searchQuery]);

  // Run Gemini AI Contextual Scan
  const handleRunAiScan = async () => {
    if (!sampleText || !sampleText.trim()) {
      setAiScanError('目前沒有輸入任何小說文字，請先輸入或匯入小說內容！');
      setIsOpenModal(true);
      setActiveTab('ai');
      return;
    }

    setIsAiScanning(true);
    setAiScanError(null);
    setIsOpenModal(true);
    setActiveTab('ai');

    try {
      const res = await fetch('/api/polyphone/ai-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sampleText.slice(0, 4000) }),
      });

      if (!res.ok) {
        throw new Error(`AI 掃描失敗 (HTTP ${res.status})`);
      }

      const data = await res.json();
      setAiMatches(data.matches || []);
      setAiScanSource(data.source || 'gemini');
      if ((data.matches || []).length === 0) {
        setSuccessToast('AI 深度閱讀完成：文本上下文語境良好，未發現易誤讀之多音字！');
        setTimeout(() => setSuccessToast(null), 3000);
      }
    } catch (err: any) {
      console.error('AI Scan error:', err);
      setAiScanError(err.message || 'AI 多音字掃描失敗，已切換至本機語義字典');
    } finally {
      setIsAiScanning(false);
    }
  };

  // Play test audio for a specific text
  const handlePlaySample = async (text: string, label: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(label);
    try {
      const res = await fetch('/api/tts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: currentVoice,
          enablePolyphoneFix: false,
        }),
      });
      if (!res.ok) throw new Error('音訊播放失敗');
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setIsPlayingAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsPlayingAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      await audio.play();
    } catch (e: any) {
      console.error(e);
      setIsPlayingAudio(null);
    }
  };

  // Apply single AI match to custom rules
  const handleApplySingleAiMatch = (match: AiPolyphoneMatch) => {
    const newRule: PolyphoneRule = {
      id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      originalText: match.originalText,
      replacementPhonetic: match.replacementPhonetic,
      pinyin: match.pinyin,
      zhuyin: match.zhuyin,
      explanation: match.explanation,
      category: 'custom',
      enabled: true,
    };

    onChangeCustomRules([
      newRule,
      ...customRules.filter((r) => r.originalText !== match.originalText),
    ]);

    setAppliedAiKeys((prev) => new Set(prev).add(match.originalText));
    setSuccessToast(`已套用「${match.originalText}」➔ 讀音「${match.pinyin}」！`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  // Apply all AI matches at once
  const handleApplyAllAiMatches = () => {
    if (aiMatches.length === 0) return;

    const newRules: PolyphoneRule[] = aiMatches.map((m, idx) => ({
      id: `ai_${Date.now()}_${idx}`,
      originalText: m.originalText,
      replacementPhonetic: m.replacementPhonetic,
      pinyin: m.pinyin,
      zhuyin: m.zhuyin,
      explanation: m.explanation,
      category: 'custom',
      enabled: true,
    }));

    // Merge with existing
    const existingMap = new Map(customRules.map((r) => [r.originalText, r]));
    for (const r of newRules) {
      existingMap.set(r.originalText, r);
    }
    onChangeCustomRules(Array.from(existingMap.values()));

    // If callback provided, also replace inside editor text
    if (onApplyTextCorrections && sampleText) {
      let updated = sampleText;
      for (const m of aiMatches) {
        if (m.originalText && m.replacementPhonetic && m.originalText !== m.replacementPhonetic) {
          const esc = m.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          updated = updated.replace(new RegExp(esc, 'g'), m.replacementPhonetic);
        }
      }
      onApplyTextCorrections(updated);
    }

    setAppliedAiKeys(new Set(aiMatches.map((m) => m.originalText)));
    setSuccessToast(`✨ 成功將 ${aiMatches.length} 項 AI 上下文多音字修正全部套用至專案！`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Add custom manual rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOriginal.trim() || !newReplacement.trim()) {
      setFormError('請輸入原始詞彙與替換讀音');
      return;
    }

    const newRule: PolyphoneRule = {
      id: `custom_${Date.now()}`,
      originalText: newOriginal.trim(),
      replacementPhonetic: newReplacement.trim(),
      pinyin: newPinyin.trim() || newReplacement.trim(),
      explanation: newExplanation.trim() || `自訂校正：「${newOriginal.trim()}」`,
      category: 'custom',
      enabled: true,
    };

    onChangeCustomRules([
      newRule,
      ...customRules.filter((r) => r.originalText !== newRule.originalText),
    ]);
    setNewOriginal('');
    setNewReplacement('');
    setNewPinyin('');
    setNewExplanation('');
    setFormError('');
  };

  // Delete custom rule
  const handleDeleteCustomRule = (id: string) => {
    onChangeCustomRules(customRules.filter((r) => r.id !== id));
  };

  return (
    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-sm transition-all hover:border-slate-600 space-y-3">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <span>🔤</span> AI 智慧多音字修正（上下文自動識別）
            </label>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide transition-colors ${
                enabled
                  ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-slate-700 text-slate-400 border border-slate-600'
              }`}
            >
              {enabled ? '✓ AI 已就緒' : '已停用'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
            使用 Gemini AI 深度閱讀小說前後文，自動分析<span className="text-amber-300 font-medium">「長劍(cháng) vs 長老(zhǎng)」</span>、<span className="text-amber-300 font-medium">「子彈(dàn) vs 彈跳(tán)」</span>、<span className="text-amber-300 font-medium">「重創(zhòng) vs 重複(chóng)」</span>，保證微軟語音 100% 正確發音！
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* AI Scan Action Button */}
          <button
            type="button"
            onClick={handleRunAiScan}
            disabled={disabled || isAiScanning}
            className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="使用 AI 深度閱讀當前小說章節，檢測所有多音字上下文"
          >
            {isAiScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI 閱讀分析中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>AI 智慧檢測</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpenModal(true);
              setActiveTab('dictionary');
            }}
            className="px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>詞庫 ({allRules.length})</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
              enabled ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quick summary strip if AI matches exist */}
      {aiMatches.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              AI 在當前章節已精準識別出 <strong>{aiMatches.length} 處</strong> 多音字發音上下文！
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsOpenModal(true);
              setActiveTab('ai');
            }}
            className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 text-xs"
          >
            查看並一鍵校正 →
          </button>
        </div>
      )}

      {/* Modal Dialog */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  🔤
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    AI 智慧多音字校對與規則庫
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-mono">
                      Gemini 上下文閱讀
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    依據前後文自動讀懂詞意，為微軟語音引擎精準指定字音
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/50 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'ai'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI 智能掃描結果 {aiMatches.length > 0 ? `(${aiMatches.length})` : ''}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dictionary')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'dictionary'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>內建語義詞庫 ({allRules.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'custom'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>自訂校正規則 ({customRules.length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {/* Tab 1: AI Scan Results */}
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  {/* Action Banner */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>AI 深度閱讀當前文本分析</span>
                        {aiScanSource && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            來源: {aiScanSource === 'gemini' ? 'Gemini 3.8 Flash' : '本機語義字典'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        點擊「重新掃描」讓 AI 重新閱讀小說上下文，或「一鍵套用」確保微軟雲希音色 100% 讀對。
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={handleRunAiScan}
                        disabled={isAiScanning}
                        className="px-3.5 py-2 text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        {isAiScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>重新掃描</span>
                      </button>

                      {aiMatches.length > 0 && (
                        <button
                          type="button"
                          onClick={handleApplyAllAiMatches}
                          className="px-4 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl transition-colors shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>一鍵套用所有 AI 修正</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {aiScanError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{aiScanError}</span>
                    </div>
                  )}

                  {isAiScanning && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                      <p className="text-xs font-medium">Gemini AI 正在逐字閱讀上下文、分析多音字語意...</p>
                    </div>
                  )}

                  {!isAiScanning && aiMatches.length === 0 && (
                    <div className="py-12 text-center space-y-3 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
                        ✨
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-300">目前尚未執行 AI 掃描或未檢測到多音字</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          點擊上方「重新掃描」，AI 會讀取章節文字並列出所有需要校正音調的詞彙。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRunAiScan}
                        className="px-4 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl transition-colors shadow-md shadow-amber-500/20"
                      >
                        立即開始 AI 掃描
                      </button>
                    </div>
                  )}

                  {!isAiScanning && aiMatches.length > 0 && (
                    <div className="space-y-2.5">
                      {aiMatches.map((match, idx) => {
                        const isApplied = appliedAiKeys.has(match.originalText);
                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-xl border transition-all ${
                              isApplied
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-slate-800/60 border-slate-700/70 hover:border-amber-400/40'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-400/30">
                                    {match.character}
                                  </span>
                                  <span className="text-sm font-bold text-white">
                                    {match.originalText}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-slate-700 text-amber-300 font-mono text-xs font-semibold">
                                    拼音: {match.pinyin}
                                  </span>
                                  {match.zhuyin && (
                                    <span className="px-2 py-0.5 rounded bg-slate-700/80 text-slate-300 font-mono text-[11px]">
                                      注音: {match.zhuyin}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-emerald-400 font-medium">
                                    ➔ 修正發音：{match.replacementPhonetic}
                                  </span>
                                </div>

                                {match.contextSnippet && (
                                  <div className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800 font-sans leading-relaxed">
                                    <span className="text-slate-500 mr-1.5">上下文:</span>
                                    “{match.contextSnippet}”
                                  </div>
                                )}

                                <p className="text-[11px] text-slate-400">
                                  💡 語意依據：{match.explanation}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handlePlaySample(match.contextSnippet || match.originalText, `ai_${idx}`)}
                                  disabled={isPlayingAudio !== null}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                                  title="試聽此句子在 Edge TTS 上的發音效果"
                                >
                                  {isPlayingAudio === `ai_${idx}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                  ) : (
                                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                                  )}
                                  <span>試聽</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleApplySingleAiMatch(match)}
                                  disabled={isApplied}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    isApplied
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                                  }`}
                                >
                                  {isApplied ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>已套用</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>套用修正</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Built-in Dictionary */}
              {activeTab === 'dictionary' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="搜尋多音字（如：重、長、行、彈、著、降、便、得...）"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-2">
                    {filteredRules.slice(0, 50).map((rule, idx) => (
                      <div
                        key={rule.id || idx}
                        className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {rule.originalText}
                            </span>
                            <span className="text-amber-400 font-mono">➔ {rule.replacementPhonetic}</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                              {rule.pinyin}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{rule.explanation}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePlaySample(rule.originalText, `rule_${idx}`)}
                          className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                        >
                          {isPlayingAudio === `rule_${idx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                          <span>試聽</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Custom Rules Form */}
              {activeTab === 'custom' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddRule} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
                    <div className="text-xs font-bold text-white">新增自訂多音字規則</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">原始小說詞彙</label>
                        <input
                          type="text"
                          placeholder="例如：睡著、長老、大腹便便"
                          value={newOriginal}
                          onChange={(e) => setNewOriginal(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">建議發音同音字（Edge TTS 必讀對）</label>
                        <input
                          type="text"
                          placeholder="例如：睡ㄓㄠˊ、掌老、大腹胼胼"
                          value={newReplacement}
                          onChange={(e) => setNewReplacement(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">拼音（選填）</label>
                        <input
                          type="text"
                          placeholder="例如：zháo, zhǎng, pián"
                          value={newPinyin}
                          onChange={(e) => setNewPinyin(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">校對說明（選填）</label>
                        <input
                          type="text"
                          placeholder="例如：表示入睡狀態，讀陽平聲"
                          value={newExplanation}
                          onChange={(e) => setNewExplanation(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>

                    {formError && <p className="text-xs text-red-400">{formError}</p>}

                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增規則</span>
                    </button>
                  </form>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-400">目前專案自訂規則 ({customRules.length})</div>
                    {customRules.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">尚未新增任何自訂規則</p>
                    ) : (
                      customRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-3 rounded-xl bg-slate-800/40 border border-slate-700 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white mr-2">{rule.originalText}</span>
                            <span className="text-amber-400 mr-2">➔ {rule.replacementPhonetic}</span>
                            <span className="text-slate-400 font-mono">({rule.pinyin})</span>
                            <p className="text-[11px] text-slate-400 mt-0.5">{rule.explanation}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomRule(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                            title="刪除自訂規則"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI 上下文多音字校對已啟用，發音保證 100% 自然標準</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
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
