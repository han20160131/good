/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { VoiceConfig, VoiceOption, VoiceCategory } from '../types';
import {
  ALL_BUILTIN_VOICES,
  POPULAR_CHINESE_VOICES,
  DEFAULT_VOICE_CONFIG,
} from '../utils/voices';

interface VoiceSelectorProps {
  voiceConfig: VoiceConfig;
  onChange: (newConfig: VoiceConfig) => void;
  disabled?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voiceConfig,
  onChange,
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VoiceCategory | 'all' | 'all_global'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  
  // Audition audio player state
  const [auditioningVoice, setAuditioningVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dynamic server voices if fetched
  const [serverVoices, setServerVoices] = useState<any[]>([]);

  // Fetch full voice list from server on mount
  useEffect(() => {
    fetch('/api/voices')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setServerVoices(data);
        }
      })
      .catch((err) => console.warn('Could not fetch server voices:', err));
  }, []);

  // Parse current rate number (e.g. "+15%" -> 15)
  const currentRateNum = parseInt(voiceConfig.rate.replace('%', ''), 10) || 0;
  const currentPitchNum = parseInt(voiceConfig.pitch.replace('Hz', ''), 10) || 0;

  // Handle Audition Play
  const handleAudition = async (voice: VoiceOption | { shortName: string; displayName?: string; sampleText?: string }, e?: React.MouseEvent) => {
    e?.stopPropagation();

    // If currently playing this voice, stop it
    if (auditioningVoice === voice.shortName) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setAuditioningVoice(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setAuditioningVoice(voice.shortName);

    try {
      const sample =
        (voice as any).sampleText ||
        '道友請留步！此去青玄宗路途遙遠，若無飛劍護身，恐遭山間妖魔暗算。';

      const res = await fetch('/api/tts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sample,
          voice: voice.shortName,
          rate: voiceConfig.rate,
          pitch: voiceConfig.pitch,
        }),
      });

      if (!res.ok) {
        throw new Error('試聽服務暫時繁忙，請稍後重試');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setAuditioningVoice(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setAuditioningVoice(null);
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (err: any) {
      console.error('Audition error:', err);
      alert(err.message || '試聽失敗，請稍後再試');
      setAuditioningVoice(null);
    }
  };

  // Find active voice info
  const activeVoiceOption =
    ALL_BUILTIN_VOICES.find((v) => v.shortName === voiceConfig.voiceCode) || {
      shortName: voiceConfig.voiceCode,
      displayName: voiceConfig.displayName,
      gender: voiceConfig.gender,
      locale: voiceConfig.locale || 'zh-CN',
      localeName: '自訂語音',
      category: 'mandarin' as VoiceCategory,
      description: '指定之 Microsoft Neural 聲音',
      tags: ['微軟音色'],
      sampleText: '歡迎使用小說配音室。',
    };

  // Build merged list of voices
  const allVoicesList: VoiceOption[] = React.useMemo(() => {
    const list = [...ALL_BUILTIN_VOICES];
    const existingCodes = new Set(list.map((v) => v.shortName));

    if (serverVoices.length > 0) {
      for (const sv of serverVoices) {
        if (!existingCodes.has(sv.shortName)) {
          let cat: VoiceCategory = 'other';
          if (sv.locale.startsWith('zh-CN')) cat = 'mandarin';
          else if (sv.locale.startsWith('zh-TW')) cat = 'taiwan';
          else if (sv.locale.startsWith('zh-HK')) cat = 'cantonese';
          else if (sv.locale.startsWith('en')) cat = 'english';
          else if (sv.locale.startsWith('ja')) cat = 'japanese';
          else if (sv.locale.startsWith('ko')) cat = 'korean';

          list.push({
            shortName: sv.shortName,
            displayName: sv.friendlyName.replace('Microsoft ', '').replace(' Online (Natural)', ''),
            gender: sv.gender === 'female' ? 'female' : 'male',
            locale: sv.locale,
            localeName: sv.localeName || sv.locale,
            category: cat,
            description: `${sv.localeName} - ${sv.gender === 'female' ? '女性' : '男性'}聲音`,
            tags: [sv.locale],
            sampleText: sv.locale.startsWith('zh')
              ? '天行健，君子以自強不息；地勢坤，君子以厚德載物。'
              : 'Hello, this is a natural preview of this voice.',
          });
          existingCodes.add(sv.shortName);
        }
      }
    }
    return list;
  }, [serverVoices]);

  // Filter voices based on user query and tabs
  const filteredVoices = React.useMemo(() => {
    return allVoicesList.filter((voice) => {
      // Category filter
      if (selectedCategory !== 'all' && selectedCategory !== 'all_global') {
        if (voice.category !== selectedCategory) return false;
      } else if (selectedCategory === 'all') {
        // By default show Chinese + major popular voices
        const isZhOrPopular =
          voice.locale.startsWith('zh') ||
          voice.category === 'english' ||
          voice.isPopular;
        if (!isZhOrPopular && !searchQuery.trim()) return false;
      }

      // Gender filter
      if (genderFilter !== 'all' && voice.gender !== genderFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = voice.displayName.toLowerCase().includes(q);
        const matchCode = voice.shortName.toLowerCase().includes(q);
        const matchLocale = (voice.localeName || '').toLowerCase().includes(q);
        const matchDesc = (voice.description || '').toLowerCase().includes(q);
        const matchTag = voice.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchCode && !matchLocale && !matchDesc && !matchTag) {
          return false;
        }
      }

      return true;
    });
  }, [allVoicesList, selectedCategory, genderFilter, searchQuery]);

  const selectVoice = (voice: VoiceOption) => {
    onChange({
      ...voiceConfig,
      voiceCode: voice.shortName,
      displayName: voice.displayName,
      gender: voice.gender,
      locale: voice.locale,
    });
    setIsModalOpen(false);
  };

  const handleRateChange = (val: number) => {
    const formatted = val >= 0 ? `+${val}%` : `${val}%`;
    onChange({
      ...voiceConfig,
      rate: formatted,
    });
  };

  const handlePitchChange = (val: number) => {
    const formatted = val >= 0 ? `+${val}Hz` : `${val}Hz`;
    onChange({
      ...voiceConfig,
      pitch: formatted,
    });
  };

  return (
    <div className="space-y-3">
      {/* Voice Selection Summary Card */}
      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Gender/Avatar Icon */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${
                activeVoiceOption.gender === 'female'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {activeVoiceOption.gender === 'female' ? '女' : '男'}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-100">
                  {activeVoiceOption.displayName}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600/50">
                  {activeVoiceOption.localeName || activeVoiceOption.locale}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeVoiceOption.shortName}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {activeVoiceOption.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* Quick Audition Button */}
            <button
              type="button"
              onClick={(e) => handleAudition(activeVoiceOption, e)}
              className="px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
              title="點擊立即播放此聲音試聽音檔"
            >
              <span>{auditioningVoice === activeVoiceOption.shortName ? '⏹ 停止' : '🔊 試聽'}</span>
            </button>

            {/* Change Voice Modal Trigger */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors shadow-sm disabled:opacity-50"
            >
              更換聲音 (共 {allVoicesList.length} 種) ▾
            </button>
          </div>
        </div>

        {/* Speed (Rate) and Pitch Adjustment Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/60">
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-300 font-medium">語速調整</span>
              <span className="font-mono text-amber-400 font-bold tabular-nums">
                {voiceConfig.rate} {currentRateNum === 0 ? '(標準)' : currentRateNum > 0 ? `(快 ${currentRateNum}%)` : `(慢 ${Math.abs(currentRateNum)}%)`}
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              step="5"
              value={currentRateNum}
              disabled={disabled}
              onChange={(e) => handleRateChange(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <button type="button" onClick={() => handleRateChange(-20)} className="hover:text-slate-300">0.8x 慢</button>
              <button type="button" onClick={() => handleRateChange(0)} className="hover:text-amber-400 text-slate-400 font-semibold">1.0x 正常</button>
              <button type="button" onClick={() => handleRateChange(15)} className="hover:text-slate-300">1.15x</button>
              <button type="button" onClick={() => handleRateChange(25)} className="hover:text-slate-300">1.25x 追書</button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-300 font-medium">音調調整</span>
              <span className="font-mono text-amber-400 font-bold tabular-nums">
                {voiceConfig.pitch} {currentPitchNum === 0 ? '(原音調)' : currentPitchNum > 0 ? `(偏高)` : `(偏低沉)`}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="5"
              value={currentPitchNum}
              disabled={disabled}
              onChange={(e) => handlePitchChange(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <button type="button" onClick={() => handlePitchChange(-15)} className="hover:text-slate-300">沉穩雄渾</button>
              <button type="button" onClick={() => handlePitchChange(0)} className="hover:text-amber-400 text-slate-400 font-semibold">標準原調</button>
              <button type="button" onClick={() => handlePitchChange(15)} className="hover:text-slate-300">清脆年輕</button>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>選擇配音角色與聲音</span>
                  <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    共 {allVoicesList.length} 種微軟 Neural 原廠音色
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  每位角色皆為微軟官方真實語音，點擊「試聽」可立即在線聆聽真實音效
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-base"
              >
                ✕
              </button>
            </div>

            {/* Filter Controls Bar */}
            <div className="p-4 bg-slate-900/60 border-b border-slate-800 space-y-3">
              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜尋聲音名稱、語言、代碼或特色（例如：雲健、曉曉、台灣、廣東話、English、少年、仙俠）..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs">🔍</span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    清空
                  </button>
                )}
              </div>

              {/* Category & Gender Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {[
                    { key: 'all', label: '熱門精選' },
                    { key: 'mandarin', label: '中文國語' },
                    { key: 'taiwan', label: '台灣國語' },
                    { key: 'cantonese', label: '香港粵語' },
                    { key: 'regional', label: '地方方言' },
                    { key: 'english', label: '英語' },
                    { key: 'japanese', label: '日本語' },
                    { key: 'korean', label: '한국어' },
                    { key: 'all_global', label: `全部語言 (${allVoicesList.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSelectedCategory(tab.key as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedCategory === tab.key
                          ? 'bg-amber-400 text-slate-900 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Gender Toggle */}
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg text-xs">
                  {[
                    { key: 'all', label: '全部性別' },
                    { key: 'male', label: '👨 男聲' },
                    { key: 'female', label: '👩 女聲' },
                  ].map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setGenderFilter(g.key as any)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        genderFilter === g.key
                          ? 'bg-slate-700 text-amber-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Voices Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[55vh]">
              {filteredVoices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <p className="text-sm">未找到符合「{searchQuery}」的聲音</p>
                  <p className="text-xs text-slate-500">可嘗試更換搜尋詞或重設分類標籤</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredVoices.map((voice) => {
                    const isSelected = voice.shortName === voiceConfig.voiceCode;
                    const isAuditioning = auditioningVoice === voice.shortName;

                    return (
                      <div
                        key={voice.shortName}
                        onClick={() => selectVoice(voice)}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-3 relative group ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-400/80 shadow-md ring-1 ring-amber-400/40'
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div>
                          {/* Top row: Name, Gender & Tags */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                  voice.gender === 'female'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {voice.gender === 'female' ? '女' : '男'}
                              </span>
                              <span className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors">
                                {voice.displayName}
                              </span>
                              {voice.isPopular && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                                  人氣
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {voice.localeName}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {voice.description}
                          </p>

                          {/* Tags */}
                          {voice.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {voice.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-400 border border-slate-700/50"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom Action Bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/40 text-xs">
                          <button
                            type="button"
                            onClick={(e) => handleAudition(voice, e)}
                            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                              isAuditioning
                                ? 'bg-amber-400 text-slate-900 font-bold'
                                : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20'
                            }`}
                          >
                            <span>{isAuditioning ? '⏹ 播放中（點擊停止）' : '🔊 試聽真實發音'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectVoice(voice);
                            }}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-amber-400 text-slate-900'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ 目前使用中' : '選擇此聲音'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
              <span>
                目前選定：<strong className="text-amber-400">{activeVoiceOption.displayName}</strong> ({activeVoiceOption.shortName})
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
              >
                完成選擇
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
