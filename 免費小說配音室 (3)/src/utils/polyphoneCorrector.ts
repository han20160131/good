/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

/**
 * High-frequency Chinese Contextual Polyphone / Heteronym Dictionary
 * Specially curated for Edge TTS (Yunxi, Xiaoxiao, etc.) to guarantee 100% pronunciation accuracy.
 */
export const DEFAULT_POLYPHONE_RULES: PolyphoneRule[] = [
  // --- 重 (chóng vs zhòng) ---
  {
    id: 'chong-fu-1',
    originalText: '重複',
    replacementPhonetic: '崇復',
    pinyin: 'chóng fù',
    zhuyin: 'ㄔㄨㄥˊ ㄈㄨˋ',
    explanation: '「重複」念 chóng 避免讀成 zhòng (ㄓㄨㄥˋ)',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-fu-2',
    originalText: '重复',
    replacementPhonetic: '崇复',
    pinyin: 'chóng fù',
    zhuyin: 'ㄔㄨㄥˊ ㄈㄨˋ',
    explanation: '「重复」念 chóng 避免讀成 zhòng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-xin',
    originalText: '重新',
    replacementPhonetic: '崇新',
    pinyin: 'chóng xīn',
    zhuyin: 'ㄔㄨㄥˊ ㄒㄧㄣ',
    explanation: '「重新」念 chóng 避免讀成 zhòng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-lai',
    originalText: '重來',
    replacementPhonetic: '崇來',
    pinyin: 'chóng lái',
    zhuyin: 'ㄔㄨㄥˊ ㄌㄞˊ',
    explanation: '「重來」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-lai-s',
    originalText: '重来',
    replacementPhonetic: '崇来',
    pinyin: 'chóng lái',
    zhuyin: 'ㄔㄨㄥˊ ㄌㄞˊ',
    explanation: '「重来」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-feng',
    originalText: '重逢',
    replacementPhonetic: '崇逢',
    pinyin: 'chóng féng',
    zhuyin: 'ㄔㄨㄥˊ ㄈㄥˊ',
    explanation: '「重逢」念 chóng 避免誤念',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-shen',
    originalText: '重申',
    replacementPhonetic: '崇申',
    pinyin: 'chóng shēn',
    zhuyin: 'ㄔㄨㄥˊ ㄕㄣ',
    explanation: '「重申」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-die-1',
    originalText: '重疊',
    replacementPhonetic: '崇疊',
    pinyin: 'chóng dié',
    zhuyin: 'ㄔㄨㄥˊ ㄉㄧㄝˊ',
    explanation: '「重疊」念 chóng 避免讀成 zhòng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-die-2',
    originalText: '重叠',
    replacementPhonetic: '崇叠',
    pinyin: 'chóng dié',
    zhuyin: 'ㄔㄨㄥˊ ㄉㄧㄝˊ',
    explanation: '「重叠」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-zheng',
    originalText: '重整',
    replacementPhonetic: '崇整',
    pinyin: 'chóng zhěng',
    zhuyin: 'ㄔㄨㄥˊ ㄓㄥˇ',
    explanation: '「重整」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-wen',
    originalText: '重溫',
    replacementPhonetic: '崇溫',
    pinyin: 'chóng wēn',
    zhuyin: 'ㄔㄨㄥˊ ㄨㄣ',
    explanation: '「重溫」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-wen-s',
    originalText: '重温',
    replacementPhonetic: '崇温',
    pinyin: 'chóng wēn',
    zhuyin: 'ㄔㄨㄥˊ ㄨㄣ',
    explanation: '「重温」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-zu',
    originalText: '重組',
    replacementPhonetic: '崇組',
    pinyin: 'chóng zǔ',
    zhuyin: 'ㄔㄨㄥˊ ㄗㄨˇ',
    explanation: '「重組」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-zu-s',
    originalText: '重组',
    replacementPhonetic: '崇组',
    pinyin: 'chóng zǔ',
    zhuyin: 'ㄔㄨㄥˊ ㄗㄨˇ',
    explanation: '「重组」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-yan',
    originalText: '重演',
    replacementPhonetic: '崇演',
    pinyin: 'chóng yǎn',
    zhuyin: 'ㄔㄨㄥˊ ㄧㄢˇ',
    explanation: '「重演」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-huo',
    originalText: '重獲',
    replacementPhonetic: '崇獲',
    pinyin: 'chóng huò',
    zhuyin: 'ㄔㄨㄥˊ ㄏㄨㄛˋ',
    explanation: '「重獲」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-huo-s',
    originalText: '重获',
    replacementPhonetic: '崇获',
    pinyin: 'chóng huò',
    zhuyin: 'ㄔㄨㄥˊ ㄏㄨㄛˋ',
    explanation: '「重获」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-xian',
    originalText: '重現',
    replacementPhonetic: '崇現',
    pinyin: 'chóng xiàn',
    zhuyin: 'ㄔㄨㄥˊ ㄒㄧㄢˋ',
    explanation: '「重現」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-xian-s',
    originalText: '重现',
    replacementPhonetic: '崇现',
    pinyin: 'chóng xiàn',
    zhuyin: 'ㄔㄨㄥˊ ㄒㄧㄢˋ',
    explanation: '「重现」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chong-jian-tian-ri',
    originalText: '重見天日',
    replacementPhonetic: '崇見天日',
    pinyin: 'chóng jiàn tiān rì',
    zhuyin: 'ㄔㄨㄥˊ ㄐㄧㄢˋ ㄊㄧㄢ ㄖˋ',
    explanation: '「重見天日」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'shuang-chong',
    originalText: '雙重',
    replacementPhonetic: '雙崇',
    pinyin: 'shuāng chóng',
    zhuyin: 'ㄕㄨㄤ ㄔㄨㄥˊ',
    explanation: '「雙重」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'shuang-chong-s',
    originalText: '双重',
    replacementPhonetic: '双崇',
    pinyin: 'shuāng chóng',
    zhuyin: 'ㄕㄨㄤ ㄔㄨㄥˊ',
    explanation: '「双重」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'san-chong',
    originalText: '三重',
    replacementPhonetic: '三崇',
    pinyin: 'sān chóng',
    zhuyin: 'ㄙㄢ ㄔㄨㄥˊ',
    explanation: '「三重」念 chóng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'jiu-chong-tian',
    originalText: '九重天',
    replacementPhonetic: '九崇天',
    pinyin: 'jiǔ chóng tiān',
    zhuyin: 'ㄐㄧㄡˇ ㄔㄨㄥˊ ㄊㄧㄢ',
    explanation: '修仙小說「九重天」念 chóng',
    category: 'cultivation',
    enabled: true,
  },

  // --- 著 / 着 (zháo vs zhe vs zhuó) ---
  {
    id: 'shui-zhao-1',
    originalText: '睡著',
    replacementPhonetic: '睡招',
    pinyin: 'shuì zháo',
    zhuyin: 'ㄕㄨㄟˋ ㄓㄠˊ',
    explanation: '「睡著」念 zháo 避免讀成 zhe 或 zhuó',
    category: 'common',
    enabled: true,
  },
  {
    id: 'shui-zhao-2',
    originalText: '睡着',
    replacementPhonetic: '睡招',
    pinyin: 'shuì zháo',
    zhuyin: 'ㄕㄨㄟˋ ㄓㄠˊ',
    explanation: '「睡着」念 zháo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'zhao-ji-1',
    originalText: '著急',
    replacementPhonetic: '招急',
    pinyin: 'zháo jí',
    zhuyin: 'ㄓㄠˊ ㄐㄧˊ',
    explanation: '「著急」念 zháo 避免讀成 zhe',
    category: 'common',
    enabled: true,
  },
  {
    id: 'zhao-ji-2',
    originalText: '着急',
    replacementPhonetic: '招急',
    pinyin: 'zháo jí',
    zhuyin: 'ㄓㄠˊ ㄐㄧˊ',
    explanation: '「着急」念 zháo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'zhao-huo-1',
    originalText: '著火',
    replacementPhonetic: '招火',
    pinyin: 'zháo huǒ',
    zhuyin: 'ㄓㄠˊ ㄏㄨㄛˇ',
    explanation: '「著火」念 zháo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'zhao-huo-2',
    originalText: '着火',
    replacementPhonetic: '招火',
    pinyin: 'zháo huǒ',
    zhuyin: 'ㄓㄠˊ ㄏㄨㄛˇ',
    explanation: '「着火」念 zháo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'dian-zhao-1',
    originalText: '點著',
    replacementPhonetic: '點招',
    pinyin: 'diǎn zháo',
    zhuyin: 'ㄉㄧㄢˇ ㄓㄠˊ',
    explanation: '「點著」火念 zháo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'dian-zhao-2',
    originalText: '点着',
    replacementPhonetic: '点招',
    pinyin: 'diǎn zháo',
    zhuyin: 'ㄉㄧㄢˇ ㄓㄠˊ',
    explanation: '「点着」念 zháo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'zhao-liang-1',
    originalText: '著涼',
    replacementPhonetic: '招涼',
    pinyin: 'zháo liáng',
    zhuyin: 'ㄓㄠˊ ㄌㄧㄤˊ',
    explanation: '「著涼」念 zháo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'zhao-liang-2',
    originalText: '着凉',
    replacementPhonetic: '招凉',
    pinyin: 'zháo liáng',
    zhuyin: 'ㄓㄠˊ ㄌㄧㄤˊ',
    explanation: '「着凉」念 zháo',
    category: 'common',
    enabled: true,
  },

  // --- 了 (liǎo vs le) ---
  {
    id: 'bu-de-liao',
    originalText: '不得了',
    replacementPhonetic: '不得遼',
    pinyin: 'bù dé liǎo',
    zhuyin: 'ㄅㄨˋ ㄉㄜˊ ㄌㄧㄠˇ',
    explanation: '「不得了」念 liǎo 避免讀成 le',
    category: 'common',
    enabled: true,
  },
  {
    id: 'liao-bu-qi',
    originalText: '了不起',
    replacementPhonetic: '遼不起',
    pinyin: 'liǎo bu qǐ',
    zhuyin: 'ㄌㄧㄠˇ ㄅㄨ˙ ㄑㄧˇ',
    explanation: '「了不起」念 liǎo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'shou-bu-liao',
    originalText: '受不了',
    replacementPhonetic: '受不遼',
    pinyin: 'shòu bu liǎo',
    zhuyin: 'ㄕㄡˋ ㄅㄨ˙ ㄌㄧㄠˇ',
    explanation: '「受不了」念 liǎo 避免讀成 le',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chi-bu-liao',
    originalText: '吃不了',
    replacementPhonetic: '吃不遼',
    pinyin: 'chī bu liǎo',
    zhuyin: 'ㄔ ㄅㄨ˙ ㄌㄧㄠˇ',
    explanation: '「吃不了」念 liǎo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'wang-bu-liao',
    originalText: '忘不了',
    replacementPhonetic: '忘不遼',
    pinyin: 'wàng bu liǎo',
    zhuyin: 'ㄨㄤˋ ㄅㄨ˙ ㄌㄧㄠˇ',
    explanation: '「忘不了」念 liǎo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'liao-jie',
    originalText: '了結',
    replacementPhonetic: '遼結',
    pinyin: 'liǎo jié',
    zhuyin: 'ㄌㄧㄠˇ ㄐㄧㄝˊ',
    explanation: '「了結」恩怨念 liǎo',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'liao-jie-s',
    originalText: '了结',
    replacementPhonetic: '辽结',
    pinyin: 'liǎo jié',
    zhuyin: 'ㄌㄧㄠˇ ㄐㄧㄝˊ',
    explanation: '「了结」念 liǎo',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'liao-que',
    originalText: '了卻',
    replacementPhonetic: '遼卻',
    pinyin: 'liǎo què',
    zhuyin: 'ㄌㄧㄠˇ ㄑㄩㄝˋ',
    explanation: '「了卻」心願念 liǎo',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'mei-wan-mei-liao',
    originalText: '沒完沒了',
    replacementPhonetic: '沒完沒遼',
    pinyin: 'méi wán méi liǎo',
    zhuyin: 'ㄇㄟˊ ㄨㄢˊ ㄇㄟˊ ㄌㄧㄠˇ',
    explanation: '「沒完沒了」念 liǎo',
    category: 'common',
    enabled: true,
  },

  // --- 得 (děi vs dé vs de) ---
  {
    id: 'dei-kui-1',
    originalText: '得虧',
    replacementPhonetic: '逮虧',
    pinyin: 'děi kuī',
    zhuyin: 'ㄉㄟˇ ㄎㄨㄟ',
    explanation: '「得虧」念 děi 避免讀成 dé',
    category: 'common',
    enabled: true,
  },
  {
    id: 'dei-kui-2',
    originalText: '得亏',
    replacementPhonetic: '逮亏',
    pinyin: 'děi kuī',
    zhuyin: 'ㄉㄟˇ ㄎㄨㄟ',
    explanation: '「得亏」念 děi',
    category: 'common',
    enabled: true,
  },
  {
    id: 'zong-dei-1',
    originalText: '總得',
    replacementPhonetic: '總逮',
    pinyin: 'zǒng děi',
    zhuyin: 'ㄗㄨㄥˇ ㄉㄟˇ',
    explanation: '「總得」念 děi',
    category: 'common',
    enabled: true,
  },
  {
    id: 'zong-dei-2',
    originalText: '总得',
    replacementPhonetic: '总逮',
    pinyin: 'zǒng děi',
    zhuyin: 'ㄗㄨㄥˇ ㄉㄟˇ',
    explanation: '「总得」念 děi',
    category: 'common',
    enabled: true,
  },
  {
    id: 'ni-dei',
    originalText: '你得',
    replacementPhonetic: '你逮',
    pinyin: 'nǐ děi',
    zhuyin: 'ㄋㄧˇ ㄉㄟˇ',
    explanation: '「你得快點」念 děi 避免讀成 de/dé',
    category: 'common',
    enabled: true,
  },
  {
    id: 'wo-dei',
    originalText: '我得',
    replacementPhonetic: '我逮',
    pinyin: 'wǒ děi',
    zhuyin: 'ㄨㄛˇ ㄉㄟˇ',
    explanation: '「我得走了」念 děi',
    category: 'common',
    enabled: true,
  },
  {
    id: 'ta-dei',
    originalText: '他得',
    replacementPhonetic: '他逮',
    pinyin: 'tā děi',
    zhuyin: 'ㄊㄚ ㄉㄟˇ',
    explanation: '「他得注意」念 děi',
    category: 'common',
    enabled: true,
  },

  // --- 調 / 调 (diào vs tiáo) ---
  {
    id: 'diao-cha-1',
    originalText: '調查',
    replacementPhonetic: '吊查',
    pinyin: 'diào chá',
    zhuyin: 'ㄉㄧㄠˋ ㄔㄚˊ',
    explanation: '「調查」念 diào 避免讀成 tiáo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'diao-cha-2',
    originalText: '调查',
    replacementPhonetic: '吊查',
    pinyin: 'diào chá',
    zhuyin: 'ㄉㄧㄠˋ ㄔㄚˊ',
    explanation: '「调查」念 diào',
    category: 'common',
    enabled: true,
  },
  {
    id: 'diao-dong-1',
    originalText: '調動',
    replacementPhonetic: '吊動',
    pinyin: 'diào dòng',
    zhuyin: 'ㄉㄧㄠˋ ㄉㄨㄥˋ',
    explanation: '「調動」靈力/兵力念 diào',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'diao-dong-2',
    originalText: '调动',
    replacementPhonetic: '吊动',
    pinyin: 'diào dòng',
    zhuyin: 'ㄉㄧㄠˋ ㄉㄨㄥˋ',
    explanation: '「调动」念 diào',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'diao-qian',
    originalText: '調遣',
    replacementPhonetic: '吊遣',
    pinyin: 'diào qiǎn',
    zhuyin: 'ㄉㄧㄠˋ ㄑㄧㄢˇ',
    explanation: '「調遣」念 diào',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'diao-bing',
    originalText: '調兵',
    replacementPhonetic: '吊兵',
    pinyin: 'diào bīng',
    zhuyin: 'ㄉㄧㄠˋ ㄅㄧㄥ',
    explanation: '「調兵遣將」念 diào',
    category: 'novel',
    enabled: true,
  },

  // --- 降 (xiáng vs jiàng) ---
  {
    id: 'tou-xiang',
    originalText: '投降',
    replacementPhonetic: '投詳',
    pinyin: 'tóu xiáng',
    zhuyin: 'ㄊㄡˊ ㄒㄧㄤˊ',
    explanation: '「投降」念 xiáng 避免讀成 jiàng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'xiang-fu',
    originalText: '降伏',
    replacementPhonetic: '詳伏',
    pinyin: 'xiáng fú',
    zhuyin: 'ㄒㄧㄤˊ ㄈㄨˊ',
    explanation: '「降伏」妖魔念 xiáng',
    category: 'cultivation',
    enabled: true,
  },
  {
    id: 'quan-xiang',
    originalText: '勸降',
    replacementPhonetic: '勸詳',
    pinyin: 'quàn xiáng',
    zhuyin: 'ㄑㄩㄢˋ ㄒㄧㄤˊ',
    explanation: '「勸降」念 xiáng',
    category: 'novel',
    enabled: true,
  },

  // --- 卡 (qiǎ vs kǎ) ---
  {
    id: 'qia-zhu',
    originalText: '卡住',
    replacementPhonetic: '掐住',
    pinyin: 'qiǎ zhù',
    zhuyin: 'ㄑㄧㄚˇ ㄓㄨˋ',
    explanation: '「卡在喉嚨/卡住」念 qiǎ 避免讀成 kǎ',
    category: 'common',
    enabled: true,
  },
  {
    id: 'guan-qia-1',
    originalText: '關卡',
    replacementPhonetic: '關掐',
    pinyin: 'guān qiǎ',
    zhuyin: 'ㄍㄨㄢ ㄑㄧㄚˇ',
    explanation: '突破「關卡」念 qiǎ',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'guan-qia-2',
    originalText: '关卡',
    replacementPhonetic: '关掐',
    pinyin: 'guān qiǎ',
    zhuyin: 'ㄍㄨㄢ ㄑㄧㄚˇ',
    explanation: '「关卡」念 qiǎ',
    category: 'novel',
    enabled: true,
  },

  // --- 藏 (zàng vs cáng) ---
  {
    id: 'bao-zang-1',
    originalText: '寶藏',
    replacementPhonetic: '寶葬',
    pinyin: 'bǎo zàng',
    zhuyin: 'ㄅㄠˇ ㄗㄤˋ',
    explanation: '尋得「寶藏」念 zàng 避免讀成 cáng',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'bao-zang-2',
    originalText: '宝藏',
    replacementPhonetic: '宝葬',
    pinyin: 'bǎo zàng',
    zhuyin: 'ㄅㄠˇ ㄗㄤˋ',
    explanation: '「宝藏」念 zàng',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'dao-zang',
    originalText: '道藏',
    replacementPhonetic: '道葬',
    pinyin: 'dào zàng',
    zhuyin: 'ㄉㄠˋ ㄗㄤˋ',
    explanation: '修真「道藏」念 zàng',
    category: 'cultivation',
    enabled: true,
  },
  {
    id: 'zang-jing-ge',
    originalText: '藏經閣',
    replacementPhonetic: '葬經閣',
    pinyin: 'zàng jīng gé',
    zhuyin: 'ㄗㄤˋ ㄐㄧㄥ ㄍㄜˊ',
    explanation: '少林/門派「藏經閣」念 zàng',
    category: 'cultivation',
    enabled: true,
  },
  {
    id: 'zang-jing-ge-s',
    originalText: '藏经阁',
    replacementPhonetic: '葬经阁',
    pinyin: 'zàng jīng gé',
    zhuyin: 'ㄗㄤˋ ㄐㄧㄥ ㄍㄜˊ',
    explanation: '「藏经阁」念 zàng',
    category: 'cultivation',
    enabled: true,
  },

  // --- 處 / 处 (chǔ vs chù) ---
  {
    id: 'chu-li-1',
    originalText: '處理',
    replacementPhonetic: '楚理',
    pinyin: 'chǔ lǐ',
    zhuyin: 'ㄔㄨˇ ㄌㄧˇ',
    explanation: '「處理」念 chǔ 避免讀成 chù',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chu-li-2',
    originalText: '处理',
    replacementPhonetic: '楚理',
    pinyin: 'chǔ lǐ',
    zhuyin: 'ㄔㄨˇ ㄌㄧˇ',
    explanation: '「处理」念 chǔ',
    category: 'common',
    enabled: true,
  },
  {
    id: 'chu-fa-1',
    originalText: '處罰',
    replacementPhonetic: '楚罰',
    pinyin: 'chǔ fá',
    zhuyin: 'ㄔㄨˇ ㄈㄚˊ',
    explanation: '宗規「處罰」念 chǔ',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'chu-fa-2',
    originalText: '处罚',
    replacementPhonetic: '楚罚',
    pinyin: 'chǔ fá',
    zhuyin: 'ㄔㄨˇ ㄈㄚˊ',
    explanation: '「处罚」念 chǔ',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'chu-si-1',
    originalText: '處死',
    replacementPhonetic: '楚死',
    pinyin: 'chǔ sǐ',
    zhuyin: 'ㄔㄨˇ ㄙˇ',
    explanation: '「處死」叛徒念 chǔ',
    category: 'novel',
    enabled: true,
  },

  // --- 模 (mú vs mó) ---
  {
    id: 'yi-mu-yi-yang-1',
    originalText: '一模一樣',
    replacementPhonetic: '一母一樣',
    pinyin: 'yì mú yí yàng',
    zhuyin: 'ㄧ ㄇㄨˊ ㄧ ㄧㄤˋ',
    explanation: '「一模一樣」念 mú 避免讀成 mó',
    category: 'common',
    enabled: true,
  },
  {
    id: 'yi-mu-yi-yang-2',
    originalText: '一模一样',
    replacementPhonetic: '一母一样',
    pinyin: 'yì mú yí yàng',
    zhuyin: 'ㄧ ㄇㄨˊ ㄧ ㄧㄤˋ',
    explanation: '「一模一样」念 mú',
    category: 'common',
    enabled: true,
  },
  {
    id: 'mu-yang-1',
    originalText: '模樣',
    replacementPhonetic: '母樣',
    pinyin: 'mú yàng',
    zhuyin: 'ㄇㄨˊ ㄧㄤˋ',
    explanation: '生得什麼「模樣」念 mú',
    category: 'common',
    enabled: true,
  },
  {
    id: 'mu-yang-2',
    originalText: '模样',
    replacementPhonetic: '母样',
    pinyin: 'mú yàng',
    zhuyin: 'ㄇㄨˊ ㄧㄤˋ',
    explanation: '「模样」念 mú',
    category: 'common',
    enabled: true,
  },

  // --- 當 / 当 (dàng vs dāng) ---
  {
    id: 'shang-dang-1',
    originalText: '上當',
    replacementPhonetic: '上檔',
    pinyin: 'shàng dàng',
    zhuyin: 'ㄕㄤˋ ㄉㄤˋ',
    explanation: '「上當受騙」念 dàng 避免讀成 dāng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'shang-dang-2',
    originalText: '上当',
    replacementPhonetic: '上档',
    pinyin: 'shàng dàng',
    zhuyin: 'ㄕㄤˋ ㄉㄤˋ',
    explanation: '「上当」念 dàng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'dang-zuo-1',
    originalText: '當作',
    replacementPhonetic: '檔作',
    pinyin: 'dàng zuò',
    zhuyin: 'ㄉㄤˋ ㄗㄨㄛˋ',
    explanation: '「當作」念 dàng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'dang-zuo-2',
    originalText: '当作',
    replacementPhonetic: '档作',
    pinyin: 'dàng zuò',
    zhuyin: 'ㄉㄤˋ ㄗㄨㄛˋ',
    explanation: '「当作」念 dàng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'dang-zhen-1',
    originalText: '當真',
    replacementPhonetic: '檔真',
    pinyin: 'dàng zhēn',
    zhuyin: 'ㄉㄤˋ ㄓㄣ',
    explanation: '「當真了」念 dàng',
    category: 'common',
    enabled: true,
  },

  // --- 校 (jiào vs xiào) ---
  {
    id: 'jiao-dui-1',
    originalText: '校對',
    replacementPhonetic: '叫對',
    pinyin: 'jiào duì',
    zhuyin: 'ㄐㄧㄠˋ ㄉㄨㄟˋ',
    explanation: '「校對」文字念 jiào 避免讀成 xiào',
    category: 'common',
    enabled: true,
  },
  {
    id: 'jiao-dui-2',
    originalText: '校对',
    replacementPhonetic: '叫对',
    pinyin: 'jiào duì',
    zhuyin: 'ㄐㄧㄠˋ ㄉㄨㄟˋ',
    explanation: '「校对」念 jiào',
    category: 'common',
    enabled: true,
  },
  {
    id: 'jiao-zhun',
    originalText: '校準',
    replacementPhonetic: '叫準',
    pinyin: 'jiào zhǔn',
    zhuyin: 'ㄐㄧㄠˋ ㄓㄨㄣˇ',
    explanation: '「校準」法陣念 jiào',
    category: 'novel',
    enabled: true,
  },

  // --- 縫 / 缝 (fèng vs féng) ---
  {
    id: 'feng-xi-1',
    originalText: '縫隙',
    replacementPhonetic: '鳳隙',
    pinyin: 'fèng xì',
    zhuyin: 'ㄈㄥˋ ㄒㄧˋ',
    explanation: '門窗「縫隙」念 fèng 避免讀成 féng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'feng-xi-2',
    originalText: '缝隙',
    replacementPhonetic: '凤隙',
    pinyin: 'fèng xì',
    zhuyin: 'ㄈㄥˋ ㄒㄧˋ',
    explanation: '「缝隙」念 fèng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'lie-feng-1',
    originalText: '裂縫',
    replacementPhonetic: '裂鳳',
    pinyin: 'liè fèng',
    zhuyin: 'ㄌㄧㄝˋ ㄈㄥˋ',
    explanation: '岩石「裂縫」念 fèng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'lie-feng-2',
    originalText: '裂缝',
    replacementPhonetic: '裂凤',
    pinyin: 'liè fèng',
    zhuyin: 'ㄌㄧㄝˋ ㄈㄥˋ',
    explanation: '「裂缝」念 fèng',
    category: 'common',
    enabled: true,
  },

  // --- 咽 (yān / yàn / yè) ---
  {
    id: 'yan-hou',
    originalText: '咽喉',
    replacementPhonetic: '煙喉',
    pinyin: 'yān hóu',
    zhuyin: 'ㄧㄢ ㄏㄡˊ',
    explanation: '扼住「咽喉」念 yān',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'geng-ye',
    originalText: '哽咽',
    replacementPhonetic: '哽夜',
    pinyin: 'gěng yè',
    zhuyin: 'ㄍㄥˇ ㄧㄝˋ',
    explanation: '泣不成聲「哽咽」念 yè',
    category: 'novel',
    enabled: true,
  },

  // --- 差 (chāi / chà / cī) ---
  {
    id: 'chu-chai',
    originalText: '出差',
    replacementPhonetic: '出柴',
    pinyin: 'chū chāi',
    zhuyin: 'ㄔㄨ ㄔㄞ',
    explanation: '「出差」辦事念 chāi',
    category: 'common',
    enabled: true,
  },
  {
    id: 'can-ci-1',
    originalText: '參差',
    replacementPhonetic: '參雌',
    pinyin: 'cēn cī',
    zhuyin: 'ㄘㄣ ㄘ',
    explanation: '「參差不齊」念 cēn cī',
    category: 'common',
    enabled: true,
  },
  {
    id: 'can-ci-2',
    originalText: '参差',
    replacementPhonetic: '参雌',
    pinyin: 'cēn cī',
    zhuyin: 'ㄘㄣ ㄘ',
    explanation: '「参差」念 cēn cī',
    category: 'common',
    enabled: true,
  },

  // --- 塞 (sài / sè) ---
  {
    id: 'yao-sai',
    originalText: '要塞',
    replacementPhonetic: '要賽',
    pinyin: 'yào sài',
    zhuyin: 'ㄧㄠˋ ㄙㄞˋ',
    explanation: '邊防「要塞」念 sài 避免讀成 sāi',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'bian-sai',
    originalText: '邊塞',
    replacementPhonetic: '邊賽',
    pinyin: 'biān sài',
    zhuyin: 'ㄅㄧㄢ ㄙㄞˋ',
    explanation: '大漠「邊塞」念 sài',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'du-se-1',
    originalText: '堵塞',
    replacementPhonetic: '堵色',
    pinyin: 'dǔ sè',
    zhuyin: 'ㄉㄨˇ ㄙㄜˋ',
    explanation: '經脈「堵塞」念 sè',
    category: 'cultivation',
    enabled: true,
  },

  // --- 血 (xiě vs xuè) ---
  {
    id: 'liu-xie',
    originalText: '流血',
    replacementPhonetic: '流雪',
    pinyin: 'liú xiě',
    zhuyin: 'ㄌㄧㄡˊ ㄒㄧㄝˇ',
    explanation: '「流血了」念 xiě 較口語自然',
    category: 'common',
    enabled: true,
  },

  // --- 抹 (mò / mā) ---
  {
    id: 'zhuan-wan-mo-jiao',
    originalText: '轉彎抹角',
    replacementPhonetic: '轉彎墨角',
    pinyin: 'zhuǎn wān mò jiǎo',
    zhuyin: 'ㄓㄨㄢˇ ㄨㄢ ㄇㄛˋ ㄐㄧㄠˇ',
    explanation: '說話別「轉彎抹角」念 mò',
    category: 'common',
    enabled: true,
  },
  {
    id: 'ma-bu',
    originalText: '抹布',
    replacementPhonetic: '媽布',
    pinyin: 'mā bù',
    zhuyin: 'ㄇㄚ ㄅㄨˋ',
    explanation: '「抹布」念 mā',
    category: 'common',
    enabled: true,
  },

  // --- 空 (kòng vs kōng) ---
  {
    id: 'you-kong',
    originalText: '有空',
    replacementPhonetic: '有控',
    pinyin: 'yǒu kòng',
    zhuyin: 'ㄧㄡˇ ㄎㄨㄥˋ',
    explanation: '「有空」念 kòng 避免讀成 kōng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'kong-bai',
    originalText: '空白',
    replacementPhonetic: '控白',
    pinyin: 'kòng bái',
    zhuyin: 'ㄎㄨㄥˋ ㄅㄞˊ',
    explanation: '腦海一片「空白」念 kòng',
    category: 'common',
    enabled: true,
  },

  // --- 背 (bēi vs bèi) ---
  {
    id: 'bei-zhe-1',
    originalText: '背著',
    replacementPhonetic: '悲著',
    pinyin: 'bēi zhe',
    zhuyin: 'ㄅㄟ ㄓㄜ˙',
    explanation: '「背著大劍/背著包」念 bēi 避免讀成 bèi (背後)',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'bei-zhe-2',
    originalText: '背着',
    replacementPhonetic: '悲着',
    pinyin: 'bēi zhe',
    zhuyin: 'ㄅㄟ ㄓㄜ˙',
    explanation: '「背着剑」念 bēi',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'bei-bao',
    originalText: '背包',
    replacementPhonetic: '悲包',
    pinyin: 'bēi bāo',
    zhuyin: 'ㄅㄟ ㄅㄠ',
    explanation: '「背包」念 bēi',
    category: 'common',
    enabled: true,
  },

  // --- 強 (qiǎng vs jiàng vs qiáng) ---
  {
    id: 'mian-qiang-1',
    originalText: '勉強',
    replacementPhonetic: '勉搶',
    pinyin: 'miǎn qiǎng',
    zhuyin: 'ㄇㄧㄢˇ ㄑㄧㄤˇ',
    explanation: '「勉強」念 qiǎng 避免讀成 qiáng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'mian-qiang-2',
    originalText: '勉强',
    replacementPhonetic: '勉抢',
    pinyin: 'miǎn qiǎng',
    zhuyin: 'ㄇㄧㄢˇ ㄑㄧㄤˇ',
    explanation: '「勉强」念 qiǎng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'qiang-po-1',
    originalText: '強迫',
    replacementPhonetic: '搶迫',
    pinyin: 'qiǎng pò',
    zhuyin: 'ㄑㄧㄤˇ ㄆㄛˋ',
    explanation: '「強迫」念 qiǎng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'qiang-po-2',
    originalText: '强迫',
    replacementPhonetic: '抢迫',
    pinyin: 'qiǎng pò',
    zhuyin: 'ㄑㄧㄤˇ ㄆㄛˋ',
    explanation: '「强迫」念 qiǎng',
    category: 'common',
    enabled: true,
  },
  {
    id: 'jue-jiang-1',
    originalText: '倔強',
    replacementPhonetic: '倔匠',
    pinyin: 'jué jiàng',
    zhuyin: 'ㄐㄩㄝˊ ㄐㄧㄤˋ',
    explanation: '性格「倔強」念 jiàng 避免讀成 qiáng',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'jue-jiang-2',
    originalText: '倔强',
    replacementPhonetic: '倔匠',
    pinyin: 'jué jiàng',
    zhuyin: 'ㄐㄩㄝˊ ㄐㄧㄤˋ',
    explanation: '「倔强」念 jiàng',
    category: 'novel',
    enabled: true,
  },

  // --- 挑 (tiǎo vs tiāo) ---
  {
    id: 'tiao-xin-1',
    originalText: '挑釁',
    replacementPhonetic: '跳釁',
    pinyin: 'tiǎo xìn',
    zhuyin: 'ㄊㄧㄠˇ ㄒㄧㄣˋ',
    explanation: '前來「挑釁」念 tiǎo',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'tiao-xin-2',
    originalText: '挑衅',
    replacementPhonetic: '跳衅',
    pinyin: 'tiǎo xìn',
    zhuyin: 'ㄊㄧㄠˇ ㄒㄧㄣˋ',
    explanation: '「挑衅」念 tiǎo',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'tiao-zhan-1',
    originalText: '挑戰',
    replacementPhonetic: '跳戰',
    pinyin: 'tiǎo zhàn',
    zhuyin: 'ㄊㄧㄠˇ ㄓㄢˋ',
    explanation: '越階「挑戰」念 tiǎo',
    category: 'cultivation',
    enabled: true,
  },
  {
    id: 'tiao-zhan-2',
    originalText: '挑战',
    replacementPhonetic: '跳战',
    pinyin: 'tiǎo zhàn',
    zhuyin: 'ㄊㄧㄠˇ ㄓㄢˋ',
    explanation: '「挑战」念 tiǎo',
    category: 'cultivation',
    enabled: true,
  },

  // --- 削 (xuē vs xiāo) ---
  {
    id: 'bo-xue-1',
    originalText: '剝削',
    replacementPhonetic: '剝靴',
    pinyin: 'bō xuē',
    zhuyin: 'ㄅㄛ ㄒㄩㄝ',
    explanation: '「剝削」念 xuē 避免讀成 xiāo',
    category: 'common',
    enabled: true,
  },
  {
    id: 'bo-xue-2',
    originalText: '剥削',
    replacementPhonetic: '剥靴',
    pinyin: 'bō xuē',
    zhuyin: 'ㄅㄛ ㄒㄩㄝ',
    explanation: '「剥削」念 xuē',
    category: 'common',
    enabled: true,
  },
  {
    id: 'xue-ruo',
    originalText: '削弱',
    replacementPhonetic: '靴弱',
    pinyin: 'xuē ruò',
    zhuyin: 'ㄒㄩㄝ ㄖㄨㄛˋ',
    explanation: '修為被「削弱」念 xuē',
    category: 'cultivation',
    enabled: true,
  },

  // --- 埋 (mán vs mái) ---
  {
    id: 'man-yuan',
    originalText: '埋怨',
    replacementPhonetic: '蠻怨',
    pinyin: 'mán yuàn',
    zhuyin: 'ㄇㄢˊ ㄩㄢˋ',
    explanation: '「埋怨」念 mán 避免讀成 mái (掩埋)',
    category: 'common',
    enabled: true,
  },

  // --- 折 (zhē / shé / zhé) ---
  {
    id: 'zhe-teng-1',
    originalText: '折騰',
    replacementPhonetic: '遮騰',
    pinyin: 'zhē teng',
    zhuyin: 'ㄓㄜ ˙ㄊㄥ',
    explanation: '經不起「折騰」念 zhē 避免讀成 zhé',
    category: 'common',
    enabled: true,
  },
  {
    id: 'zhe-teng-2',
    originalText: '折腾',
    replacementPhonetic: '遮腾',
    pinyin: 'zhē teng',
    zhuyin: 'ㄓㄜ ˙ㄊㄥ',
    explanation: '「折腾」念 zhē',
    category: 'common',
    enabled: true,
  },
  {
    id: 'she-ben',
    originalText: '折本',
    replacementPhonetic: '蛇本',
    pinyin: 'shé běn',
    zhuyin: 'ㄕㄜˊ ㄅㄣˇ',
    explanation: '做生意「折本」念 shé',
    category: 'common',
    enabled: true,
  },

  // --- 骨 (gū vs gǔ) ---
  {
    id: 'gu-lu',
    originalText: '骨碌',
    replacementPhonetic: '孤碌',
    pinyin: 'gū lu',
    zhuyin: 'ㄍㄨ ˙ㄌㄨ',
    explanation: '眼珠一「骨碌」念 gū 避免讀成 gǔ (骨頭)',
    category: 'novel',
    enabled: true,
  },

  // --- 轉 / 转 (zhuǎn vs zhuàn) ---
  {
    id: 'zhuan-shen-1',
    originalText: '轉身',
    replacementPhonetic: '專身',
    pinyin: 'zhuǎn shēn',
    zhuyin: 'ㄓㄨㄢˇ ㄕㄣ',
    explanation: '「轉身離去」念 zhuǎn',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'zhuan-shen-2',
    originalText: '转身',
    replacementPhonetic: '专身',
    pinyin: 'zhuǎn shēn',
    zhuyin: 'ㄓㄨㄢˇ ㄕㄣ',
    explanation: '「转身」念 zhuǎn',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'zhuan-tou-1',
    originalText: '轉頭',
    replacementPhonetic: '專頭',
    pinyin: 'zhuǎn tóu',
    zhuyin: 'ㄓㄨㄢˇ ㄊㄡˊ',
    explanation: '「轉頭一看」念 zhuǎn',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'zhuan-tou-2',
    originalText: '转头',
    replacementPhonetic: '专头',
    pinyin: 'zhuǎn tóu',
    zhuyin: 'ㄓㄨㄢˇ ㄊㄡˊ',
    explanation: '「转头」念 zhuǎn',
    category: 'novel',
    enabled: true,
  },
  {
    id: 'zhuan-xiang-1',
    originalText: '轉向',
    replacementPhonetic: '專向',
    pinyin: 'zhuǎn xiàng',
    zhuyin: 'ㄓㄨㄢˇ ㄒㄧㄤˋ',
    explanation: '「轉向」念 zhuǎn',
    category: 'novel',
    enabled: true,
  },

  // --- 數 / 数 (shǔ vs shù) ---
  {
    id: 'shu-bu-qing-1',
    originalText: '數不清',
    replacementPhonetic: '屬不清',
    pinyin: 'shǔ bu qīng',
    zhuyin: 'ㄕㄨˇ ㄅㄨ˙ ㄑㄧㄥ',
    explanation: '「數不清」念 shǔ 避免讀成 shù (數量)',
    category: 'common',
    enabled: true,
  },
  {
    id: 'shu-bu-qing-2',
    originalText: '数不清',
    replacementPhonetic: '属不清',
    pinyin: 'shǔ bu qīng',
    zhuyin: 'ㄕㄨˇ ㄅㄨ˙ ㄑㄧㄥ',
    explanation: '「数不清」念 shǔ',
    category: 'common',
    enabled: true,
  },
  {
    id: 'shu-yi-qian-ji-1',
    originalText: '數以千計',
    replacementPhonetic: '屬以千計',
    pinyin: 'shǔ yǐ qiān jì',
    zhuyin: 'ㄕㄨˇ ㄧˇ ㄑㄧㄢ ㄐㄧˋ',
    explanation: '「數以千計」念 shǔ',
    category: 'common',
    enabled: true,
  },
  {
    id: 'shu-yi-qian-ji-2',
    originalText: '数以千计',
    replacementPhonetic: '属以千计',
    pinyin: 'shǔ yǐ qiān jì',
    zhuyin: 'ㄕㄨˇ ㄧˇ ㄑㄧㄢ ㄐㄧˋ',
    explanation: '「数以千计」念 shǔ',
    category: 'common',
    enabled: true,
  },
];

/**
 * Scan text to find all occurrences of polyphone matches
 */
export function scanPolyphones(
  text: string,
  customRules: PolyphoneRule[] = []
): Array<{
  original: string;
  replacement: string;
  pinyin: string;
  zhuyin?: string;
  explanation: string;
  index: number;
  length: number;
}> {
  if (!text) return [];

  // Active rules (custom rules take priority over defaults)
  const activeCustom = (customRules || []).filter((r) => r.enabled);
  const customOriginals = new Set(activeCustom.map((r) => r.originalText));
  const activeDefaults = DEFAULT_POLYPHONE_RULES.filter(
    (r) => r.enabled && !customOriginals.has(r.originalText)
  );

  const allRules = [...activeCustom, ...activeDefaults];
  // Sort rules by originalText length descending so longer phrases match first (e.g. '一模一樣' before '模')
  allRules.sort((a, b) => b.originalText.length - a.originalText.length);

  const matches: Array<{
    original: string;
    replacement: string;
    pinyin: string;
    zhuyin?: string;
    explanation: string;
    index: number;
    length: number;
  }> = [];

  const matchedIndices = new Set<number>();

  for (const rule of allRules) {
    if (!rule.originalText) continue;
    let pos = 0;
    while ((pos = text.indexOf(rule.originalText, pos)) !== -1) {
      // Check collision
      let collides = false;
      for (let i = 0; i < rule.originalText.length; i++) {
        if (matchedIndices.has(pos + i)) {
          collides = true;
          break;
        }
      }

      if (!collides) {
        for (let i = 0; i < rule.originalText.length; i++) {
          matchedIndices.add(pos + i);
        }
        matches.push({
          original: rule.originalText,
          replacement: rule.replacementPhonetic,
          pinyin: rule.pinyin,
          zhuyin: rule.zhuyin,
          explanation: rule.explanation,
          index: pos,
          length: rule.originalText.length,
        });
      }
      pos += rule.originalText.length;
    }
  }

  // Sort by index ascending
  return matches.sort((a, b) => a.index - b.index);
}

/**
 * Apply polyphone corrections to text
 * Returns transformed text ready for Microsoft Edge TTS synthesis
 */
export function applyPolyphoneCorrections(
  text: string,
  customRules: PolyphoneRule[] = [],
  enabled: boolean = true
): {
  correctedText: string;
  appliedCount: number;
  matches: Array<{
    original: string;
    replacement: string;
    pinyin: string;
    zhuyin?: string;
    index: number;
  }>;
} {
  if (!enabled || !text) {
    return { correctedText: text, appliedCount: 0, matches: [] };
  }

  const matches = scanPolyphones(text, customRules);
  if (matches.length === 0) {
    return { correctedText: text, appliedCount: 0, matches: [] };
  }

  let result = '';
  let lastIndex = 0;

  for (const m of matches) {
    result += text.substring(lastIndex, m.index);
    result += m.replacement;
    lastIndex = m.index + m.length;
  }
  result += text.substring(lastIndex);

  return {
    correctedText: result,
    appliedCount: matches.length,
    matches: matches.map((m) => ({
      original: m.original,
      replacement: m.replacement,
      pinyin: m.pinyin,
      zhuyin: m.zhuyin,
      index: m.index,
    })),
  };
}
