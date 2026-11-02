/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VoiceConfig, BackendStatus } from '../types';
import { VoiceSelector } from './VoiceSelector';
import { findVoiceOption } from '../utils/voices';

interface VoiceSettingsViewProps {
  voiceConfig: VoiceConfig;
  onChangeConfig: (newConfig: VoiceConfig) => void;
  backendStatus: BackendStatus;
}

export const VoiceSettingsView: React.FC<VoiceSettingsViewProps> = ({
  voiceConfig,
  onChangeConfig,
  backendStatus,
}) => {
  const [testText, setTestText] = useState(
    '道友請留步！此去青玄宗路途遙遠，若無飛劍護身，恐遭山間妖魔暗算。'
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testLog, setTestLog] = useState<string | null>(null);

  const activeOption = findVoiceOption(voiceConfig.voiceCode);

  const handleRunVoiceTest = async () => {
    setIsTesting(true);
    setTestLog(null);

    try {
      const res = await fetch('/api/tts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: voiceConfig.voiceCode,
          text: testText,
          rate: voiceConfig.rate,
          pitch: voiceConfig.pitch,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        await audio.play();
        setTestLog(
          `✓ 微軟原廠語音「${voiceConfig.displayName}」（${voiceConfig.voiceCode}）已成功合成並播放！`
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setTestLog(`後端回傳錯誤：${err.error || res.statusText}`);
      }
    } catch (err: any) {
      setTestLog(`連線端點失敗：${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const samplePresets = [
    {
      label: '仙俠玄幻',
      text: '道友請留步！此去青玄宗路途遙遠，若無飛劍護身，恐遭山間妖魔暗算。',
    },
    {
      label: '武俠江湖',
      text: '三十年前那場大漠決戰，狂風裹挾著黃沙，一劍西來，無人知其去向。',
    },
    {
      label: '都會言情',
      text: '台北街頭的午後雷陣雨剛停，咖啡館的門鈴叮噹響起，是他久違的身影。',
    },
    {
      label: '粵語經典',
      text: '無論出面嘅風浪有幾大，只要大家齊心協力，就冇任何難題係解決唔到嘅。',
    },
    {
      label: '東北話特色',
      text: '哎呀媽呀，你可算來了！快進屋上炕熱乎熱乎，熱騰騰的酸菜燉粉條管飽！',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>微軟官方語音庫與音色設定</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            300+ 種 Neural 聲音已支援
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          支援所有微軟 Edge TTS 官方原廠 Neural 語音，包含普通話、台灣國語、香港粵語、地方方言及各國語言
        </p>
      </div>

      {/* Interactive Voice Selector Card */}
      <div className="p-6 rounded-2xl bg-slate-850 border border-slate-700 space-y-5 bg-slate-800/40">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-200">
            預設使用聲音與參數設定
          </span>
          <span className="text-xs text-amber-400 font-mono">
            {voiceConfig.voiceCode}
          </span>
        </div>

        {/* Embedded VoiceSelector */}
        <VoiceSelector
          voiceConfig={voiceConfig}
          onChange={onChangeConfig}
        />
      </div>

      {/* Live Audition & Text Lab Card */}
      <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">
            自訂試聽句子（測試所選聲線與語速）
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500">快速填入範例：</span>
            {samplePresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setTestText(p.text)}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          rows={3}
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="輸入想要試聽的文字..."
          className="w-full p-3 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans resize-none"
        />

        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            onClick={handleRunVoiceTest}
            disabled={isTesting || !testText.trim()}
            className="px-5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <span>{isTesting ? '微軟語音合成中...' : `▶ 試聽「${voiceConfig.displayName.split(' ')[0]}」語音`}</span>
          </button>
        </div>

        {testLog && (
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700 text-xs font-mono text-emerald-400">
            {testLog}
          </div>
        )}
      </div>

      {/* Supported Voices Guide */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
        <div className="font-semibold text-slate-300 flex items-center gap-2">
          <span>微軟官方音色推薦指南</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
            <div className="font-bold text-amber-300">雲希 (Yunxi)</div>
            <div className="text-[11px] text-slate-400">青年男聲，富有朝氣與敘事感，推薦仙俠、玄幻小說。</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
            <div className="font-bold text-amber-300">曉曉 (Xiaoxiao)</div>
            <div className="text-[11px] text-slate-400">溫暖生動多情感女聲，有聲小說、都會情感第一推薦。</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
            <div className="font-bold text-amber-300">雲健 (Yunjian)</div>
            <div className="text-[11px] text-slate-400">沉穩磁性成熟男聲，推薦武俠江湖、影視解說、歷史傳奇。</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
            <div className="font-bold text-amber-300">曉臻 / 雲哲 (台灣)</div>
            <div className="text-[11px] text-slate-400">正宗台灣口音男女聲，自然親切，繁體中文小說絕佳選擇。</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
            <div className="font-bold text-amber-300">雲龍 / 曉曼 (香港粵語)</div>
            <div className="text-[11px] text-slate-400">地道廣東話/香港粵語，港風江湖、經典影視與廣播小說首選。</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
            <div className="font-bold text-amber-300">國際全球語言 (300+)</div>
            <div className="text-[11px] text-slate-400">英語（美英澳）、日語、韓語、法語、德語等全球微軟音色。</div>
          </div>
        </div>
      </div>
    </div>
  );
};
