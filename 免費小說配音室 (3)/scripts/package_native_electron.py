#!/usr/bin/env python3
"""
Packages a 100% genuine standalone macOS Electron Application (like VS Code, Obsidian, Slack).
Runs completely natively on Apple Silicon (M1/M2/M3/M4) without needing Node.js, terminal, or Chrome.
"""

import os
import sys
import shutil
import subprocess
import zipfile
import plistlib

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    out_dir = os.path.join(root_dir, 'public', 'downloads')
    os.makedirs(out_dir, exist_ok=True)

    print("[NativePackager] 1. Rebuilding Vite production frontend...")
    subprocess.run(['npm', 'run', 'build'], cwd=root_dir, check=True)

    print("[NativePackager] 2. Bundling backend with esbuild into server-standalone.mjs...")
    bundle_out = '/tmp/server-standalone.mjs'
    banner = "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
    subprocess.run([
        'npx', 'esbuild', 'server.ts',
        '--bundle',
        '--platform=node',
        '--target=node20',
        '--format=esm',
        f'--outfile={bundle_out}',
        '--external:vite',
        f'--banner:js={banner}'
    ], cwd=root_dir, check=True)

    print("[NativePackager] 3. Extracting clean Electron macOS template...")
    electron_zip = '/tmp/electron-mac-arm64.zip'
    if not os.path.exists(electron_zip):
        print("Downloading Electron macOS arm64...")
        subprocess.run([
            'curl', '-L', '-o', electron_zip,
            'https://github.com/electron/electron/releases/download/v30.0.0/electron-v30.0.0-darwin-arm64.zip'
        ], check=True)

    build_dir = '/tmp/native_mac_build'
    shutil.rmtree(build_dir, ignore_errors=True)
    os.makedirs(build_dir, exist_ok=True)

    subprocess.run(['unzip', '-q', electron_zip, '-d', build_dir], check=True)

    app_src = os.path.join(build_dir, 'Electron.app')
    target_app = os.path.join(build_dir, '小說配音室.app')
    os.rename(app_src, target_app)

    # Rename executable
    macos_dir = os.path.join(target_app, 'Contents', 'MacOS')
    old_bin = os.path.join(macos_dir, 'Electron')
    new_bin = os.path.join(macos_dir, '小說配音室')
    if os.path.exists(old_bin):
        os.rename(old_bin, new_bin)
    os.chmod(new_bin, 0o755)

    # Update Info.plist
    plist_path = os.path.join(target_app, 'Contents', 'Info.plist')
    with open(plist_path, 'rb') as f:
        pl = plistlib.load(f)
    
    pl['CFBundleExecutable'] = '小說配音室'
    pl['CFBundleName'] = '小說配音室'
    pl['CFBundleDisplayName'] = '小說配音室'
    pl['CFBundleIdentifier'] = 'com.novelvoice.studio'
    pl['CFBundleVersion'] = '2.0.0'
    pl['CFBundleShortVersionString'] = '2.0.0'
    pl['NSHumanReadableCopyright'] = 'Copyright © 2026 小說配音室. All rights reserved.'

    with open(plist_path, 'wb') as f:
        plistlib.dump(pl, f)

    # Setup Resources/app
    res_dir = os.path.join(target_app, 'Contents', 'Resources')
    default_asar = os.path.join(res_dir, 'default_app.asar')
    if os.path.exists(default_asar):
        os.remove(default_asar)

    app_dir = os.path.join(res_dir, 'app')
    os.makedirs(app_dir, exist_ok=True)

    # 1. Copy dist
    shutil.copytree(os.path.join(root_dir, 'dist'), os.path.join(app_dir, 'dist'))

    # 2. Copy server-standalone.mjs
    shutil.copyfile(bundle_out, os.path.join(app_dir, 'server-standalone.mjs'))

    # 3. Copy scripts/drm.py
    os.makedirs(os.path.join(app_dir, 'scripts'), exist_ok=True)
    shutil.copyfile(os.path.join(root_dir, 'scripts', 'drm.py'), os.path.join(app_dir, 'scripts', 'drm.py'))

    # 4. Write package.json for Electron
    pkg_json = """{
  "name": "novel-voice-studio",
  "version": "2.0.0",
  "description": "小說配音室 - 原生 Mac 桌面應用程式",
  "main": "main.mjs",
  "type": "module"
}"""
    with open(os.path.join(app_dir, 'package.json'), 'w', encoding='utf-8') as f:
        f.write(pkg_json)

    # 5. Write main.mjs
    main_mjs = """import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 32189;
process.env.PORT = String(PORT);
process.env.NODE_ENV = 'production';
process.env.ELECTRON_RUN_AS_NODE = '';

// Start internal offline audio synthesis server
try {
  await import('./server-standalone.mjs');
  console.log('[NativeDesktop] Internal synthesis engine active on port ' + PORT);
} catch (err) {
  console.error('[NativeDesktop] Failed to start server:', err);
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    title: '小說配音室',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#020617',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  const appUrl = `http://127.0.0.1:${PORT}`;
  mainWindow.loadURL(appUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
"""
    with open(os.path.join(app_dir, 'main.mjs'), 'w', encoding='utf-8') as f:
        f.write(main_mjs)

    print("[NativePackager] 4. Fixing permissions across macOS bundle...")
    for root, dirs, files in os.walk(target_app):
        for f in files:
            full_p = os.path.join(root, f)
            if 'MacOS' in full_p or full_p.endswith(('小說配音室', 'Electron Helper', 'launch')):
                os.chmod(full_p, 0o755)

    build_dmg_cmd = """#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_PATH="$DIR/小說配音室.app"
OUT_DMG="$HOME/Desktop/小說配音室.dmg"

echo "======================================================"
echo "🍏 正在為您生成原生 macOS 磁碟映像檔 (.dmg)..."
echo "======================================================"

if [ ! -d "$APP_PATH" ]; then
  echo "❌ 找不到 小說配音室.app"
  exit 1
fi

rm -f "$OUT_DMG"
hdiutil create -volname "小說配音室" -srcfolder "$APP_PATH" -ov -format UDZO "$OUT_DMG"

if [ -f "$OUT_DMG" ]; then
  echo ""
  echo "🎉 製作成功！已在您的桌面上生成原生 DMG："
  echo "👉 $OUT_DMG"
  echo "雙擊桌面的「小說配音室.dmg」即可拖曳安裝到 Applications！"
  open -R "$OUT_DMG"
else
  echo "❌ DMG 製作失敗"
fi
"""
    cmd_path = os.path.join(build_dir, '一鍵製作原生DMG.command')
    with open(cmd_path, 'w', encoding='utf-8') as f:
        f.write(build_dmg_cmd)
    os.chmod(cmd_path, 0o755)

    print("[NativePackager] 5. Creating final distribution zip with proper symlinks and max compression...")
    zip_target = os.path.join(out_dir, 'NovelVoiceStudio_Mac.zip')
    
    with zipfile.ZipFile(zip_target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for root, dirs, files in os.walk(build_dir, followlinks=False):
            # Do not recurse into symlinked directories
            for d in list(dirs):
                p = os.path.join(root, d)
                if os.path.islink(p):
                    dirs.remove(d)
                    files.append(d)

            for name in files:
                full_path = os.path.join(root, name)
                rel_path = os.path.relpath(full_path, build_dir)
                
                if os.path.islink(full_path):
                    zinfo = zipfile.ZipInfo(rel_path)
                    zinfo.create_system = 3
                    zinfo.external_attr = 0o120777 << 16
                    link_target = os.readlink(full_path)
                    zf.writestr(zinfo, link_target)
                elif os.path.isfile(full_path):
                    zinfo = zipfile.ZipInfo.from_file(full_path, rel_path)
                    zinfo.compress_type = zipfile.ZIP_DEFLATED
                    st = os.stat(full_path)
                    if (st.st_mode & 0o111) != 0 or 'MacOS' in full_path:
                        zinfo.external_attr = 0o100755 << 16
                    else:
                        zinfo.external_attr = 0o100644 << 16
                    with open(full_path, 'rb') as f:
                        zf.writestr(zinfo, f.read())

    # Create alias copies for direct DMG and legacy filenames
    shutil.copyfile(zip_target, os.path.join(out_dir, 'NovelVoiceStudio.zip'))

    size_mb = os.path.getsize(zip_target) / (1024 * 1024)
    print(f"🎉 [NativePackager] Successfully generated {zip_target} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    main()
