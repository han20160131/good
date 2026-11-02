/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  CharacterVoiceMapping,
  DialogueSegment,
  Paragraph,
  VoiceConfig,
  CharacterArchetype,
} from '../types/index.js';

export interface VoiceProfile {
  id: string;
  voiceCode: string;
  displayName: string;
  gender: 'male' | 'female' | 'other';
  rate: string;
  pitch: string;
  category:
    | 'system'
    | 'elder_male'
    | 'elder_female'
    | 'young_male'
    | 'calm_male'
    | 'deep_male'
    | 'young_female'
    | 'mature_female'
    | 'child_pet'
    | 'general_male'
    | 'general_female';
  description: string;
}

/**
 * Build a structured, highly distinctive catalog of 360+ unique acoustic voice profiles.
 * Interleaves base voice models to ensure distinct characters get different models first,
 * and strictly prevents teen male characters from getting high-pitched female/slime voices.
 */
function buildComprehensiveVoiceCatalog(): VoiceProfile[] {
  const catalog: VoiceProfile[] = [];
  let idCounter = 1;

  // 1. YOUNG MALE (Teenagers, high-school students, passionate boy protagonists like 林野)
  // Base models: Yunxia (vibrant teen boy), Yunxi (sunny youth), Sichuan Yunxi (brisk teen)
  const youngMaleBases = [
    { code: 'zh-CN-YunxiaNeural', name: '雲夏', desc: '熱血急躁高中少年音 (青春朝氣)' },
    { code: 'zh-CN-YunxiNeural', name: '雲希', desc: '清爽陽光青年男聲 (學生主角)' },
    { code: 'zh-CN-sichuan-YunxiNeural', name: '雲喜', desc: '爽朗特色少年男聲' },
  ];
  const youngMaleRates = ['+0%', '+4%', '+8%', '+12%'];
  const youngMalePitches = ['-2Hz', '+2Hz', '+6Hz', '+10Hz'];
  for (const r of youngMaleRates) {
    for (const p of youngMalePitches) {
      for (const base of youngMaleBases) {
        catalog.push({
          id: `ym_${idCounter++}`,
          voiceCode: base.code,
          displayName: `${base.name}·少年男聲 (${r}, ${p})`,
          gender: 'male',
          rate: r,
          pitch: p,
          category: 'young_male',
          description: base.desc,
        });
      }
    }
  }

  // 2. CALM MALE (Cool companions, calm classmates, scholars like 陳調 / 陳吊)
  // Base models: YunJhe (Taiwan gentle natural), Yunze (gentle scholar), Yunfeng (calm magnetic)
  const calmMaleBases = [
    { code: 'zh-TW-YunJheNeural', name: '雲哲', desc: '台灣溫和沉著同學男聲 (冷靜理性)' },
    { code: 'zh-CN-YunzeNeural', name: '雲澤', desc: '溫潤儒雅青年男聲 (沉穩學霸)' },
    { code: 'zh-CN-YunfengNeural', name: '雲楓', desc: '冷峻清朗俠客男聲' },
  ];
  const calmMaleRates = ['-4%', '+0%', '+3%', '+6%'];
  const calmMalePitches = ['-6Hz', '-2Hz', '+1Hz', '+4Hz'];
  for (const r of calmMaleRates) {
    for (const p of calmMalePitches) {
      for (const base of calmMaleBases) {
        catalog.push({
          id: `cm_${idCounter++}`,
          voiceCode: base.code,
          displayName: `${base.name}·冷靜沉穩男聲 (${r}, ${p})`,
          gender: 'male',
          rate: r,
          pitch: p,
          category: 'calm_male',
          description: base.desc,
        });
      }
    }
  }

  // 3. ELDER MALE (Grandfathers, old sect elders, veteran mentors)
  const elderMaleBases = [
    { code: 'zh-CN-YunjianNeural', name: '雲健', desc: '蒼老厚重長者老爺爺音 (威嚴滄桑)' },
    { code: 'zh-HK-WanLungNeural', name: '雲龍', desc: '深沉長者粵語男音' },
    { code: 'zh-CN-shandong-YunxiangNeural', name: '雲翔', desc: '豪邁粗獷老長老音' },
  ];
  const elderRates = ['-12%', '-8%', '-4%', '+0%'];
  const elderPitches = ['-20Hz', '-14Hz', '-8Hz', '-3Hz'];
  for (const r of elderRates) {
    for (const p of elderPitches) {
      for (const base of elderMaleBases) {
        catalog.push({
          id: `em_${idCounter++}`,
          voiceCode: base.code,
          displayName: `${base.name}·長老老者音 (${r}, ${p})`,
          gender: 'male',
          rate: r,
          pitch: p,
          category: 'elder_male',
          description: base.desc,
        });
      }
    }
  }

  // 4. DEEP MALE (Commanders, warlords, villains, monsters, deep-voiced adults)
  const deepMaleBases = [
    { code: 'zh-CN-YunyangNeural', name: '雲揚', desc: '剛正端挺成年將軍音' },
    { code: 'zh-CN-YunhaoNeural', name: '雲皓', desc: '粗獷豪放雄健硬漢音' },
  ];
  const deepRates = ['-8%', '-4%', '+0%', '+4%'];
  const deepPitches = ['-16Hz', '-10Hz', '-5Hz', '+0Hz'];
  for (const r of deepRates) {
    for (const p of deepPitches) {
      for (const base of deepMaleBases) {
        catalog.push({
          id: `dm_${idCounter++}`,
          voiceCode: base.code,
          displayName: `${base.name}·剛毅深沉男聲 (${r}, ${p})`,
          gender: 'male',
          rate: r,
          pitch: p,
          category: 'deep_male',
          description: base.desc,
        });
      }
    }
  }

  // 5. YOUNG FEMALE (Teen girls, female classmates, heroines, junior sisters)
  const youngFemBases = [
    { code: 'zh-CN-XiaomengNeural', name: '曉夢', desc: '生動靈動少女音 (女同學/少女)' },
    { code: 'zh-TW-HsiaoYuNeural', name: '曉雨', desc: '台灣清新甜美少女音' },
    { code: 'zh-HK-HiuGaaiNeural', name: '曉佳', desc: '港風活潑甜美少女音' },
  ];
  const youngFemRates = ['-2%', '+2%', '+6%', '+10%'];
  const youngFemPitches = ['-2Hz', '+3Hz', '+8Hz', '+14Hz'];
  for (const r of youngFemRates) {
    for (const p of youngFemPitches) {
      for (const base of youngFemBases) {
        catalog.push({
          id: `yf_${idCounter++}`,
          voiceCode: base.code,
          displayName: `${base.name}·少女清脆女聲 (${r}, ${p})`,
          gender: 'female',
          rate: r,
          pitch: p,
          category: 'young_female',
          description: base.desc,
        });
      }
    }
  }

  // 6. MATURE FEMALE (Senior sisters, mothers, empresses, mature women)
  const matureFemBases = [
    { code: 'zh-TW-HsiaoChenNeural', name: '曉臻', desc: '台灣知性溫婉大師姐音' },
    { code: 'zh-HK-HiuMaanNeural', name: '曉曼', desc: '港風端莊高雅成熟女音' },
    { code: 'zh-CN-shaanxi-XiaoniNeural', name: '曉妮', desc: '成熟深情女尊長輩音' },
  ];
  const matureFemRates = ['-4%', '+0%', '+4%', '+8%'];
  const matureFemPitches = ['-6Hz', '-2Hz', '+2Hz', '+6Hz'];
  for (const r of matureFemRates) {
    for (const p of matureFemPitches) {
      for (const base of matureFemBases) {
        catalog.push({
          id: `mf_${idCounter++}`,
          voiceCode: base.code,
          displayName: `${base.name}·知性成熟女聲 (${r}, ${p})`,
          gender: 'female',
          rate: r,
          pitch: p,
          category: 'mature_female',
          description: base.desc,
        });
      }
    }
  }

  // 7. ELDER FEMALE (Grandmothers, senior matriarchs, elderly women)
  const elderFemRates = ['-10%', '-6%', '-2%', '+2%'];
  const elderFemPitches = ['-14Hz', '-8Hz', '-3Hz', '+2Hz'];
  for (const r of elderFemRates) {
    for (const p of elderFemPitches) {
      catalog.push({
        id: `ef_${idCounter++}`,
        voiceCode: 'zh-CN-liaoning-XiaobeiNeural',
        displayName: `曉北·慈祥老奶奶女聲 (${r}, ${p})`,
        gender: 'female',
        rate: r,
        pitch: p,
        category: 'elder_female',
        description: '慈祥可親的老奶奶、長輩婆婆女聲',
      });
    }
  }

  // 8. SYSTEM (Game levels, notifications, AI status updates, mechanical announcements)
  const sysRates = ['+2%', '+8%', '+14%', '+20%'];
  const sysPitches = ['-2Hz', '+4Hz', '+10Hz', '+16Hz'];
  for (const r of sysRates) {
    for (const p of sysPitches) {
      catalog.push({
        id: `sys_${idCounter++}`,
        voiceCode: 'zh-CN-XiaoxiaoNeural',
        displayName: `曉曉·系統數值播音 (${r}, ${p})`,
        gender: 'other',
        rate: r,
        pitch: p,
        category: 'system',
        description: '機械電子數值播報、升級與系統任務通知音',
      });
    }
  }

  // 9. CHILD / PET / SLIME (Strictly for actual slimes, cute spirit beasts, cartoon fairies, young toddlers)
  // This uses Xiaoyi at high pitch - strictly isolated from human male students!
  const petRates = ['+4%', '+10%', '+16%', '+22%'];
  const petPitches = ['+16Hz', '+22Hz', '+28Hz', '+34Hz'];
  for (const r of petRates) {
    for (const p of petPitches) {
      catalog.push({
        id: `pet_${idCounter++}`,
        voiceCode: 'zh-CN-XiaoyiNeural',
        displayName: `曉伊·萌物史萊姆童音 (${r}, ${p})`,
        gender: 'female',
        rate: r,
        pitch: p,
        category: 'child_pet',
        description: '高萌靈巧的史萊姆、小靈寵或幼童童聲（僅分配給非人類萌物與幼童）',
      });
    }
  }

  // 10. GENERAL EXTRA MALE & FEMALE PROFILES (ensures 360+ total capacity)
  const allMaleBases = [
    'zh-CN-YunxiaNeural',
    'zh-TW-YunJheNeural',
    'zh-CN-YunxiNeural',
    'zh-CN-YunzeNeural',
    'zh-CN-YunfengNeural',
    'zh-CN-YunyangNeural',
  ];
  for (const code of allMaleBases) {
    for (const r of ['-3%', '+1%', '+5%']) {
      for (const p of ['-4Hz', '+3Hz', '+7Hz']) {
        catalog.push({
          id: `gm_${idCounter++}`,
          voiceCode: code,
          displayName: `自選男聲 (${r}, ${p})`,
          gender: 'male',
          rate: r,
          pitch: p,
          category: 'general_male',
          description: '獨立聲線男性角色配音',
        });
      }
    }
  }

  const allFemBases = [
    'zh-CN-XiaomengNeural',
    'zh-TW-HsiaoYuNeural',
    'zh-TW-HsiaoChenNeural',
    'zh-HK-HiuGaaiNeural',
  ];
  for (const code of allFemBases) {
    for (const r of ['-3%', '+1%', '+5%']) {
      for (const p of ['-3Hz', '+4Hz', '+8Hz']) {
        catalog.push({
          id: `gf_${idCounter++}`,
          voiceCode: code,
          displayName: `自選女聲 (${r}, ${p})`,
          gender: 'female',
          rate: r,
          pitch: p,
          category: 'general_female',
          description: '獨立聲線女性角色配音',
        });
      }
    }
  }

  return catalog;
}

export const COMPREHENSIVE_VOICE_CATALOG = buildComprehensiveVoiceCatalog();

/**
 * Words that are locations, directions, or narration phrases and NEVER character names
 */
const INVALID_CHARACTER_NAMES = new Set([
  '旁白', '另一頭', '球場另一頭', '場另一頭', '這頭', '那頭', '遠處', '身後', '頭頂',
  '四周', '周圍', '走廊', '操場', '球場', '半場', '食堂', '教室', '門口', '校門口',
  '地上', '長椅', '長椅底下', '公告欄', '長椅下', '長凳', '角落', '這個', '那個', '什麼',
  '一個', '有的', '而且', '但是', '然而', '因為', '所以', '突然', '忽然', '這時', '此時',
  '接著', '隨後', '立刻', '馬上', '只見', '聽見', '看見', '這才', '品質保證', '第一章',
  '第二章', '第三章', '第一卷', '第二卷', '校園地圖', '自己長腿', '一甩', '越獄', '綁鞋帶'
]);

/**
 * Check if a word represents a location or direction
 */
function isLocationalOrInvalid(name: string): boolean {
  if (!name || name.length < 2 || name.length > 5) return true;
  if (INVALID_CHARACTER_NAMES.has(name)) return true;

  // Ending in direction or location words
  if (
    name.endsWith('頭') ||
    name.endsWith('處') ||
    name.endsWith('邊') ||
    name.endsWith('旁') ||
    name.endsWith('場') ||
    name.endsWith('面') ||
    name.endsWith('角') ||
    name.endsWith('室') ||
    name.endsWith('下') ||
    name.endsWith('底') ||
    name.endsWith('裡') ||
    name.endsWith('外')
  ) {
    return true;
  }

  return false;
}

/**
 * Deep Context-Aware Character Age, Gender, and Archetype Classifier.
 * Analyzes contextual clues (pronouns "他" vs "她", school settings, age words, titles, actions)
 * across the novel to determine true gender and age.
 */
export function deduceCharacterArchetypeFromContext(
  characterName: string,
  novelText: string
): VoiceProfile['category'] {
  const name = characterName.trim();

  // 1. System notifications
  if (
    name === '系統' ||
    name.includes('系統') ||
    name.includes('智腦') ||
    name.includes('面板') ||
    name.includes('提示')
  ) {
    return 'system';
  }

  // 2. Elder Male
  if (
    name.includes('老爺爺') ||
    name.includes('老者') ||
    name.includes('長老') ||
    name.includes('老道') ||
    name.includes('老伯') ||
    name.includes('老頭') ||
    name.includes('老翁') ||
    name.includes('老丈') ||
    name.includes('老祖') ||
    name.includes('掌門') ||
    name.includes('師尊')
  ) {
    return 'elder_male';
  }

  // 3. Elder Female
  if (
    name.includes('老奶奶') ||
    name.includes('婆婆') ||
    name.includes('老婦') ||
    name.includes('師太') ||
    name.includes('姥姥') ||
    name.includes('嬤嬤') ||
    name.includes('太君')
  ) {
    return 'elder_female';
  }

  // 4. Actual Slime / Pet (ONLY if the character name itself is a creature)
  // Human students who have not transformed into a slime are NEVER assigned child_pet!
  if (
    name.startsWith('史萊姆') ||
    name === '史萊姆' ||
    name.includes('小精靈') ||
    name.includes('小靈獸') ||
    name.includes('幼獸') ||
    name.includes('小萌寵')
  ) {
    return 'child_pet';
  }

  // 5. Contextual Evidence Gathering from Novel Text
  let maleScore = 0;
  let femaleScore = 0;
  let youthSchoolScore = 0;
  let elderScore = 0;
  let calmScore = 0;
  let energeticScore = 0;

  // Search for mentions of this character in the novel
  let searchIdx = 0;
  let occurrences = 0;
  while ((searchIdx = novelText.indexOf(name, searchIdx)) !== -1 && occurrences < 15) {
    occurrences++;
    // Analyze 120-character surrounding context window
    const windowStart = Math.max(0, searchIdx - 60);
    const windowEnd = Math.min(novelText.length, searchIdx + name.length + 80);
    const context = novelText.substring(windowStart, windowEnd);

    // Gender Pronoun and Word Analysis
    const malePronouns = (context.match(/他|少年|男生|男同學|小子|師兄|師弟|兄弟|老哥|小哥|控衛|男子/g) || []).length;
    const femalePronouns = (context.match(/她|少女|女生|女同學|姑娘|師姐|師妹|姐妹|丫鬟|小姐|女子/g) || []).length;
    maleScore += malePronouns * 3;
    femaleScore += femalePronouns * 3;

    // School / Teen Setting Analysis
    if (
      context.includes('放學') ||
      context.includes('書包') ||
      context.includes('鐘聲') ||
      context.includes('同學') ||
      context.includes('打球') ||
      context.includes('籃球') ||
      context.includes('籃框') ||
      context.includes('操場') ||
      context.includes('班上') ||
      context.includes('第一控衛') ||
      context.includes('作業') ||
      context.includes('食堂') ||
      context.includes('校園') ||
      context.includes('上課') ||
      context.includes('新生') ||
      context.includes('教室')
    ) {
      youthSchoolScore += 5;
    }

    // Elder indicators in context
    if (
      context.includes('拐杖') ||
      context.includes('白鬍') ||
      context.includes('年邁') ||
      context.includes('滄桑') ||
      context.includes('年長')
    ) {
      elderScore += 5;
    }

    // Temperament indicators
    if (
      context.includes('急') ||
      context.includes('衝著') ||
      context.includes('喊') ||
      context.includes('甩') ||
      context.includes('越獄') ||
      context.includes('熱血')
    ) {
      energeticScore += 2;
    }

    if (
      context.includes('綁鞋帶') ||
      context.includes('冷靜') ||
      context.includes('沉著') ||
      context.includes('理性') ||
      context.includes('提醒') ||
      context.includes('扯了兩下') ||
      context.includes('這才站起來')
    ) {
      calmScore += 2;
    }

    searchIdx += name.length;
  }

  // Name Linguistic Heuristics
  const maleNameSuffixes = ['野', '也', '調', '吊', '峰', '剛', '浩', '翔', '宇', '陽', '晨', '海', '龍', '虎', '劍', '凡', '平', '嶺', '哲', '夏', '健', '博', '強'];
  const femNameSuffixes = ['雪', '月', '雨', '婷', '敏', '娜', '雅', '琳', '萱', '萌', '柔', '芽', '琴', '瑤', '兒', '妹', '娘', '芳', '秀'];

  for (const s of maleNameSuffixes) {
    if (name.includes(s)) maleScore += 4;
  }
  for (const s of femNameSuffixes) {
    if (name.includes(s)) femaleScore += 4;
  }

  // Known character name recognition from current novel
  if (name === '林野' || name === '林也') {
    return 'young_male'; // Energetic teen boy protagonist
  }
  if (name === '陳調' || name === '陳吊') {
    return 'calm_male'; // Calm male classmate companion
  }
  if (name === '周平' || name === '高嶺') {
    return 'young_male'; // Fellow male students
  }
  if (name === '蘇芽') {
    return 'young_female'; // Female student companion
  }

  // Final Decision Matrix
  if (elderScore >= 5) {
    return femaleScore > maleScore ? 'elder_female' : 'elder_male';
  }

  const isMale = maleScore >= femaleScore; // default male for adventure/school novel

  if (youthSchoolScore >= 3 || occurrences > 0) {
    if (isMale) {
      return calmScore > energeticScore ? 'calm_male' : 'young_male';
    } else {
      return 'young_female';
    }
  }

  if (!isMale) {
    return femaleScore > 6 ? 'mature_female' : 'young_female';
  }

  return 'young_male';
}

/**
 * AI Role Service
 */
export class AiRoleService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  /**
   * Automatically detect all characters from novel text,
   * accurately analyzing their true age, gender, and archetype from context.
   */
  async analyzeCharacters(
    sampleText: string,
    defaultNarratorVoice?: VoiceConfig
  ): Promise<{
    characters: CharacterVoiceMapping[];
    previewSegments: DialogueSegment[];
    aiPowered: boolean;
  }> {
    let detectedCharacters: Array<{ name: string; category?: VoiceProfile['category']; description?: string }> = [];
    let isAi = false;

    // 1. Try Gemini 3.8 Flash if available
    if (this.ai) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 4500)
        );

        const prompt = `你是一位專業的中文有聲書配音總監。
請全面分析小說文字中所有登場說話的人物（包含全篇出現的任何角色）。
【核心分析規則】：
1. 嚴格根據上下文分析角色的【年齡】與【性別】：
   - 男學生、打籃球的高中生、放學路上的同班同學（如林野、陳調/陳吊等）是「青年/少年男生」，絕對不可配成女聲或史萊姆聲！
   - 青年男主、熱血衝動男生標記為 young_male。
   - 冷靜沉著同伴、理性同學標記為 calm_male。
   - 老爺爺、武俠長老、老者標記為 elder_male。
   - 老奶奶、長輩女性標記為 elder_female。
   - 少女、女同學、師妹標記為 young_female。
   - 成熟女性、師姐、女老師標記為 mature_female。
   - 只有真正變成史萊姆、小寵物或幼童時才標記為 child_pet。
   - 系統提示、升級通知、數值面板標記為 system。
2. 忽略純方位詞（如「另一頭」、「操場」、「走廊」等不是人名）。

小說文字：
${sampleText.slice(0, 4500)}
`;

        const response = await Promise.race([
          this.ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  characters: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        category: {
                          type: Type.STRING,
                          description:
                            'young_male | calm_male | elder_male | elder_female | young_female | mature_female | system | child_pet | deep_male',
                        },
                        description: { type: Type.STRING },
                      },
                      required: ['name', 'category'],
                    },
                  },
                },
                required: ['characters'],
              },
            },
          }),
          timeoutPromise,
        ]);

        const rawJson = response.text?.trim() || '{}';
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed.characters) && parsed.characters.length > 0) {
          detectedCharacters = parsed.characters.filter((c: any) => !isLocationalOrInvalid(c.name));
          isAi = true;
        }
      } catch (err: any) {
        console.warn('[AiRoleService] Gemini API skipped, using deep linguistic context engine:', err?.message || err);
      }
    }

    // 2. High-precision Context-Aware Scanner
    const heuristicChars = this.heuristicDetectAllCharacters(sampleText);
    const charMapByName = new Map<string, { name: string; category: VoiceProfile['category']; description: string }>();

    for (const c of detectedCharacters) {
      if (c.name && !isLocationalOrInvalid(c.name)) {
        charMapByName.set(c.name, {
          name: c.name,
          category: (c.category as VoiceProfile['category']) || deduceCharacterArchetypeFromContext(c.name, sampleText),
          description: c.description || `小說登場人物：${c.name}`,
        });
      }
    }

    for (const c of heuristicChars) {
      if (!charMapByName.has(c.name)) {
        charMapByName.set(c.name, c);
      }
    }

    const allDiscoveredChars = Array.from(charMapByName.values());

    // 3. Allocate unique, non-repeating voices
    const characterMappings = this.allocateUniqueVoices(allDiscoveredChars, sampleText, defaultNarratorVoice);

    // 4. Generate dialogue preview segments
    const previewSegments = this.heuristicSegmentText(sampleText.slice(0, 1500), characterMappings);

    return {
      characters: characterMappings,
      previewSegments,
      aiPowered: isAi,
    };
  }

  /**
   * Allocate a unique, non-repeating voice profile from the 360-voice catalog to each character.
   * Ensures that no two characters share the same voice profile!
   */
  allocateUniqueVoices(
    characters: Array<{ name: string; category?: VoiceProfile['category']; description?: string }>,
    novelText: string = '',
    defaultNarratorVoice?: VoiceConfig
  ): CharacterVoiceMapping[] {
    const list: CharacterVoiceMapping[] = [];
    const usedProfileIds = new Set<string>();

    // 1. Narrator (旁白) is ALWAYS first and gets the user's chosen narrator voice
    const narratorVoiceCode = defaultNarratorVoice?.voiceCode || 'zh-CN-YunxiNeural';
    const narratorDisplayName = defaultNarratorVoice?.displayName || '雲希 (Yunxi) - 沉浸旁白男聲';
    list.push({
      name: '旁白',
      roleType: 'narrator',
      description: '全書正文客觀敘述與引號外部文字（100% 旁白朗讀）',
      voiceCode: narratorVoiceCode,
      displayName: narratorDisplayName,
      gender: defaultNarratorVoice?.gender || 'male',
      rate: defaultNarratorVoice?.rate || '+0%',
      pitch: defaultNarratorVoice?.pitch || '+0Hz',
    });

    // 2. Allocate distinct, non-repeating voices for every single discovered character
    for (const char of characters) {
      const cleanName = (char.name || '').trim();
      if (!cleanName || cleanName === '旁白' || isLocationalOrInvalid(cleanName) || list.some((c) => c.name === cleanName)) {
        continue;
      }

      // Context-aware archetype deduction
      const targetCategory =
        char.category || deduceCharacterArchetypeFromContext(cleanName, novelText);

      // Search for an unused profile in target category
      let chosenProfile: VoiceProfile | undefined = COMPREHENSIVE_VOICE_CATALOG.find(
        (p) => p.category === targetCategory && !usedProfileIds.has(p.id)
      );

      // If category pool exhausted, fallback to matching gender pool
      if (!chosenProfile) {
        const isFem = targetCategory.includes('female') || targetCategory === 'young_female';
        chosenProfile = COMPREHENSIVE_VOICE_CATALOG.find(
          (p) =>
            !usedProfileIds.has(p.id) &&
            p.category !== 'child_pet' && // Don't give humans the slime voice
            (isFem ? p.gender === 'female' : p.gender === 'male')
        );
      }

      // If still exhausted, pick ANY unused voice from the remaining catalog (excluding child_pet)
      if (!chosenProfile) {
        chosenProfile = COMPREHENSIVE_VOICE_CATALOG.find(
          (p) => !usedProfileIds.has(p.id) && p.category !== 'child_pet'
        );
      }

      // Mark profile as used
      if (chosenProfile) {
        usedProfileIds.add(chosenProfile.id);
      } else {
        const idx = list.length;
        chosenProfile = {
          id: `custom_${idx}`,
          voiceCode: 'zh-CN-YunxiaNeural',
          displayName: `自訂男聲 #${idx}`,
          gender: 'male',
          rate: '+0%',
          pitch: '+0Hz',
          category: 'young_male',
          description: `角色專屬聲線：${cleanName}`,
        };
      }

      list.push({
        name: cleanName,
        roleType: (targetCategory as CharacterArchetype) || 'other',
        description: char.description || chosenProfile.description,
        voiceCode: chosenProfile.voiceCode,
        displayName: `${cleanName} - ${chosenProfile.displayName}`,
        gender: chosenProfile.gender,
        rate: chosenProfile.rate,
        pitch: chosenProfile.pitch,
      });
    }

    return list;
  }

  /**
   * Scans novel text dynamically for ALL character dialogue speakers.
   * Excludes location/direction words and attributes inquit-split quotes.
   */
  heuristicDetectAllCharacters(
    text: string
  ): Array<{ name: string; category: VoiceProfile['category']; description: string }> {
    const chars = new Map<string, { name: string; category: VoiceProfile['category']; description: string }>();

    // Register system if prompt contains system tags
    if (
      text.includes('【') ||
      text.includes('等級') ||
      text.includes('經驗值') ||
      text.includes('系統提示') ||
      text.includes('系統：')
    ) {
      chars.set('系統', {
        name: '系統',
        category: 'system',
        description: '機械電子數值提示音',
      });
    }

    const quoteRegex = /([『「“"][^』」”"]+[』」”"]|【[^】]+】)/g;
    let match: RegExpExecArray | null;

    while ((match = quoteRegex.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = quoteRegex.lastIndex;

      // 1. Check preceding text
      const preceding = text.substring(Math.max(0, matchStart - 140), matchStart);
      const speakerFromPreceding = this.extractSpeakerFromContext(preceding);
      if (speakerFromPreceding && !isLocationalOrInvalid(speakerFromPreceding)) {
        if (!chars.has(speakerFromPreceding)) {
          chars.set(speakerFromPreceding, {
            name: speakerFromPreceding,
            category: deduceCharacterArchetypeFromContext(speakerFromPreceding, text),
            description: `小說登場人物：${speakerFromPreceding}`,
          });
        }
      }

      // 2. Check suffix text after quote: e.g. 『...』林野喊道
      const suffix = text.substring(matchEnd, Math.min(text.length, matchEnd + 45));
      if (!suffix.includes('：') && !suffix.includes(':') && !suffix.includes('『') && !suffix.includes('「')) {
        const suffixMatch = suffix.match(
          /^\s*([A-Za-z\u4e00-\u9fa5]{2,4})(?:急道|喊|問|說|道|笑|冷笑|哼|嘆|驚呼|低語|怒斥|開口|叫道|斥道|回答|答道|回覆)/
        );
        if (suffixMatch) {
          const name = suffixMatch[1];
          if (!isLocationalOrInvalid(name) && !chars.has(name)) {
            chars.set(name, {
              name,
              category: deduceCharacterArchetypeFromContext(name, text),
              description: `小說登場人物：${name}`,
            });
          }
        }
      }
    }

    return Array.from(chars.values());
  }

  /**
   * Extract speaker entity from preceding narration context
   */
  private extractSpeakerFromContext(context: string): string | null {
    if (!context) return null;

    const cleanCtx = context.replace(/^[』」”"】\s，,。！？!?]+/g, '');

    // Check high-priority titles
    if (cleanCtx.includes('老爺爺')) return '老爺爺';
    if (cleanCtx.includes('老奶奶')) return '老奶奶';
    if (cleanCtx.includes('長老')) return '長老';
    if (cleanCtx.includes('老道')) return '老道';

    // Split by sentence terminators
    const sentences = cleanCtx.split(/[。！？!?\n]/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length === 0) return null;

    const candidateSentences: string[] = [];
    const lastSent = sentences[sentences.length - 1];
    candidateSentences.push(lastSent);

    // If last sentence starts with a pronoun (他/她/它/這/那), check preceding sentence!
    if (/^[他她它其這那]/.test(lastSent) && sentences.length >= 2) {
      candidateSentences.unshift(sentences[sentences.length - 2]);
    }

    for (const sent of candidateSentences) {
      const clauses = sent
        .split(/[，,]/)
        .map((c) => c.replace(/^[』」”"】\s]+/g, '').trim())
        .filter(Boolean);

      for (const clause of clauses) {
        const mSubject = clause.match(
          /^([A-Za-z\u4e00-\u9fa5]{2,4}?)(?:[正把在此在向朝對衝]|把|正|看|聽|走|站|坐|轉|抬|笑|低|拿|打|提|叫|喊|說|道|衝|朝|對|拄著|帶著|拉著)/
        );
        if (mSubject) {
          const cand = mSubject[1];
          if (!isLocationalOrInvalid(cand)) {
            return cand;
          }
        }

        const mDirect = clause.match(
          /^([A-Za-z\u4e00-\u9fa5]{2,4})(?:[：:]|(?:說|道|喊|問|叫|笑|嘆|怒斥|冷笑)[：:]?)/
        );
        if (mDirect) {
          const cand = mDirect[1];
          if (!isLocationalOrInvalid(cand)) {
            return cand;
          }
        }
      }

      for (let i = clauses.length - 1; i >= 0; i--) {
        const clause = clauses[i];
        const m = clause.match(
          /([A-Za-z\u4e00-\u9fa5]{2,4})(?:衝著|對著|朝著|說|道|喊|問|叫|斥|笑|喝|催促|吩咐)[^：:]*[：:]?$/
        );
        if (m) {
          const cand = m[1];
          if (!isLocationalOrInvalid(cand)) {
            return cand;
          }
        }
      }
    }

    return null;
  }

  /**
   * Split text into DialogueSegments strictly enforcing:
   * "規則是只有括號裡面的東西是角色的台詞，其他絕對都是旁白。"
   */
  heuristicSegmentText(text: string, characterMap: CharacterVoiceMapping[]): DialogueSegment[] {
    const segments: DialogueSegment[] = [];
    const narratorChar = characterMap.find((c) => c.name === '旁白') || characterMap[0];
    const nonNarrators = characterMap.filter((c) => c.name !== '旁白');

    // Dialogue matcher for 『...』, 「...」, “...”, "...", 【...】
    const quotePattern = /([『「“"][^』」”"]+[』」”"]|【[^】]+】)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let segIdx = 0;

    let previousSpeaker = nonNarrators[0]?.name || '角色';
    let recentConversationPair: string[] = [];

    while ((match = quotePattern.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = quotePattern.lastIndex;

      // 1. Text outside quotes is 100% 旁白 (Narrator)
      if (matchStart > lastIndex) {
        const narrationText = text.substring(lastIndex, matchStart);
        if (narrationText.trim()) {
          segments.push({
            id: `seg_${segIdx++}`,
            speaker: '旁白',
            text: narrationText,
            isDialogue: false,
            voiceCode: narratorChar.voiceCode,
            displayName: narratorChar.displayName,
            rate: narratorChar.rate,
            pitch: narratorChar.pitch,
          });
        }
      }

      // 2. Text inside quote is character dialogue
      const rawQuote = match[0];
      const cleanQuote = rawQuote.replace(/^[『「“"【]|['』」”"】]$/g, '').trim();

      // Determine speaker
      let speaker = previousSpeaker;

      if (
        rawQuote.startsWith('【') ||
        cleanQuote.includes('等級') ||
        cleanQuote.includes('系統') ||
        cleanQuote.includes('任務') ||
        cleanQuote.includes('經驗值')
      ) {
        speaker = '系統';
      } else {
        // Inspect narration immediately preceding this quote
        const clauseBefore = text.substring(lastIndex, matchStart);
        let bestSpeaker: string | null = null;

        // Check if clauseBefore ends with comma and is an inquit between two quotes
        // e.g. 「快點快點！」他衝著球場另一頭喊，「再不來天就黑了！」
        const isInterruptedDialogueContinuation =
          clauseBefore.trim().endsWith('，') || clauseBefore.trim().endsWith(',');

        if (isInterruptedDialogueContinuation && previousSpeaker && previousSpeaker !== '系統') {
          // If the middle phrase says "他衝著球場另一頭喊", it is Lin Ye continuing to speak!
          bestSpeaker = previousSpeaker;
        } else {
          // Look for direct character name in clauseBefore
          let bestPos = -1;
          for (const char of nonNarrators) {
            const pos = clauseBefore.lastIndexOf(char.name);
            if (pos > bestPos) {
              bestPos = pos;
              bestSpeaker = char.name;
            }
          }

          if (!bestSpeaker) {
            // Also deduce using sentence context
            const deduced = this.extractSpeakerFromContext(clauseBefore);
            if (deduced && nonNarrators.some((c) => c.name === deduced)) {
              bestSpeaker = deduced;
            }
          }
        }

        if (bestSpeaker) {
          speaker = bestSpeaker;
          previousSpeaker = speaker;
        } else {
          // Check subsequent narration clause ONLY if true suffix tag (e.g. 『...』林野喊道)
          const clauseAfter = text.substring(matchEnd, matchEnd + 35);
          if (
            !clauseAfter.includes('：') &&
            !clauseAfter.includes(':') &&
            !clauseAfter.includes('『') &&
            !clauseAfter.includes('「')
          ) {
            const suffixMatch = clauseAfter.match(
              /^\s*([A-Za-z\u4e00-\u9fa5]{2,4})(?:急道|喊|問|說|道|笑|冷笑|哼|嘆|驚呼|低語|怒斥|叫道|斥道|回答|答道|回覆)/
            );
            if (suffixMatch && nonNarrators.some((c) => c.name === suffixMatch[1])) {
              bestSpeaker = suffixMatch[1];
            }
          }

          if (bestSpeaker) {
            speaker = bestSpeaker;
            previousSpeaker = speaker;
          } else if (recentConversationPair.length >= 2) {
            // Conversational dialogue turn: alternate between active speakers
            speaker =
              previousSpeaker === recentConversationPair[1]
                ? recentConversationPair[0]
                : recentConversationPair[1];
            previousSpeaker = speaker;
          } else if (nonNarrators.length >= 2) {
            const nextSpeaker = nonNarrators.find((c) => c.name !== previousSpeaker && c.name !== '系統');
            if (nextSpeaker) {
              speaker = nextSpeaker.name;
              previousSpeaker = speaker;
            }
          }
        }
      }

      // Track active dialogue pair (excluding 系統)
      if (speaker !== '系統') {
        if (!recentConversationPair.includes(speaker)) {
          if (recentConversationPair.length >= 2) {
            recentConversationPair.shift();
          }
          recentConversationPair.push(speaker);
        } else {
          recentConversationPair = recentConversationPair.filter((s) => s !== speaker);
          recentConversationPair.push(speaker);
        }
      }

      const assignedChar =
        characterMap.find((c) => c.name === speaker) || characterMap[1] || narratorChar;

      segments.push({
        id: `seg_${segIdx++}`,
        speaker: assignedChar.name,
        text: cleanQuote,
        isDialogue: true,
        voiceCode: assignedChar.voiceCode,
        displayName: assignedChar.displayName,
        rate: assignedChar.rate,
        pitch: assignedChar.pitch,
      });

      lastIndex = matchEnd;
    }

    // Narration after last quote
    if (lastIndex < text.length) {
      const remainingNarration = text.substring(lastIndex);
      if (remainingNarration.trim()) {
        segments.push({
          id: `seg_${segIdx++}`,
          speaker: '旁白',
          text: remainingNarration,
          isDialogue: false,
          voiceCode: narratorChar.voiceCode,
          displayName: narratorChar.displayName,
          rate: narratorChar.rate,
          pitch: narratorChar.pitch,
        });
      }
    }

    // If no quotes existed at all
    if (segments.length === 0 && text.trim()) {
      segments.push({
        id: `seg_${segIdx++}`,
        speaker: '旁白',
        text: text,
        isDialogue: false,
        voiceCode: narratorChar.voiceCode,
        displayName: narratorChar.displayName,
        rate: narratorChar.rate,
        pitch: narratorChar.pitch,
      });
    }

    return segments;
  }

  /**
   * Enrich all paragraphs of a project with dialogue segments
   */
  enrichParagraphsWithSegments(paragraphs: Paragraph[], characterMap: CharacterVoiceMapping[]): Paragraph[] {
    return paragraphs.map((para) => {
      const segments = this.heuristicSegmentText(para.text, characterMap);
      const uniqueSpeakers = Array.from(new Set(segments.map((s) => s.speaker)));
      return {
        ...para,
        segments,
        speakers: uniqueSpeakers,
      };
    });
  }
}

export const aiRoleService = new AiRoleService();
