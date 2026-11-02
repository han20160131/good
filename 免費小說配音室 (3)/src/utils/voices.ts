/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoiceOption, VoiceConfig, VoiceCategory } from '../types';

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceCode: 'zh-CN-YunxiNeural',
  displayName: '雲希 (Yunxi) - 微軟青年男聲・玄幻仙俠',
  gender: 'male',
  locale: 'zh-CN',
  rate: '+0%',
  pitch: '+0Hz',
  volume: '+0%',
};

export const POPULAR_CHINESE_VOICES: VoiceOption[] = [
  {
    shortName: 'zh-CN-YunxiNeural',
    displayName: '雲希 (Yunxi)',
    gender: 'male',
    locale: 'zh-CN',
    localeName: '中文（普通話）',
    category: 'mandarin',
    description: '聲線清亮且富有敘事沉浸感，仙俠修真、玄幻小說與熱血冒險的最佳首選男聲。',
    tags: ['玄幻仙俠', '熱血青年', '沉浸旁白', '高人氣首選'],
    sampleText: '道友請留步！此去青玄宗路途遙遠，若無飛劍護身，恐遭山間妖魔暗算。',
    isPopular: true,
  },
  {
    shortName: 'zh-CN-XiaoxiaoNeural',
    displayName: '曉曉 (Xiaoxiao)',
    gender: 'female',
    locale: 'zh-CN',
    localeName: '中文（普通話）',
    category: 'mandarin',
    description: '聲音溫潤流暢、多情感生動，有聲書演繹、都會言情與溫暖故事的王牌女聲。',
    tags: ['有聲名家', '溫暖生動', '都會情感', '全能女聲'],
    sampleText: '窗外的微風輕輕吹動著簾幕，她抬起頭，眼中泛起一抹溫柔的笑意。',
    isPopular: true,
  },
  {
    shortName: 'zh-CN-YunjianNeural',
    displayName: '雲健 (Yunjian)',
    gender: 'male',
    locale: 'zh-CN',
    localeName: '中文（普通話）',
    category: 'mandarin',
    description: '沉穩渾厚、磁性成熟，極具厚重史詩感，適合武俠江湖、歷史爭霸與懸疑大作。',
    tags: ['武俠江湖', '沉穩磁性', '影視解說', '歷史厚重'],
    sampleText: '大漠孤煙直，長河落日圓。三十年前那場驚天動地的決戰，至今仍在江湖中流傳。',
    isPopular: true,
  },
  {
    shortName: 'zh-CN-YunyangNeural',
    displayName: '雲揚 (Yunyang)',
    gender: 'male',
    locale: 'zh-CN',
    localeName: '中文（普通話）',
    category: 'mandarin',
    description: '字正腔圓、專業大氣，適合嚴肅紀實、軍事科幻與刑偵推理小說。',
    tags: ['專業播報', '紀實莊重', '硬派科幻', '大氣宏偉'],
    sampleText: '據前線傳來的緊急情報，敵軍艦隊已越過第三防禦圈，全軍進入一級戰備狀態。',
    isPopular: true,
  },
  {
    shortName: 'zh-CN-XiaoyiNeural',
    displayName: '曉伊 (Xiaoyi)',
    gender: 'female',
    locale: 'zh-CN',
    localeName: '中文（普通話）',
    category: 'mandarin',
    description: '清新甜美、溫和柔亮，非常適合青春校園、治癒系生活與輕小說。',
    tags: ['清新甜美', '治癒系', '輕小說', '校園青春'],
    sampleText: '陽光穿過樹梢灑在長椅上，今天的故事，就從那家轉角的咖啡館說起吧。',
    isPopular: true,
  },
  {
    shortName: 'zh-CN-YunxiaNeural',
    displayName: '雲夏 (Yunxia)',
    gender: 'male',
    locale: 'zh-CN',
    localeName: '中文（普通話）',
    category: 'mandarin',
    description: '清朗少年音、充滿朝氣與活力，適合少年熱血漫改、少年主角視角小說。',
    tags: ['少年清朗', '熱血活力', '學園冒險'],
    sampleText: '只要心中的火焰還沒熄滅，我就絕對不會在此停下腳步！',
  },
  {
    shortName: 'zh-TW-HsiaoChenNeural',
    displayName: '曉臻 (HsiaoChen)',
    gender: 'female',
    locale: 'zh-TW',
    localeName: '台灣國語（繁體）',
    category: 'taiwan',
    description: '正宗台灣口音女性聲音，聲調自然親切、甜美細膩，繁體中文小說絕佳搭檔。',
    tags: ['台灣正音', '自然甜美', '都會生活', '繁體首選'],
    sampleText: '台北的午後突然下起了雷陣雨，兩個人躲在騎樓下，誰也沒有先開口說話。',
    isPopular: true,
  },
  {
    shortName: 'zh-TW-YunJheNeural',
    displayName: '雲哲 (YunJhe)',
    gender: 'male',
    locale: 'zh-TW',
    localeName: '台灣國語（繁體）',
    category: 'taiwan',
    description: '沉穩溫柔的台灣男聲，語調平實自然，給人極佳的陪伴感與說書聆聽體驗。',
    tags: ['台灣男聲', '溫和自然', '陪伴說書', '生活散文'],
    sampleText: '時間在這裡彷彿慢了下來，看著遠方的海岸線，所有煩惱都在海風中消散了。',
    isPopular: true,
  },
  {
    shortName: 'zh-TW-HsiaoYuNeural',
    displayName: '曉雨 (HsiaoYu)',
    gender: 'female',
    locale: 'zh-TW',
    localeName: '台灣國語（繁體）',
    category: 'taiwan',
    description: '親切溫婉的台灣女聲，語調流暢輕柔，非常適合舒緩散文與心靈小說。',
    tags: ['台灣女聲', '溫柔親切', '舒緩心靈'],
    sampleText: '給自己一杯茶的時間，靜下心來聆聽內心深處那微弱卻堅定的聲音。',
  },
  {
    shortName: 'zh-HK-WanLungNeural',
    displayName: '雲龍 (WanLung)',
    gender: 'male',
    locale: 'zh-HK',
    localeName: '香港粵語（廣東話）',
    category: 'cantonese',
    description: '地道香港粵語男聲，沉著有力，極具經典港風、警匪江湖與江湖武俠風采。',
    tags: ['香港粵語', '港風江湖', '經典港劇', '硬派男聲'],
    sampleText: '無論外面的風浪有幾大，只要兄弟齊心，就冇咩關口係過唔到嘅。',
    isPopular: true,
  },
  {
    shortName: 'zh-HK-HiuMaanNeural',
    displayName: '曉曼 (HiuMaan)',
    gender: 'female',
    locale: 'zh-HK',
    localeName: '香港粵語（廣東話）',
    category: 'cantonese',
    description: '標準香港粵語女聲，知性典雅、語調親和，都會流行與廣東話廣播小說首選。',
    tags: ['香港粵語', '知性典雅', '廣播小說'],
    sampleText: '維多利亞港嘅夜景依然咁迷人，霓虹燈下寫滿咗無數個都市人嘅奮鬥故事。',
    isPopular: true,
  },
  {
    shortName: 'zh-HK-HiuGaaiNeural',
    displayName: '曉佳 (HiuGaai)',
    gender: 'female',
    locale: 'zh-HK',
    localeName: '香港粵語（廣東話）',
    category: 'cantonese',
    description: '活潑流暢的廣州話/香港粵語女聲，語氣生動豐富、生活感十足。',
    tags: ['香港粵語', '青春生動', '休閒生活'],
    sampleText: '今日天氣咁好，不如我哋一齊出去行下街、飲杯港式凍奶茶啦！',
  },
  {
    shortName: 'zh-CN-liaoning-XiaobeiNeural',
    displayName: '曉北 (Xiaobei)',
    gender: 'female',
    locale: 'zh-CN-liaoning',
    localeName: '東北官話（遼寧）',
    category: 'regional',
    description: '濃厚東北風味特色女聲，風趣幽默接地氣，適合鄉土喜劇、民間傳奇故事。',
    tags: ['地方方言', '東北話', '幽默風趣', '特色口音'],
    sampleText: '哎呀媽呀，你可算來了！趕緊上炕熱乎熱乎，整兩口酸菜白肉燉粉條！',
  },
  {
    shortName: 'zh-CN-shaanxi-XiaoniNeural',
    displayName: '曉妮 (Xiaoni)',
    gender: 'female',
    locale: 'zh-CN-shaanxi',
    localeName: '中原官話（陝西）',
    category: 'regional',
    description: '中原陝西方言女聲，質樸豪爽，極具黃土地民間歷史與西北風情。',
    tags: ['地方方言', '陝西秦腔', '質樸豪爽', '西北風情'],
    sampleText: '八百里秦川塵土飛揚，三千萬老陝齊吼秦腔。吃上一碗熱氣騰騰的油潑辣子麵！',
  },
];

export const POPULAR_GLOBAL_VOICES: VoiceOption[] = [
  {
    shortName: 'en-US-GuyNeural',
    displayName: 'Guy (US English)',
    gender: 'male',
    locale: 'en-US',
    localeName: 'English (United States)',
    category: 'english',
    description: 'Natural, deep American male narrator voice for audiobooks and storytelling.',
    tags: ['English US', 'Storytelling', 'Deep Voice'],
    sampleText: 'The ancient gates swung open slowly, revealing the lost city hidden in the mist.',
    isPopular: true,
  },
  {
    shortName: 'en-US-JennyNeural',
    displayName: 'Jenny (US English)',
    gender: 'female',
    locale: 'en-US',
    localeName: 'English (United States)',
    category: 'english',
    description: 'Warm, clear, and highly articulate American female narrator.',
    tags: ['English US', 'Warm & Clear', 'Audiobook'],
    sampleText: 'She stepped into the sunlit garden, feeling a sense of peace she had not known for years.',
    isPopular: true,
  },
  {
    shortName: 'en-GB-RyanNeural',
    displayName: 'Ryan (UK English)',
    gender: 'male',
    locale: 'en-GB',
    localeName: 'English (United Kingdom)',
    category: 'english',
    description: 'Classic British gentleman voice, sophisticated and resonant.',
    tags: ['English UK', 'British Accent', 'Sophisticated'],
    sampleText: 'It was a cold and foggy evening along the Thames as the bells of Westminster chimed.',
  },
  {
    shortName: 'en-GB-SoniaNeural',
    displayName: 'Sonia (UK English)',
    gender: 'female',
    locale: 'en-GB',
    localeName: 'English (United Kingdom)',
    category: 'english',
    description: 'Elegant British female voice, excellent for fantasy and period literature.',
    tags: ['English UK', 'Elegant', 'Period Literature'],
    sampleText: 'The old manor stood atop the cliff, guarding secrets that had lasted generations.',
  },
  {
    shortName: 'ja-JP-NanamiNeural',
    displayName: '七海 (Nanami - Japanese)',
    gender: 'female',
    locale: 'ja-JP',
    localeName: '日本語 (Japanese)',
    category: 'japanese',
    description: '優美で自然な日本語女性ナレーション。ライトノベルや小説の朗読に最適。',
    tags: ['日本語', '女性声', 'ライトノベル'],
    sampleText: '桜の花びらが風に舞い散る春の朝、すべての物語がここから始まった。',
  },
  {
    shortName: 'ja-JP-KeitaNeural',
    displayName: '圭太 (Keita - Japanese)',
    gender: 'male',
    locale: 'ja-JP',
    localeName: '日本語 (Japanese)',
    category: 'japanese',
    description: '落ち着いた心地よい日本語男性ボイス。冒険譚や朗読に。',
    tags: ['日本語', '男性声', '落ち着いた声'],
    sampleText: '遠くの空を見上げながら、彼は静かに刀を握り直した。',
  },
  {
    shortName: 'ko-KR-SunHiNeural',
    displayName: '선희 (SunHi - Korean)',
    gender: 'female',
    locale: 'ko-KR',
    localeName: '한국어 (Korean)',
    category: 'korean',
    description: '자연스럽고 따뜻한 한국어 여성 보이스. 소설과 에세이 낭독에 적합.',
    tags: ['한국어', '여성 목소리', '웹소설'],
    sampleText: '바람이 불어오는 창가에 서서, 지나간 계절의 기억을 떠올렸다.',
  },
  {
    shortName: 'ko-KR-InJoonNeural',
    displayName: '인준 (InJoon - Korean)',
    gender: 'male',
    locale: 'ko-KR',
    localeName: '한국어 (Korean)',
    category: 'korean',
    description: '차분하고 신뢰감 있는 한국어 남성 목소리.',
    tags: ['한국어', '남성 목소리', '차분함'],
    sampleText: '어둠이 내려앉은 도시의 불빛 사이로 새로운 여정이 시작되었다.',
  },
];

export const ALL_BUILTIN_VOICES: VoiceOption[] = [
  ...POPULAR_CHINESE_VOICES,
  ...POPULAR_GLOBAL_VOICES,
];

export function buildMergedVoiceList(serverVoices: any[] = []): VoiceOption[] {
  const map = new Map<string, VoiceOption>();

  // 1. Curated built-in voices
  for (const v of ALL_BUILTIN_VOICES) {
    map.set(v.shortName, v);
  }

  // 2. Full 300+ Edge Neural voices from server
  if (Array.isArray(serverVoices) && serverVoices.length > 0) {
    for (const sv of serverVoices) {
      if (!sv || !sv.shortName) continue;
      if (!map.has(sv.shortName)) {
        let cat: VoiceCategory = 'other';
        const loc = (sv.locale || '').toLowerCase();
        if (loc.startsWith('zh-cn')) cat = 'mandarin';
        else if (loc.startsWith('zh-tw')) cat = 'taiwan';
        else if (loc.startsWith('zh-hk')) cat = 'cantonese';
        else if (loc.startsWith('en')) cat = 'english';
        else if (loc.startsWith('ja')) cat = 'japanese';
        else if (loc.startsWith('ko')) cat = 'korean';

        const rawFriendly = sv.friendlyName || sv.name || sv.shortName;
        const cleanName = rawFriendly
          .replace(/^Microsoft\s+/, '')
          .replace(/\s+Online\s+\(Natural\)/, '')
          .trim();

        map.set(sv.shortName, {
          shortName: sv.shortName,
          displayName: cleanName,
          gender: sv.gender === 'female' ? 'female' : 'male',
          locale: sv.locale || 'unknown',
          localeName: sv.localeName || sv.locale || '多國語言',
          category: cat,
          description: `${sv.localeName || sv.locale} · ${sv.gender === 'female' ? '女性' : '男性'}自然音色`,
          tags: [sv.locale || 'Neural', sv.gender === 'female' ? '女聲' : '男聲'],
          sampleText: (sv.locale || '').startsWith('zh')
            ? '天行健，君子以自強不息；地勢坤，君子以厚德載物。'
            : (sv.locale || '').startsWith('ja')
            ? '桜の花びらが舞い散る美しい季節がやってきました。'
            : (sv.locale || '').startsWith('ko')
            ? '안녕하세요, 반갑습니다. 오늘 하루도 좋은 시간 보내세요.'
            : 'The quick brown fox jumps over the lazy dog. A wonderful journey begins.',
        });
      }
    }
  }

  return Array.from(map.values());
}

export function findVoiceOption(shortName: string): VoiceOption | undefined {
  return ALL_BUILTIN_VOICES.find((v) => v.shortName === shortName);
}
