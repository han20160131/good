/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ParagraphStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DialogueSegment {
  id: string;
  speaker: string; // e.g. "旁白", "林也", "陳調", "老爺爺", "系統"
  text: string;
  isDialogue: boolean; // false for outside brackets/narrator, true for inside brackets
  voiceCode: string;
  displayName?: string;
  rate?: string;
  pitch?: string;
}

export type CharacterArchetype =
  | 'narrator'
  | 'male_young'
  | 'male_calm'
  | 'male_elder'
  | 'female_young'
  | 'female_mature'
  | 'female_elder'
  | 'system'
  | 'child'
  | 'other';

export interface CustomCharacter {
  id: string;
  name: string; // e.g. "甲", "乙", "旁白", "林天"
  voiceCode: string; // e.g. "zh-CN-YunxiNeural" (遠行一), "zh-CN-YunyangNeural" (元陽)
  displayName: string;
  color: string; // Hex color string, e.g. '#ef4444'
  gender: 'male' | 'female' | 'other';
  rate: string; // e.g. "+0%"
  pitch: string; // e.g. "+0Hz"
  description?: string;
  createdAt: number;
}

export interface MultiVoiceBlock {
  id: string;
  characterName: string; // e.g. "甲", "乙", "旁白"
  color: string; // Color hex code matching the 10 dots
  text: string;
  pauseSeconds?: number;
  audioUrl?: string;
  status?: 'idle' | 'synthesizing' | 'completed' | 'failed';
}

export interface CharacterVoiceMapping {
  name: string;
  roleType: CharacterArchetype;
  description?: string;
  voiceCode: string;
  displayName: string;
  gender: 'male' | 'female' | 'other';
  rate: string;
  pitch: string;
}

export interface Paragraph {
  id: string;
  chapterIndex: number;
  paragraphIndex: number;
  text: string;
  wordCount: number;
  status: ParagraphStatus;
  retryCount: number;
  audioUrl?: string;
  audioDurationSeconds?: number;
  fileSizeBytes?: number;
  errorMessage?: string;
  updatedAt?: number;
  // Multi-role dialogue breakdown
  segments?: DialogueSegment[];
  speakers?: string[];
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  paragraphs: Paragraph[];
  totalWords: number;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  createdAt: number;
}

export interface NovelProject {
  id: string;
  userId?: string;
  ownerName?: string;
  title: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  totalWords: number;
  chapters: Chapter[];
  voiceSettings: VoiceConfig;
  status: 'draft' | 'queued' | 'processing' | 'paused' | 'completed' | 'has_errors';
  outputDirectory?: string;
  // AI multi-role mode
  enableAiRoles?: boolean;
  characterVoices?: CharacterVoiceMapping[];
  // Contextual Polyphone Auto-Correction (多音字上下文自動修正)
  enablePolyphoneFix?: boolean;
  customPolyphoneRules?: PolyphoneRule[];
  polyphoneCount?: number;
}

export interface PolyphoneRule {
  id: string;
  originalText: string;
  replacementPhonetic: string;
  pinyin: string;
  zhuyin?: string;
  explanation: string;
  category: 'common' | 'cultivation' | 'novel' | 'custom';
  enabled: boolean;
}

export interface VoiceConfig {
  voiceCode: string; // e.g. 'zh-CN-YunxiNeural', 'zh-CN-XiaoxiaoNeural', etc.
  displayName: string;
  gender: 'male' | 'female' | 'other';
  locale?: string;
  rate: string; // e.g. "+0%", "+15%", "-10%"
  pitch: string; // e.g. "+0Hz", "+5Hz"
  volume: string; // e.g. "+0%"
}

export type VoiceCategory = 'mandarin' | 'taiwan' | 'cantonese' | 'regional' | 'english' | 'japanese' | 'korean' | 'other';

export interface VoiceOption {
  shortName: string;
  name?: string;
  friendlyName?: string;
  displayName: string;
  gender: 'male' | 'female' | 'other';
  locale: string;
  localeName: string;
  category: VoiceCategory;
  description: string;
  tags: string[];
  sampleText: string;
  isPopular?: boolean;
}

export interface SystemStats {
  totalProjects: number;
  totalWords: number;
  totalAudioDurationSeconds: number;
  completedTasks: number;
  runningTasks: number;
  failedTasks: number;
  diskCacheUsedBytes: number;
  diskCacheLimitBytes: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  projectId?: string;
  paragraphId?: string;
  isMock?: boolean;
}

export interface BackendStatus {
  connected: boolean;
  version?: string;
  checkedAt: number;
  error?: string;
}
