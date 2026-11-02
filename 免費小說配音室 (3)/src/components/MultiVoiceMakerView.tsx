/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CustomCharacter, MultiVoiceBlock } from '../types';
import { CHARACTER_COLORS, POPULAR_ROLE_VOICES } from '../utils/characterConstants';
import { parseScriptToBlocks } from '../utils/multiVoiceParser';
import {
  Sparkles,
  Play,
  Pause,
  Download,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Volume2,
  Loader2,
  Clock,
  Check,
  Clipboard,
  Layers,
  ChevronDown,
  RefreshCw,
  X,
  Users,
} from 'lucide-react';

interface MultiVoiceMakerViewProps {
  characters: CustomCharacter[];
  onOpenCharacterLibrary?: () => void;
  onSaveAsProject?: (title: string, blocks: MultiVoiceBlock[]) => void;
}

export const MultiVoiceMakerView: React.FC<MultiVoiceMakerViewProps> = ({
  characters,
  onOpenCharacterLibrary,
  onSaveAsProject,
}) => {
  // Step 1: Project Title
  const [projectTitle, setProjectTitle] = useState('三分球決戰多人對話');

  // Step 2 & 3: Blocks (格子列表)
  const [blocks, setBlocks] = useState<MultiVoiceBlock[]>([
    {
      id: 'block_1',
      characterName: '甲',
      color: CHARACTER_COLORS[0], // Red
      text: '你投進了一個三分球。',
    },
    {
      id: 'block_2',
      characterName: '乙',
      color: CHARACTER_COLORS[1], // Amber
      text: '牛逼啊！',
    },
    {
      id: 'block_3',
      characterName: '甲',
      color: CHARACTER_COLORS[0], // Red
      text: 'Easy peasy',
    },
  ]);

  // AI Script Parser Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [pasteScriptText, setPasteScriptText] = useState(
    '甲說：「你投進了一個三分球。」\n乙說：「牛逼啊！」\n甲又說：「Easy peasy」'
  );
  const [isParsing, setIsParsing] = useState(false);

  // Audio Playback & Synthesis State
  const [isSynthesizingAll, setIsSynthesizingAll] = useState(false);
  const [synthesisProgress, setSynthesisProgress] = useState(0);
  const [synthesizedAudioUrl, setSynthesizedAudioUrl] = useState<string | null>(null);
  const [isPlayingFullAudio, setIsPlayingFullAudio] = useState(false);
  const [playingBlockId, setPlayingBlockId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fullAudioRef = useRef<HTMLAudioElement | null>(null);

  // Map each speaker name to a CustomCharacter or popular voice
  const speakerVoiceMap = useMemo(() => {
    const map = new Map<string, { voiceCode: string; displayName: string; rate: string; pitch: string; color: string }>();

    // 1. Populate from registered characters
    for (const c of characters) {
      map.set(c.name, {
        voiceCode: c.voiceCode,
        displayName: c.displayName,
        rate: c.rate || '+0%',
        pitch: c.pitch || '+0Hz',
        color: c.color,
      });
    }

    // 2. Default fallbacks for common names if not explicitly registered
    if (!map.has('甲')) {
      map.set('甲', {
        voiceCode: 'zh-CN-YunxiNeural',
        displayName: '雲希 (遠行一 / 遠者)',
        rate: '+0%',
        pitch: '+0Hz',
        color: CHARACTER_COLORS[0],
      });
    }
    if (!map.has('乙')) {
      map.set('乙', {
        voiceCode: 'zh-CN-YunyangNeural',
        displayName: '雲揚 (元陽 / 專業播音)',
        rate: '+0%',
        pitch: '+0Hz',
        color: CHARACTER_COLORS[1],
      });
    }
    if (!map.has('旁白')) {
      map.set('旁白', {
        voiceCode: 'zh-CN-YunjianNeural',
        displayName: '雲健 (沉穩老者 / 宗主)',
        rate: '+0%',
        pitch: '+0Hz',
        color: CHARACTER_COLORS[2],
      });
    }

    return map;
  }, [characters]);

  // Unique speakers in current script
  const uniqueSpeakers = useMemo(() => {
    const set = new Set<string>();
    for (const b of blocks) {
      if (b.characterName) set.add(b.characterName);
    }
    return Array.from(set);
  }, [blocks]);

  // Total character count across all blocks
  const totalCharCount = useMemo(() => {
    return blocks.reduce((acc, b) => acc + (b.text ? b.text.length : 0), 0);
  }, [blocks]);

  // Helper toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // AI Script Parser Submission
  const handleExecuteAiParse = () => {
    if (!pasteScriptText.trim()) return;
    setIsParsing(true);
    setTimeout(() => {
      const generatedBlocks = parseScriptToBlocks(pasteScriptText, characters);
      if (generatedBlocks.length > 0) {
        setBlocks(generatedBlocks);
        showToast(`✨ AI 智慧選角色完成！已自動切分 ${generatedBlocks.length} 個對話格子。`);
      } else {
        showToast('未能識別出對話段落，請確認文章格式。');
      }
      setIsParsing(false);
      setIsAiModalOpen(false);
    }, 300);
  };

  // Move block up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setBlocks((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Move block down
  const handleMoveDown = (index: number) => {
    if (index >= blocks.length - 1) return;
    setBlocks((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Insert Pause marker into block text (e.g. [停頓0.5秒])
  const handleInsertPause = (index: number) => {
    setBlocks((prev) => {
      const copy = [...prev];
      const cur = copy[index];
      copy[index] = {
        ...cur,
        text: cur.text ? `${cur.text} ... ` : '... ',
      };
      return copy;
    });
    showToast('已插入 0.5 秒停頓節奏標記');
  };

  // Insert new block directly below index
  const handleInsertBlockBelow = (index: number) => {
    setBlocks((prev) => {
      const copy = [...prev];
      const cur = copy[index];
      // Alternate between speakers if two exist
      let nextSpeaker = cur.characterName;
      if (uniqueSpeakers.length >= 2) {
        nextSpeaker = uniqueSpeakers.find((s) => s !== cur.characterName) || cur.characterName;
      }
      const speakerConfig = speakerVoiceMap.get(nextSpeaker);
      const newBlock: MultiVoiceBlock = {
        id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        characterName: nextSpeaker,
        color: speakerConfig?.color || CHARACTER_COLORS[(index + 1) % CHARACTER_COLORS.length],
        text: '',
      };
      copy.splice(index + 1, 0, newBlock);
      return copy;
    });
  };

  // Delete block
  const handleDeleteBlock = (index: number) => {
    if (blocks.length <= 1) {
      showToast('至少保留一個對話格子');
      return;
    }
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  // Update block text
  const handleTextChange = (index: number, newText: string) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], text: newText };
      return copy;
    });
  };

  // Change block character
  const handleChangeBlockCharacter = (index: number, newCharName: string) => {
    const config = speakerVoiceMap.get(newCharName);
    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        characterName: newCharName,
        color: config?.color || copy[index].color,
      };
      return copy;
    });
  };

  // Change block color dot
  const handleChangeBlockColor = (index: number, color: string) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], color };
      return copy;
    });
  };

  // Single block preview audio audition
  const handlePreviewBlock = async (block: MultiVoiceBlock) => {
    if (playingBlockId) return;
    const cleanText = block.text.trim();
    if (!cleanText) {
      showToast('此格子尚未輸入任何台詞內容');
      return;
    }

    setPlayingBlockId(block.id);
    const voiceCfg = speakerVoiceMap.get(block.characterName) || {
      voiceCode: 'zh-CN-YunxiNeural',
      rate: '+0%',
      pitch: '+0Hz',
    };

    try {
      const res = await fetch('/api/tts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice: voiceCfg.voiceCode,
          rate: voiceCfg.rate,
          pitch: voiceCfg.pitch,
        }),
      });

      if (!res.ok) throw new Error('音訊合成失敗');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setPlayingBlockId(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlayingBlockId(null);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || '試聽失敗');
      setPlayingBlockId(null);
    }
  };

  // Full Dialogue Synthesis (Concatenates all blocks)
  const handleSynthesizeAll = async () => {
    const validBlocks = blocks.filter((b) => b.text && b.text.trim().length > 0);
    if (validBlocks.length === 0) {
      showToast('請先輸入至少一段台詞文字');
      return;
    }

    setIsSynthesizingAll(true);
    setSynthesisProgress(5);
    setSynthesizedAudioUrl(null);

    try {
      // Synthesize each segment sequentially
      const audioBlobs: Blob[] = [];
      for (let i = 0; i < validBlocks.length; i++) {
        const b = validBlocks[i];
        const voiceCfg = speakerVoiceMap.get(b.characterName) || {
          voiceCode: 'zh-CN-YunxiNeural',
          rate: '+0%',
          pitch: '+0Hz',
        };

        const res = await fetch('/api/tts/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: b.text,
            voice: voiceCfg.voiceCode,
            rate: voiceCfg.rate,
            pitch: voiceCfg.pitch,
          }),
        });

        if (!res.ok) throw new Error(`第 ${i + 1} 格「${b.characterName}」語音合成失敗`);
        const blob = await res.blob();
        audioBlobs.push(blob);
        setSynthesisProgress(Math.round(((i + 1) / validBlocks.length) * 95));
      }

      // Combine audio blobs into one playable audio file
      const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
      const fullUrl = URL.createObjectURL(combinedBlob);
      setSynthesizedAudioUrl(fullUrl);
      setSynthesisProgress(100);
      showToast(`🎉 成功完成 ${validBlocks.length} 段多人配音合成！`);
    } catch (err: any) {
      console.error('Full dialogue synthesis error:', err);
      showToast(err.message || '多人配音合成失敗，請稍候重試');
    } finally {
      setIsSynthesizingAll(false);
    }
  };

  // Download combined MP3
  const handleDownloadFullAudio = () => {
    if (!synthesizedAudioUrl) return;
    const a = document.createElement('a');
    a.href = synthesizedAudioUrl;
    a.download = `${projectTitle || '多人配音'}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Toggle play/pause for synthesized audio
  const handleTogglePlayFull = () => {
    if (!fullAudioRef.current) return;
    if (isPlayingFullAudio) {
      fullAudioRef.current.pause();
      setIsPlayingFullAudio(false);
    } else {
      fullAudioRef.current.play();
      setIsPlayingFullAudio(true);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 p-3.5 rounded-xl bg-slate-900/95 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Step 1 & Step 2 Control Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>製作多人配音工作台</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                多角色對話模式
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              支援多角色交替配音，格子化管理每句台詞，可由 AI 智慧自動辨識「甲說」、「乙說」分格！
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {onOpenCharacterLibrary && (
              <button
                type="button"
                onClick={onOpenCharacterLibrary}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <span>🎭</span>
                <span>角色庫 ({characters.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Form Inputs: Title & AI Role Select */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2 border-t border-slate-700/60">
          {/* Step 1: 小說/劇本名稱 */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                1
              </span>
              <span>小說 / 劇本名稱</span>
            </label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="例如：三分球決戰、第一章 雙雄對決"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Step 2: AI 智慧選角色 (Command + V 貼上對話方塊) */}
          <div className="md:col-span-7 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  2
                </span>
                <span>AI 智慧選角色</span>
              </div>
              <span className="text-[11px] text-amber-300 font-mono">
                共 {blocks.length} 個格子 · {totalCharCount} 字
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="flex-1 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all shadow-md shadow-amber-400/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI 智慧選角色（貼上文章自動分格）</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertBlockBelow(blocks.length - 1)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                title="在列表底部插入新段落"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>加格</span>
              </button>
            </div>
          </div>
        </div>

        {/* Role Voice Mapping Bar */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
            <span>🎙️</span>
            <span>當前角色聲音分配:</span>
          </span>

          {uniqueSpeakers.map((spk) => {
            const cfg = speakerVoiceMap.get(spk);
            return (
              <div
                key={spk}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 flex items-center gap-2"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: cfg?.color || '#f59e0b' }}
                />
                <span className="font-bold text-white">{spk}:</span>
                <span className="text-amber-300 font-mono text-[11px]">
                  {cfg?.displayName || '雲希'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 3: 格子列表 (Matching the user's uploaded attachment 1) */}
      <div className="space-y-4">
        {blocks.map((block, index) => {
          const charCount = block.text ? block.text.length : 0;
          const isFocusedBlock = false;

          return (
            <div
              key={block.id}
              className="rounded-xl bg-[#181a20] border border-slate-800 shadow-md overflow-hidden transition-all hover:border-slate-700"
            >
              {/* Header Row: Role Pill, 10 Colors, Character Count, Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#14161d] border-b border-slate-800/80">
                {/* Left: Role Pill & 10 Color Dots */}
                <div className="flex items-center gap-3">
                  {/* Role Name Pill / Input */}
                  <div className="relative">
                    <select
                      value={block.characterName}
                      onChange={(e) => handleChangeBlockCharacter(index, e.target.value)}
                      className="appearance-none px-3 py-1 pr-6 rounded-md bg-[#20242e] border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-amber-400 cursor-pointer shadow-inner"
                      style={{ borderLeft: `4px solid ${block.color}` }}
                    >
                      {uniqueSpeakers.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {characters
                        .filter((c) => !uniqueSpeakers.includes(c.name))
                        .map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} (角色庫)
                          </option>
                        ))}
                      {!uniqueSpeakers.includes('甲') && <option value="甲">甲</option>}
                      {!uniqueSpeakers.includes('乙') && <option value="乙">乙</option>}
                      {!uniqueSpeakers.includes('旁白') && <option value="旁白">旁白</option>}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* 10 Colorful Dots as shown in attachment 1 */}
                  <div className="flex items-center gap-1.5">
                    {CHARACTER_COLORS.map((col, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => handleChangeBlockColor(index, col)}
                        className={`w-3.5 h-3.5 rounded-full transition-transform ${
                          block.color === col
                            ? 'scale-125 ring-2 ring-white/80 shadow'
                            : 'hover:scale-110 opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col }}
                        title={`設定此格為顏色 ${cIdx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Middle: Character Count */}
                <div className="text-xs text-slate-400 font-mono">
                  字元數: <span className="text-slate-200 font-bold">{charCount}</span>
                </div>

                {/* Right: Actions matching attachment 1 */}
                <div className="flex items-center gap-1.5">
                  {/* Move Up */}
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 text-slate-400 hover:text-white bg-[#20242e] hover:bg-slate-700 disabled:opacity-30 rounded transition-colors"
                    title="上移段落"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === blocks.length - 1}
                    className="p-1.5 text-slate-400 hover:text-white bg-[#20242e] hover:bg-slate-700 disabled:opacity-30 rounded transition-colors"
                    title="下移段落"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* 插入停頓 (Orange button from attachment 1) */}
                  <button
                    type="button"
                    onClick={() => handleInsertPause(index)}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-[#f97316] hover:bg-[#ea580c] active:scale-95 rounded transition-all shadow-sm"
                    title="在對話中插入0.5秒停頓"
                  >
                    插入停頓
                  </button>

                  {/* 插入段落 (Green button from attachment 1) */}
                  <button
                    type="button"
                    onClick={() => handleInsertBlockBelow(index)}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-[#15803d] hover:bg-[#166534] active:scale-95 rounded transition-all shadow-sm"
                    title="在此格下方插入新對話格子"
                  >
                    插入段落
                  </button>

                  {/* 刪除 (Dark red/burgundy button from attachment 1) */}
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(index)}
                    className="px-2.5 py-1 text-xs font-semibold text-red-200 bg-[#7f1d1d] hover:bg-[#991b1b] active:scale-95 rounded transition-all shadow-sm"
                    title="刪除此格"
                  >
                    刪除
                  </button>
                </div>
              </div>

              {/* Content Area: Resizable Dark Textarea with subtle focus ring */}
              <div className="p-3 bg-[#111318]">
                <textarea
                  rows={2}
                  value={block.text}
                  onChange={(e) => handleTextChange(index, e.target.value)}
                  placeholder={`輸入 ${block.characterName} 的台詞內容...`}
                  className="w-full p-3 bg-[#141720] border border-slate-800 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-[#f97316] transition-colors resize-y leading-relaxed font-sans placeholder-slate-600"
                />

                <div className="flex items-center justify-between pt-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>語音角色：</span>
                    <span className="text-amber-300 font-mono">
                      {speakerVoiceMap.get(block.characterName)?.displayName || '預設音色'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePreviewBlock(block)}
                    disabled={playingBlockId !== null}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 transition-colors text-[11px]"
                  >
                    {playingBlockId === block.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    ) : (
                      <Volume2 className="w-3 h-3 text-amber-400" />
                    )}
                    <span>試聽此格</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Block Button Bar */}
      <div className="flex items-center justify-center pt-2">
        <button
          type="button"
          onClick={() => handleInsertBlockBelow(blocks.length - 1)}
          className="px-5 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-amber-400/60 bg-slate-900/60 hover:bg-slate-800/80 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>➕ 插入新對話格子</span>
        </button>
      </div>

      {/* Bottom Synthesis & Export Floating Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-slate-950/90 border-t border-slate-800 backdrop-blur-md shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>多人對話音訊合成</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  共 {blocks.length} 段對話 · {totalCharCount} 字
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                依據各角色指定聲音（甲: 雲希、乙: 雲揚）無縫串接為單一 MP3 檔案
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Synthesized Audio Player if Ready */}
            {synthesizedAudioUrl && (
              <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                <audio
                  ref={fullAudioRef}
                  src={synthesizedAudioUrl}
                  onEnded={() => setIsPlayingFullAudio(false)}
                />
                <button
                  type="button"
                  onClick={handleTogglePlayFull}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-300 transition-colors"
                >
                  {isPlayingFullAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlayingFullAudio ? '暫停播放' : '試聽全篇'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadFullAudio}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下載 MP3</span>
                </button>
              </div>
            )}

            {/* Synthesize Button */}
            <button
              type="button"
              onClick={handleSynthesizeAll}
              disabled={isSynthesizingAll}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 flex-1 sm:flex-none"
            >
              {isSynthesizingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在合成 ({synthesisProgress}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>生成整段多人配音</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI 智慧選角色對話方塊 (Modal Dialog for Command + V Pasting) */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  ✨
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    AI 智慧選角色（貼上文章自動分格）
                  </h3>
                  <p className="text-xs text-slate-400">
                    請按 <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px]">Command + V</kbd> 貼上小說對話文字
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Quick sample buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-400">快速填入範例：</span>
                <button
                  type="button"
                  onClick={() =>
                    setPasteScriptText(
                      '甲說：「你投進了一個三分球。」\n乙說：「牛逼啊！」\n甲又說：「Easy peasy」'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                >
                  三分球投籃對話（甲/乙）
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPasteScriptText(
                      '甲：「1+1=?」\n乙：「2」\n甲說：「答對了，太神啦！」'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                >
                  數學問答對白
                </button>
              </div>

              {/* Textarea for Command + V */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>文章內容輸入框</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {pasteScriptText.length} 字元
                  </span>
                </label>
                <textarea
                  rows={8}
                  value={pasteScriptText}
                  onChange={(e) => setPasteScriptText(e.target.value)}
                  placeholder={`請把文章 Command + V 貼進來，例如：\n甲說：「你投進了一個三分球。」\n乙說：「牛逼啊！」\n甲又說：「Easy peasy」`}
                  className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-400 font-sans leading-relaxed resize-y placeholder-slate-600"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI 自動分格規則：</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                  <li>自動辨識「甲說：『...』」、「乙說：『...』」並依序分拆為格子。</li>
                  <li>自動比對角色庫中的現存角色（如甲、乙、旁白）。</li>
                  <li>若有多句交替，會精準按照發言者分屬不同格子，如圖片所示。</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/95">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                取消
              </button>

              <button
                type="button"
                onClick={handleExecuteAiParse}
                disabled={isParsing || !pasteScriptText.trim()}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-xl transition-colors shadow-lg shadow-amber-400/20 flex items-center gap-1.5"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI 分解中...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>確認生成對話格子</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
