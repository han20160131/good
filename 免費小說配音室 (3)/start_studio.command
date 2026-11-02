#!/bin/bash
# ==============================================================================
# 免費小說配音室 (Free Novel Voice Studio) - Mac 一鍵啟動腳本
# 雙擊此檔案即可自動在背景啟動 Node.js 全端伺服器 (Port 3000)，並開啟瀏覽器操作介面。
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "  免費小說配音室 (Free Novel Voice Studio) 啟動中..."
echo "  全端架構：Node.js + Express + Vite + Microsoft Edge TTS"
echo "  預設聲線：zh-CN-YunxiNeural (微軟雲希 300+ 聲線)"
echo "=========================================================="

# 安全退出處理：關閉視窗時自動結束所有背景行程
cleanup() {
    echo ""
    echo "正在停止配音工作室服務..."
    if [ -n "$NODE_PID" ]; then
        kill "$NODE_PID" 2>/dev/null || true
    fi
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup EXIT INT TERM

# 1. 尋找並檢查 Node.js (提供網頁與配音核心 API)
NODE_CMD=""
NPM_CMD=""

if command -v node &> /dev/null; then
    NODE_CMD="node"
elif [ -x "/opt/homebrew/bin/node" ]; then
    NODE_CMD="/opt/homebrew/bin/node"
    export PATH="/opt/homebrew/bin:$PATH"
elif [ -x "/usr/local/bin/node" ]; then
    NODE_CMD="/usr/local/bin/node"
    export PATH="/usr/local/bin:$PATH"
fi

if [ -z "$NODE_CMD" ]; then
    echo "【錯誤】：未檢測到 Node.js 環境！"
    echo "本系統網頁與配音核心由 Node.js 全端伺服器 (3000 埠) 提供。"
    echo "請先安裝 Node.js：前往 https://nodejs.org/ 下載安裝，或執行 brew install node"
    echo "按任意鍵退出..."
    read -n 1
    exit 1
fi

echo "[1/4] Node.js 環境就緒：$($NODE_CMD -v)"

# 2. 檢查並安裝 Node.js 依賴套件
if [ ! -d "node_modules" ]; then
    echo "[2/4] 首次執行：正在安裝全端網頁與語音依賴套件 (npm install)..."
    npm install
else
    echo "[2/4] 核心依賴已就緒。"
fi

# 3. 確保音訊保存目錄存在
mkdir -p "$HOME/NovelVoices"
mkdir -p "$DIR/data/projects"

# 4. 可選：啟動 Python 輔助後端 (若環境支援)
if command -v python3 &> /dev/null && [ -d "backend" ]; then
    if [ ! -d "venv" ]; then
        python3 -m venv venv 2>/dev/null || true
        if [ -x "./venv/bin/pip" ]; then
            ./venv/bin/pip install -r backend/requirements.txt 2>/dev/null || true
        fi
    fi
    if [ -x "./venv/bin/python3" ]; then
        echo "[3/4] 啟動輔助 Python 語音服務 (127.0.0.1:8000)..."
        cd backend
        ../venv/bin/python3 server.py &> /dev/null &
        BACKEND_PID=$!
        cd ..
    fi
fi

# 5. 啟動核心全端 Node.js 網頁伺服器 (3000 埠)
echo "[4/4] 正在啟動小說配音全端伺服器 (http://localhost:3000)..."
npm run dev -- --port 3000 --host 0.0.0.0 &
NODE_PID=$!

STUDIO_URL="http://localhost:3000"

# 6. 等待 3000 埠網頁伺服器就緒
echo "等待配音工作室網頁就緒中..."
for i in {1..30}; do
    if curl -s "http://127.0.0.1:3000/api/health" | grep -q "ok" 2>/dev/null; then
        echo "✓ 配音工作室網頁與語音引擎已成功連線！"
        break
    fi
    sleep 1
done

# 7. 自動以 Google Chrome 或預設瀏覽器開啟網頁介面
echo "正在開啟瀏覽器操作介面 ($STUDIO_URL)..."
if [ -d "/Applications/Google Chrome.app" ]; then
    open -a "Google Chrome" "$STUDIO_URL"
else
    open "$STUDIO_URL"
fi

echo ""
echo "=========================================================="
echo "  免費小說配音室已啟動成功！"
echo "  配音工作室網址: $STUDIO_URL"
echo "  小說與音訊保存路徑: ~/NovelVoices/"
echo "  若要停止服務，直接關閉此終端機視窗即可。"
echo "=========================================================="

wait $NODE_PID
