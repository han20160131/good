/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CustomCharacter, VoiceOption, VoiceCategory } from '../types';
import { CHARACTER_COLORS, POPULAR_ROLE_VOICES } from '../utils/characterConstants';
import { ALL_BUILTIN_VOICES, buildMergedVoiceList } from '../utils/voices';
import {
  Plus,
  Trash2,
  Edit3,
  Volume2,
  Loader2,
  Sparkles,
  X,
  Check,
  Users,
  ArrowRight,
  Search,
  Globe,
  Sliders,
  Filter,
} from 'lucide-react';

interface CharacterLibraryViewProps {
  characters: CustomCharacter[];
  onAddCharacter: (character: CustomCharacter) => void;
  onUpdateCharacter: (character: CustomCharacter) => void;
  onDeleteCharacter: (id: string) => void;
  onNavigateToMultiVoice?: () => void;
}

export const CharacterLibraryView: React.FC<CharacterLibraryViewProps> = ({
  characters,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  onNavigateToMultiVoice,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formVoiceCode, setFormVoiceCode] = useState('zh-CN-YunxiNeural');
  const [formDisplayName, setFormDisplayName] = useState('雲希 · 青年男聲（遠行一 / 遠者）');
  const [formColor, setFormColor] = useState(CHARACTER_COLORS[0]);
  const [formGender, setFormGender] = useState<'male' | 'female' | 'other'>('male');
  const [formRate, setFormRate] = useState('+0%');
  const [formPitch, setFormPitch] = useState('+0Hz');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');

  // 300+ Voices Explorer State
  const [serverVoices, setServerVoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VoiceCategory | 'all'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [showFullVoiceExplorer, setShowFullVoiceExplorer] = useState(true);

  // Audio preview state
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch full voice list from server on mount
  useEffect(() => {
    fetch('/api/voices')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setServerVoices(data);
        }
      })
      .catch((err) => console.warn('Could not fetch server voices in CharacterLibrary:', err));
  }, []);

  // Merged full list of 300+ voices
  const allVoicesList: VoiceOption[] = useMemo(() => {
    return buildMergedVoiceList(serverVoices);
  }, [serverVoices]);

  // Filtered voice list for the explorer
  const filteredVoices = useMemo(() => {
    return allVoicesList.filter((voice) => {
      // 1. Category filter
      if (selectedCategory !== 'all') {
        if (voice.category !== selectedCategory) return false;
      }

      // 2. Gender filter
      if (genderFilter !== 'all') {
        if (voice.gender !== genderFilter) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = voice.displayName.toLowerCase().includes(q);
        const matchCode = voice.shortName.toLowerCase().includes(q);
        const matchLocale = (voice.localeName || '').toLowerCase().includes(q);
        const matchDesc = (voice.description || '').toLowerCase().includes(q);
        const matchTag = voice.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchCode && !matchLocale && !matchDesc && !matchTag) {
          return false;
        }
      }

      return true;
    });
  }, [allVoicesList, selectedCategory, genderFilter, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allVoicesList.length,
      mandarin: 0,
      taiwan: 0,
      cantonese: 0,
      regional: 0,
      english: 0,
      japanese: 0,
      korean: 0,
      other: 0,
    };
    for (const v of allVoicesList) {
      if (counts[v.category] !== undefined) {
        counts[v.category]++;
      } else {
        counts.other = (counts.other || 0) + 1;
      }
    }
    return counts;
  }, [allVoicesList]);

  // Open modal for creating new character
  const handleOpenCreateModal = (defaultName = '') => {
    setEditingId(null);
    const existingCount = characters.length;
    const nextColor = CHARACTER_COLORS[existingCount % CHARACTER_COLORS.length];

    let suggestedName = defaultName;
    if (!suggestedName) {
      if (existingCount === 0) suggestedName = '甲';
      else if (existingCount === 1) suggestedName = '乙';
      else if (existingCount === 2) suggestedName = '旁白';
      else suggestedName = `角色${existingCount + 1}`;
    }

    setFormName(suggestedName);

    // If "甲", preset voice to 雲希 (遠行一); if "乙", preset to 雲揚 (元陽)
    if (suggestedName === '甲' || existingCount === 0) {
      setFormVoiceCode('zh-CN-YunxiNeural');
      setFormDisplayName('雲希 · 青年男聲（遠行一 / 遠者）');
      setFormGender('male');
    } else if (suggestedName === '乙' || existingCount === 1) {
      setFormVoiceCode('zh-CN-YunyangNeural');
      setFormDisplayName('雲揚 · 播音男聲（元陽 / 專業播音）');
      setFormGender('male');
    } else {
      setFormVoiceCode('zh-CN-YunjianNeural');
      setFormDisplayName('雲健 · 沉穩老者（宗主 / 長老）');
      setFormGender('male');
    }

    setFormColor(nextColor);
    setFormRate('+0%');
    setFormPitch('+0Hz');
    setFormDescription('');
    setFormError('');
    setSearchQuery('');
    setSelectedCategory('all');
    setGenderFilter('all');
    setIsModalOpen(true);
  };

  // Open modal for editing an existing character
  const handleOpenEditModal = (char: CustomCharacter) => {
    setEditingId(char.id);
    setFormName(char.name);
    setFormVoiceCode(char.voiceCode);
    setFormDisplayName(char.displayName);
    setFormColor(char.color);
    setFormGender(char.gender);
    setFormRate(char.rate || '+0%');
    setFormPitch(char.pitch || '+0Hz');
    setFormDescription(char.description || '');
    setFormError('');
    setSearchQuery('');
    setSelectedCategory('all');
    setGenderFilter('all');
    setIsModalOpen(true);
  };

  // Select voice from preset options
  const handleSelectPresetVoice = (voice: typeof POPULAR_ROLE_VOICES[0]) => {
    setFormVoiceCode(voice.voiceCode);
    setFormDisplayName(voice.displayName);
    setFormGender(voice.gender);
  };

  // Select voice from full 300+ library
  const handleSelectLibraryVoice = (voice: VoiceOption) => {
    setFormVoiceCode(voice.shortName);
    setFormDisplayName(voice.displayName);
    setFormGender(voice.gender === 'female' ? 'female' : 'male');
  };

  // Audition audio playback
  const handlePlayVoiceSample = async (voiceCode: string, name: string, rate: string, pitch: string, customSample?: string) => {
    // If already playing this voice, stop it
    if (isPlayingAudio === voiceCode) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAudio(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsPlayingAudio(voiceCode);
    try {
      const sampleText =
        customSample ||
        `你好！我是${name || '配音員'}，微軟 Neural 語音已就緒，隨時為您錄製多人配音。`;

      const res = await fetch('/api/tts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voice: voiceCode,
          rate,
          pitch,
        }),
      });

      if (!res.ok) throw new Error('音訊試聽失敗，請稍後再試');
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

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
      alert(e.message || '試聽失敗，請稍後重試');
      setIsPlayingAudio(null);
    }
  };

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('請輸入角色名稱（例如：甲、乙、旁白）');
      return;
    }

    if (editingId) {
      const updated: CustomCharacter = {
        id: editingId,
        name: cleanName,
        voiceCode: formVoiceCode,
        displayName: formDisplayName,
        color: formColor,
        gender: formGender,
        rate: formRate,
        pitch: formPitch,
        description: formDescription.trim(),
        createdAt: Date.now(),
      };
      onUpdateCharacter(updated);
    } else {
      const created: CustomCharacter = {
        id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        voiceCode: formVoiceCode,
        displayName: formDisplayName,
        color: formColor,
        gender: formGender,
        rate: formRate,
        pitch: formPitch,
        description: formDescription.trim(),
        createdAt: Date.now(),
      };
      onAddCharacter(created);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl border border-amber-500/30">
              🎭
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                角色庫
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {characters.length} 個角色
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                  {allVoicesList.length} 種微軟官方語音全開放
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                管理小說與短劇角色，全域支援微軟 300+ 種多國語言及方言聲音（如「甲」綁定「遠行一/雲希」、「乙」綁定「元陽/雲揚」）
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-1.5 flex-1 sm:flex-none active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>新增角色</span>
          </button>

          {characters.length > 0 && onNavigateToMultiVoice && (
            <button
              type="button"
              onClick={onNavigateToMultiVoice}
              className="px-4 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>製作多人配音</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {characters.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 text-3xl flex items-center justify-center mx-auto text-amber-400 shadow-inner">
            🎭
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">目前還沒有角色，請新增角色</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              點擊下方按鈕新增角色（可自選微軟 300+ 種官方聲音庫，包含台灣國語、普通話、粵語、英語、日語等），隨後可在「製作多人配音」中一鍵智慧配對！
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCreateModal('甲')}
            className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-lg shadow-amber-400/20 inline-flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>新增第一個角色</span>
          </button>
        </div>
      ) : (
        /* Character Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => (
            <div
              key={char.id}
              className="group relative p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
              style={{
                borderTop: `3px solid ${char.color || '#f59e0b'}`,
              }}
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full ring-2 ring-slate-700 shadow-sm"
                      style={{ backgroundColor: char.color }}
                    />
                    <h3 className="font-bold text-base text-white">{char.name}</h3>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(char)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-700/70 rounded-lg transition-colors"
                      title="編輯角色"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`確定要刪除角色「${char.name}」嗎？`)) {
                          onDeleteCharacter(char.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/70 rounded-lg transition-colors"
                      title="刪除角色"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {char.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {char.description}
                  </p>
                )}

                {/* Voice Badge */}
                <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">綁定聲音：</span>
                    <span className="font-semibold text-amber-300 truncate max-w-[190px]">
                      {char.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      代碼: {char.voiceCode}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      語速: {char.rate}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      語調: {char.pitch}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handlePlayVoiceSample(char.voiceCode, char.name, char.rate, char.pitch)}
                  className="px-3 py-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {isPlayingAudio === char.voiceCode ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{isPlayingAudio === char.voiceCode ? '播放中...' : '試聽聲音'}</span>
                </button>

                <span className="text-[10px] text-slate-500 font-mono">
                  已儲存至角色庫
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Character Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  🎭
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingId ? '編輯角色' : '新增角色'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    完整微軟語音庫已開放（共 {allVoicesList.length} 種聲音）
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {/* 1. Role Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>角色名稱（如：甲、乙、旁白、主角） <span className="text-amber-400">*</span></span>
                  <span className="text-[10px] text-slate-500">小說台詞對應的發言人</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：甲、乙、林天、蘇晴、老爺爺"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* 2. Color Selection (10 Dots aligned with MultiVoiceMaker) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  角色代表顏色（對齊多人配音格子標籤）
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto">
                  {CHARACTER_COLORS.map((col, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormColor(col)}
                      className={`w-7 h-7 rounded-full transition-all flex items-center justify-center shrink-0 ${
                        formColor === col
                          ? 'scale-110 ring-2 ring-white shadow-md'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col }}
                      title={`顏色 ${idx + 1}`}
                    >
                      {formColor === col && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Currently Selected Voice Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/30 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950 uppercase tracking-wide">
                      目前選定
                    </span>
                    <span className="font-bold text-sm text-white">
                      {formDisplayName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ({formVoiceCode})
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    {formGender === 'female' ? '👩 女性音色' : '👨 男性音色'} · 語速: {formRate} · 語調: {formPitch}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlayVoiceSample(formVoiceCode, formName || '角色', formRate, formPitch)}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow shrink-0"
                >
                  {isPlayingAudio === formVoiceCode ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span>試聽目前</span>
                </button>
              </div>

              {/* 4. Popular Novel Roles Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>小說常見角色快捷推薦</span>
                  </label>
                  <span className="text-[10px] text-slate-400">點擊直接套用</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                  {POPULAR_ROLE_VOICES.map((v) => {
                    const isSelected = formVoiceCode === v.voiceCode;
                    return (
                      <button
                        key={v.voiceCode}
                        type="button"
                        onClick={() => handleSelectPresetVoice(v)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-sm'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        <span>{v.displayName.split(' · ')[0]}</span>
                        <span className="text-[10px] opacity-75">
                          ({v.displayName.split(' · ')[1]?.split('（')[0] || v.gender === 'female' ? '女' : '男'})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Complete 300+ Voices Explorer */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white">
                      微軟官方語音庫全集（共 {allVoicesList.length} 種聲音）
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    已篩選出 {filteredVoices.length} 種
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋 300+ 種聲音名稱、代碼 (如 Yunxi, Xiaoxiao)、語言或地區..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Tabs: Language / Region */}
                <div className="flex flex-wrap gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    全部 ({categoryCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('mandarin')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedCategory === 'mandarin'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    普通話 ({categoryCounts.mandarin})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('taiwan')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedCategory === 'taiwan'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    台灣國語 ({categoryCounts.taiwan})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('cantonese')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedCategory === 'cantonese'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    粵語 ({categoryCounts.cantonese})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('english')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedCategory === 'english'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    英語 ({categoryCounts.english})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('japanese')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedCategory === 'japanese'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    日語 ({categoryCounts.japanese})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('korean')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedCategory === 'korean'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    韓語 ({categoryCounts.korean})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('other')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedCategory === 'other'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    其它各國 ({categoryCounts.other})
                  </button>
                </div>

                {/* Gender Filter Pills */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>性別：</span>
                  <button
                    type="button"
                    onClick={() => setGenderFilter('all')}
                    className={`px-2 py-0.5 rounded ${
                      genderFilter === 'all' ? 'bg-slate-700 text-white font-bold' : 'hover:text-white'
                    }`}
                  >
                    全部
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderFilter('male')}
                    className={`px-2 py-0.5 rounded ${
                      genderFilter === 'male' ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30' : 'hover:text-white'
                    }`}
                  >
                    男聲 ♂
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderFilter('female')}
                    className={`px-2 py-0.5 rounded ${
                      genderFilter === 'female' ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30' : 'hover:text-white'
                    }`}
                  >
                    女聲 ♀
                  </button>
                </div>

                {/* Scrollable Voice Grid */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                  {filteredVoices.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      沒有符合「{searchQuery}」的語音，請嘗試其他關鍵字。
                    </div>
                  ) : (
                    filteredVoices.map((v) => {
                      const isSelected = formVoiceCode === v.shortName;
                      return (
                        <div
                          key={v.shortName}
                          onClick={() => handleSelectLibraryVoice(v)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-400 text-white shadow-sm'
                              : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                            <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                              <span className="text-white">{v.displayName}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                {v.locale}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                  v.gender === 'female'
                                    ? 'bg-pink-500/10 text-pink-300 border border-pink-500/20'
                                    : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                }`}
                              >
                                {v.gender === 'female' ? '女聲' : '男聲'}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] text-amber-400 font-bold ml-auto flex items-center gap-0.5">
                                  ✓ 已選用
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="font-mono">{v.shortName}</span>
                              {v.localeName && <span>· {v.localeName}</span>}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayVoiceSample(
                                v.shortName,
                                formName || v.displayName,
                                formRate,
                                formPitch,
                                v.sampleText
                              );
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors shrink-0 flex items-center gap-1 text-xs"
                            title="試聽此聲音"
                          >
                            {isPlayingAudio === v.shortName ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                            <span className="text-[10px]">{isPlayingAudio === v.shortName ? '播放' : '試聽'}</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 6. Sliders: Rate & Pitch */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    語速調整: <span className="text-amber-300 font-mono">{formRate}</span>
                  </label>
                  <select
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="-20%">特慢 (-20%)</option>
                    <option value="-15%">較慢 (-15%)</option>
                    <option value="-5%">稍慢 (-5%)</option>
                    <option value="+0%">標準 (1.0x)</option>
                    <option value="+5%">稍快 (+5%)</option>
                    <option value="+10%">生動快讀 (+10%)</option>
                    <option value="+20%">極速 (+20%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    語調音高: <span className="text-amber-300 font-mono">{formPitch}</span>
                  </label>
                  <select
                    value={formPitch}
                    onChange={(e) => setFormPitch(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="-15Hz">極低沉 (-15Hz)</option>
                    <option value="-10Hz">低沉厚重 (-10Hz)</option>
                    <option value="-5Hz">微沉穩重 (-5Hz)</option>
                    <option value="+0Hz">自然原聲 (+0Hz)</option>
                    <option value="+5Hz">清亮微揚 (+5Hz)</option>
                    <option value="+10Hz">活潑高音 (+10Hz)</option>
                  </select>
                </div>
              </div>

              {/* 7. Description (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  角色背景描述 (選填)
                </label>
                <input
                  type="text"
                  placeholder="例如：青玄宗外門弟子、熱血仗義、性格沉著"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md active:scale-95"
                >
                  {editingId ? '儲存角色設定' : '確認建立角色'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
