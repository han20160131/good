/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomCharacter } from '../types';

/**
 * 10 distinctive role colors as shown in the user's reference image attachment:
 * [Red, Amber, Green, Blue, Indigo, Pink, Teal, Orange, Cyan, Purple]
 */
export const CHARACTER_COLORS: string[] = [
  '#ef4444', // 0: 紅色
  '#f59e0b', // 1: 琥珀金
  '#22c55e', // 2: 翡翠綠
  '#3b82f6', // 3: 寶石藍
  '#6366f1', // 4: 靛藍紫
  '#ec4899', // 5: 玫瑰粉
  '#14b8a6', // 6: 湖水綠
  '#f97316', // 7: 活力橙
  '#06b6d4', // 8: 晴空青
  '#a855f7', // 9: 亮紫色
];

/**
 * Popular Chinese voices for quick role assignment,
 * specifically highlighting user choices:
 * - 甲 ➜ 雲希 (遠行一 / 遠者)
 * - 乙 ➜ 雲揚 (元陽)
 */
export const POPULAR_ROLE_VOICES = [
  {
    voiceCode: 'zh-CN-YunxiNeural',
    displayName: '雲希 · 青年男聲（遠行一 / 遠者）',
    gender: 'male' as const,
    description: '清爽陽光青年男聲，熱血主角、學生少年首選',
  },
  {
    voiceCode: 'zh-CN-YunyangNeural',
    displayName: '雲揚 · 播音男聲（元陽 / 專業播音）',
    gender: 'male' as const,
    description: '渾厚大氣播音男聲，新聞、專業旁白、成熟強者',
  },
  {
    voiceCode: 'zh-CN-YunjianNeural',
    displayName: '雲健 · 沉穩老者（宗主 / 長老）',
    gender: 'male' as const,
    description: '蒼老厚重老爺爺音，威嚴長老、師祖、智者',
  },
  {
    voiceCode: 'zh-CN-YunxiaNeural',
    displayName: '雲夏 · 熱血活潑（少年俠客）',
    gender: 'male' as const,
    description: '熱血衝動少年音，青春朝氣、熱血小師弟',
  },
  {
    voiceCode: 'zh-CN-XiaoxiaoNeural',
    displayName: '曉曉 · 知性溫柔（女主角）',
    gender: 'female' as const,
    description: '溫潤大方知性女聲，小說女主角、聰穎師姐',
  },
  {
    voiceCode: 'zh-CN-XiaoyiNeural',
    displayName: '曉伊 · 靈動活潑（小師妹）',
    gender: 'female' as const,
    description: '靈動可愛少女音，活潑俏皮小師妹、萌寵精靈',
  },
  {
    voiceCode: 'zh-TW-HsiaoChenNeural',
    displayName: '曉臻 · 台灣溫柔女聲',
    gender: 'female' as const,
    description: '台灣國語溫柔女聲，自然親切、現代言情首選',
  },
  {
    voiceCode: 'zh-TW-YunJheNeural',
    displayName: '雲哲 · 台灣自然男聲',
    gender: 'male' as const,
    description: '台灣國語自然男聲，溫和理性、現代都市主角',
  },
  {
    voiceCode: 'zh-CN-YunzeNeural',
    displayName: '雲澤 · 儒雅學士男聲',
    gender: 'male' as const,
    description: '儒雅文質青年男聲，軍師、學霸、冷靜謀士',
  },
  {
    voiceCode: 'zh-CN-YunfengNeural',
    displayName: '雲楓 · 冷峻俠客男聲',
    gender: 'male' as const,
    description: '冷酷孤傲俠客男聲，劍客、殺手、霸道總裁',
  },
  {
    voiceCode: 'zh-CN-liaoning-XiaobeiNeural',
    displayName: '東北小北 · 幽默特色女聲',
    gender: 'female' as const,
    description: '東北口音風趣女聲，喜劇、熱情幽默配角',
  },
  {
    voiceCode: 'zh-CN-shaanxi-XiaoniNeural',
    displayName: '陝西小妮 · 豪爽特色女聲',
    gender: 'female' as const,
    description: '西北特色豪爽女聲，江湖俠女、性格配角',
  },
];

/**
 * Storage helpers for Character Library
 */
const STORAGE_KEY = 'novel_voice_custom_characters';

export function loadStoredCharacters(): CustomCharacter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading characters from localStorage:', e);
  }
  return [];
}

export function saveStoredCharacters(characters: CustomCharacter[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  } catch (e) {
    console.error('Error saving characters to localStorage:', e);
  }
}
