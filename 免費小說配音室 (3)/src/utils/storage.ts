/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NovelProject, SystemStats, LogEntry, Chapter } from '../types';
import { splitNovelText } from './textSplitter';

const STORAGE_KEY = 'fnvs_novel_projects_v1';
const ACTIVE_PROJ_KEY = 'fnvs_active_project_id';

const SAMPLE_NOVEL_TITLE = '天元仙途（測試專案）';
const SAMPLE_NOVEL_AUTHOR = '忘語閣';

const SAMPLE_RAW_TEXT = `第一章 山村少年逢仙緣
青牛村坐落在大青山腳下，這裡常年雲霧繚繞，宛如人間仙境。清晨的第一縷陽光刺破薄霧，灑在石階小徑上。
林凡背著採藥簍，手裡握著一柄磨得發亮的藥鋤，腳步輕快地穿梭在陡峭的山嶺間。他自幼隨祖父識草辨藥，雖然年僅十六，卻對山中各種靈草的習性了如指掌。
「今日若是能採到一株五十年份的紫血參，換得幾錢碎銀，便能給妹妹買些治咳疾的潤喉散了。」林凡抹了一把額頭上的細汗，喃喃自語。
山風獵獵，吹得衣袂翻飛。正當他行至一處危崖邊緣時，忽然耳旁傳來一陣破空之聲。
只見天際一道青芒呼嘯而過，速度快若奔雷，光芒中隱約可見一位身著淡青色道袍的身影，足踏三尺青鋒，宛如神人下凡。
「那是……傳說中的修仙者！」林凡雙目圓睜，心臟劇烈跳動。那是他只在村中說書人口中聽聞過的御劍長生之輩。
然而不等他細想，青芒後方陡然騰起一團黑煞魔霧，淒厲的桀桀怪笑聲響徹整座山谷：「李青玄，交出萬劍令，老夫便留你一具全屍！」
仙魔交戰的罡風瞬間撕裂了山頭巨石。狂暴的氣浪將林凡狠狠震退數步，一頭栽進了後方隱秘的石窟之中。

第二章 絕壁殘洞藏古印
石窟內部幽暗深邃，空氣中帶著一股腐朽潮濕的氣味。林凡揉著劇痛的手肘站起身，四周黑漆漆一片，伸手不見五指。
他從腰間掏出火摺子吹亮，微弱的火光在洞壁上投下晃動的陰影。
只見洞穴深處，赫然立著一座早已斑駁風化的青石台。石台中央，靜靜懸浮著一枚通體晶瑩的碧玉小印，表面篆刻著繁複無比的古老符文，散發著微弱卻溫潤的乳白霞光。
外面的轟鳴聲仍在持續，整個石窟都在微微震顫，碎石簌簌落下。
林凡心中既是惶恐又是好奇。在生死關頭，直覺告訴他，這枚懸浮的小印絕非凡俗之物。
他小心翼翼地靠近石台，伸出微微顫抖的手指，指尖剛剛觸及玉印表面，一股溫熱的暖流便瞬間順著經脈直衝天靈蓋！
剎那間，無數玄奧晦澀的口訣符文湧入他的識海，林凡直覺腦海中轟然一聲巨響，整個人頓時陷入了一片金光璀璨的幻境之中……

第三章 踏入玄門問長生
不知過了多久，石窟外的震盪漸漸平息。
林凡緩緩睜開雙眼，發現原本懸浮在石台上的碧玉小印已消失不見，取而代之的是掌心處多出了一道淡淡的青蓮印記。
不僅如此，原本因勞累而酸痛的筋骨，此刻竟然充滿了前所未有的充沛力道，就連五感也變得異常敏銳，百步之外草叢中秋蟬的振翅聲皆清晰可辨。
「這莫非是話本裡寫的脫胎換骨？」林凡又驚又喜。
他走出石窟，山谷間的爭鬥顯然已經分出了勝負，巨樹傾覆，深坑密布，那位正道修士李青玄正倚坐在一株斷裂的古松下，面如金紙，氣若游絲。
見林凡完好無損地自峭壁後走出，李青玄眼眸微動，沙啞道：「凡俗少年……你可願承我衣缽，入我青玄宗？此去仙道漫漫，生死難料，你可懼否？」
林凡深吸一口氣，握緊雙拳，目光堅定如磐石：「晚輩林凡，只願踏遍萬水千山，求得長生真道，無怨無悔！」`;

export function getSampleProject(): NovelProject {
  const projectId = 'sample_proj_tianyuan';
  const chapters = splitNovelText(SAMPLE_RAW_TEXT, {
    projectId,
    maxChunkChars: 180,
  });

  const totalWords = chapters.reduce((sum, ch) => sum + ch.totalWords, 0);

  // Mark first 3 paragraphs of Chapter 1 as completed with mock durations
  if (chapters.length > 0 && chapters[0].paragraphs.length >= 3) {
    chapters[0].paragraphs[0].status = 'completed';
    chapters[0].paragraphs[0].audioDurationSeconds = 14;
    chapters[0].paragraphs[0].fileSizeBytes = 58200;

    chapters[0].paragraphs[1].status = 'completed';
    chapters[0].paragraphs[1].audioDurationSeconds = 18;
    chapters[0].paragraphs[1].fileSizeBytes = 72400;

    chapters[0].paragraphs[2].status = 'completed';
    chapters[0].paragraphs[2].audioDurationSeconds = 16;
    chapters[0].paragraphs[2].fileSizeBytes = 64300;
  }

  return {
    id: projectId,
    title: SAMPLE_NOVEL_TITLE,
    author: SAMPLE_NOVEL_AUTHOR,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 3600000,
    totalWords,
    chapters,
    voiceSettings: {
      voiceCode: 'zh-CN-YunxiNeural',
      displayName: '雲希 (Yunxi) - 微軟 Edge 青年男聲',
      gender: 'male',
      rate: '+0%',
      pitch: '+0Hz',
      volume: '+0%',
    },
    status: 'draft',
    outputDirectory: '~/NovelVoices/tianyuan',
  };
}

export function loadProjectsFromStorage(): NovelProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = [getSampleProject()];
      saveProjectsToStorage(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const initial = [getSampleProject()];
    saveProjectsToStorage(initial);
    return initial;
  } catch (e) {
    console.error('Failed to load projects from storage:', e);
    return [getSampleProject()];
  }
}

export function saveProjectsToStorage(projects: NovelProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.warn('Storage write failed or exceeded quota:', e);
  }
}

export function getActiveProjectId(projects: NovelProject[]): string {
  const saved = localStorage.getItem(ACTIVE_PROJ_KEY);
  if (saved && projects.some(p => p.id === saved)) {
    return saved;
  }
  return projects[0]?.id || '';
}

export function setActiveProjectId(id: string): void {
  localStorage.setItem(ACTIVE_PROJ_KEY, id);
}

export function computeSystemStats(projects: NovelProject[]): SystemStats {
  let totalWords = 0;
  let totalAudioDurationSeconds = 0;
  let completedTasks = 0;
  let runningTasks = 0;
  let failedTasks = 0;
  let totalBytes = 0;

  for (const proj of projects) {
    totalWords += proj.totalWords;
    for (const ch of proj.chapters) {
      for (const p of ch.paragraphs) {
        if (p.status === 'completed') {
          completedTasks++;
          totalAudioDurationSeconds += p.audioDurationSeconds || Math.round(p.wordCount / 4.2);
          totalBytes += p.fileSizeBytes || (p.wordCount * 450);
        } else if (p.status === 'processing') {
          runningTasks++;
        } else if (p.status === 'failed') {
          failedTasks++;
        }
      }
    }
  }

  return {
    totalProjects: projects.length,
    totalWords,
    totalAudioDurationSeconds,
    completedTasks,
    runningTasks,
    failedTasks,
    diskCacheUsedBytes: totalBytes,
    diskCacheLimitBytes: 15 * 1024 * 1024 * 1024, // 15 GB local target allocation
  };
}
