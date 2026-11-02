/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BackendStatus } from '../types';

interface MacGuideViewProps {
  backendStatus: BackendStatus;
  onCheckBackend: () => void;
  isCheckingBackend: boolean;
}

export const MacGuideView: React.FC<MacGuideViewProps> = ({
  backendStatus,
  onCheckBackend,
  isCheckingBackend,
}) => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">
          Apple Silicon M1 (8GB RAM) 本機環境規劃與運作指南
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          專為 8GB 記憶體與 Chrome 瀏覽器調校，零付費 API、完全本機資料儲存、自動化一鍵啟動
        </p>
      </div>

      {/* Connection & Phase Status */}
      <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                backendStatus.connected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-sm font-semibold text-slate-200">
              本機 Python 後端狀態：
              {backendStatus.connected
                ? '已成功連線 (http://127.0.0.1:8000)'
                : '尚未連線（當前為第一階段前端介面模式）'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            第一階段已完整建立前端介面、中文斷句分段引擎、Yunxi 語音規範與排程架構。
          </p>
        </div>
        <button
          onClick={onCheckBackend}
          disabled={isCheckingBackend}
          className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600 whitespace-nowrap shrink-0"
        >
          {isCheckingBackend ? '偵測連線中...' : '重新偵測本機服務'}
        </button>
      </div>

      {/* M1 8GB Optimization Constitution */}
      <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
        <h2 className="text-base font-bold text-slate-200">
          一、針對 M1 晶片與 8GB 記憶體的四大架構防護
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="font-semibold text-amber-400">
              1. 單一工作佇列（Concurrency = 1）
            </div>
            <p className="text-slate-400 leading-relaxed">
              絕對不允許平行併發多個 TTS 請求。這不僅保護 M1 的 8GB 統一記憶體不發生 Swap 膨脹，更是遵守微軟端點的頻率規範，防止觸發 HTTP 429 封鎖。
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="font-semibold text-amber-400">
              2. 串流磁碟直寫，零 RAM 滯留
            </div>
            <p className="text-slate-400 leading-relaxed">
              處理十萬字甚至千萬字時，每個段落（200~300 字）生成完畢後立即以二進位串流寫入本機硬碟（約 50~100KB/段），完成後即刻釋放 Python 與瀏覽器記憶體。
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="font-semibold text-amber-400">
              3. 背景服務持續運行（免開分頁）
            </div>
            <p className="text-slate-400 leading-relaxed">
              長達數小時的配音任務由本機 Python 守護處理緒接管。即使關閉 Chrome 瀏覽器分頁或視窗，後端仍會持續依序生成，重新開啟網頁時即時自 SQLite 讀取最新進度。
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="font-semibold text-amber-400">
              4. FFmpeg 外部極速無損串流拼接
            </div>
            <p className="text-slate-400 leading-relaxed">
              整本書或整章輸出時，不透過記憶體陣列拼接音訊，而是呼叫本機 FFmpeg Concat Demuxer 直接進行檔案描述符對齊封裝，記憶體峰值低於 60MB。
            </p>
          </div>
        </div>
      </div>

      {/* Ten Million Words Capacity & Time Projection */}
      <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
        <h2 className="text-base font-bold text-slate-200">
          二、千萬字與十萬字容量與耗時客觀估算
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 font-medium">
                <th className="py-2.5 px-3">處理規模</th>
                <th className="py-2.5 px-3">切分段落</th>
                <th className="py-2.5 px-3">音訊時長 (聽完)</th>
                <th className="py-2.5 px-3 text-amber-400 font-bold">電腦合成耗時 (跑完)</th>
                <th className="py-2.5 px-3">硬碟儲存</th>
                <th className="py-2.5 px-3">建議執行策略</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono tabular-nums text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">
                  測試範例 (1.2 萬字)
                </td>
                <td className="py-2.5 px-3">約 45 段</td>
                <td className="py-2.5 px-3">約 50 分鐘</td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold font-sans">
                  約 1 ~ 2 分鐘
                </td>
                <td className="py-2.5 px-3">約 35 MB</td>
                <td className="py-2.5 px-3 font-sans text-emerald-400">單次極速直出</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">
                  單次常規任務 (10 萬字)
                </td>
                <td className="py-2.5 px-3">約 380 段</td>
                <td className="py-2.5 px-3">約 6.5 ~ 7 小時</td>
                <td className="py-2.5 px-3 text-amber-400 font-bold font-sans">
                  僅約 10 ~ 15 分鐘！ (雙通道)
                </td>
                <td className="py-2.5 px-3">約 350 MB</td>
                <td className="py-2.5 px-3 font-sans text-amber-400">
                  泡一杯咖啡的時間即可整本完工
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">
                  長期目標 (1,000 萬字)
                </td>
                <td className="py-2.5 px-3">約 38,000 段</td>
                <td className="py-2.5 px-3">約 650 ~ 750 小時</td>
                <td className="py-2.5 px-3 text-sky-400 font-bold font-sans">
                  累計約 16 ~ 22 小時
                </td>
                <td className="py-2.5 px-3">約 30~35 GB</td>
                <td className="py-2.5 px-3 font-sans text-sky-400">
                  每部分冊排程，夜間或背景靜默生成
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase 2 Local Backend Blueprint */}
      <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
        <h2 className="text-base font-bold text-slate-200">
          三、第二階段「本機免終端機自動啟動」架構規劃
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          為了讓您日常只需透過 Chrome 點開網頁操作，第二階段我們將建立以下本機目錄與一鍵啟動檔案：
        </p>

        <div className="p-4 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 space-y-2 border border-slate-800">
          <div className="text-amber-400 font-bold">本地後端架構預覽 (Phase 2)：</div>
          <div className="text-slate-400 pl-2 space-y-1">
            <div>📁 backend/</div>
            <div>&nbsp;&nbsp;├── 📄 server.py &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# 本機 FastAPI/HTTP 服務 (localhost:8000)</div>
            <div>&nbsp;&nbsp;├── 📄 tts_engine.py &nbsp;&nbsp;&nbsp;&nbsp;# edge-tts 非同步合成與退避重試控制</div>
            <div>&nbsp;&nbsp;├── 📄 database.py &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# SQLite 任務狀態儲存庫 (novel_voice.db)</div>
            <div>&nbsp;&nbsp;├── 📄 audio_merger.py &nbsp;&nbsp;# FFmpeg 串流無損合併工具</div>
            <div>&nbsp;&nbsp;└── 📄 requirements.txt &nbsp;# 依賴清單 (fastapi, uvicorn, edge-tts)</div>
            <div>🚀 start_studio.command &nbsp;&nbsp;&nbsp;# Mac 桌面雙擊一鍵啟動腳本（免打命令）</div>
          </div>
        </div>
      </div>
    </div>
  );
};
