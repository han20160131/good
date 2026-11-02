#!/usr/bin/env python3
"""
Novel Voice Studio - Mac DMG & Bundle Generator
Constructs a valid Mac mountable disk image (.dmg) and ZIP bundle containing:
- 小說配音室.app
- start_studio.command
- 一鍵安裝與修復權限.command
- README_Mac安裝說明.txt
"""

import os
import sys
import struct
import time
import zipfile

SECTOR_SIZE = 2048

def write_both_endian_16(val):
    return struct.pack('<H', val) + struct.pack('>H', val)

def write_both_endian_32(val):
    return struct.pack('<I', val) + struct.pack('>I', val)

def iso_date_now():
    now = time.gmtime()
    s = f"{now.tm_year:04d}{now.tm_mon:02d}{now.tm_mday:02d}{now.tm_hour:02d}{now.tm_min:02d}{now.tm_sec:02d}00"
    return s.encode('ascii') + b'\x00'

def iso_dir_date_now():
    now = time.gmtime()
    return struct.pack('7B', now.tm_year - 1900, now.tm_mon, now.tm_mday, now.tm_hour, now.tm_min, now.tm_sec, 0)

def create_directory_record(extent_location, extent_length, is_dir=False, name=b'\x00'):
    name_len = len(name)
    rec_len = 33 + name_len
    if rec_len % 2 != 0:
        rec_len += 1
    rec = bytearray(rec_len)
    rec[0] = rec_len
    rec[1] = 0 # extended attribute record length
    rec[2:10] = write_both_endian_32(extent_location)
    rec[10:18] = write_both_endian_32(extent_length)
    rec[18:25] = iso_dir_date_now()
    rec[25] = 2 if is_dir else 0 # file flags (2 = directory)
    rec[26] = 0 # file unit size
    rec[27] = 0 # interleave gap size
    rec[28:32] = write_both_endian_16(1) # volume sequence number
    rec[32] = name_len
    rec[33:33+name_len] = name
    return rec

def build_dmg_and_zip():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    out_dir = os.path.join(base_dir, 'public', 'downloads')
    os.makedirs(out_dir, exist_ok=True)

    dmg_path = os.path.join(out_dir, 'NovelVoiceStudio.dmg')
    zip_path = os.path.join(out_dir, 'NovelVoiceStudio_Mac.zip')

    info_plist_content = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launch</string>
    <key>CFBundleIdentifier</key>
    <string>com.novelvoice.studio</string>
    <key>CFBundleName</key>
    <string>小說配音室</string>
    <key>CFBundleDisplayName</key>
    <string>小說配音室</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0.0</string>
    <key>CFBundleVersion</key>
    <string>2.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
"""

    launch_sh_content = """#!/bin/bash
# 小說配音室 (Novel Voice Studio) - macOS Native App Launcher
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# Detect node
NODE_PATH=""
for p in /opt/homebrew/bin/node /usr/local/bin/node $(which node 2>/dev/null); do
    if [ -x "$p" ]; then
        NODE_PATH="$p"
        export PATH="$(dirname "$p"):$PATH"
        break
    fi
done

if [ -z "$NODE_PATH" ]; then
    osascript -e 'display alert "未檢測到 Node.js 環境" message "小說配音室核心需要 Node.js。請前往 https://nodejs.org/ 下載安裝，或在終端機執行 brew install node。" as critical'
    exit 1
fi

mkdir -p "$HOME/NovelVoices"

# Start background server if not already running
if ! curl -s "http://127.0.0.1:3000/api/health" | grep -q "ok" 2>/dev/null; then
    cd "$DIR"
    nohup npm run dev -- --port 3000 --host 0.0.0.0 > "$HOME/Library/Logs/NovelVoiceStudio.log" 2>&1 &
    
    # Wait for server ready
    for i in {1..30}; do
        if curl -s "http://127.0.0.1:3000/api/health" | grep -q "ok" 2>/dev/null; then
            break
        fi
        sleep 0.5
    done
fi

# Open Chrome in standalone App mode or open default browser
if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="http://localhost:3000"
else
    open "http://localhost:3000"
fi
"""

    start_studio_path = os.path.join(base_dir, 'start_studio.command')
    start_studio_content = ""
    if os.path.exists(start_studio_path):
        with open(start_studio_path, 'r', encoding='utf-8') as f:
            start_studio_content = f.read()
    else:
        start_studio_content = launch_sh_content

    install_cmd_content = """#!/bin/bash
# ==============================================================================
# 小說配音室 - Mac 一鍵安裝與權限修復
# ==============================================================================
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "=========================================================="
echo "  正在將「小說配音室」安裝至 /Applications 應用程式目錄..."
echo "=========================================================="
cp -R "$DIR/小說配音室.app" /Applications/ 2>/dev/null || sudo cp -R "$DIR/小說配音室.app" /Applications/
xattr -cr /Applications/小說配音室.app 2>/dev/null || true
echo "✓ 權限解除完畢！正在啟動小說配音室..."
open /Applications/小說配音室.app
"""

    readme_content = """==========================================================
小說配音室 (Novel Voice Studio) - macOS DMG 安裝說明
==========================================================

【雙擊安裝指南】
1. 拖曳安裝：
   直接將「小說配音室.app」拖入右邊的「Applications (應用程式)」資料夾即可完成安裝。

2. 首次執行安全提示（Apple Gatekeeper 隔離屬性）：
   若 macOS 提示「無法打開，因為它不是來自識別的開發者」：
   - 方式一（推薦）：在「小說配音室.app」上點擊【滑鼠右鍵】或【雙指輕觸】，選擇「打開 (Open)」，接著點選「打開」即可永久解除。
   - 方式二：雙擊本磁碟映像檔內的「一鍵安裝與修復權限.command」，自動幫您完成複製並清除隔離標籤。

3. 生成之音訊檔案預設保存路徑：
   ~/NovelVoices/

==========================================================
"""

    # 1. Create ZIP bundle
    print(f"Creating ZIP bundle at: {zip_path}")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('小說配音室.app/Contents/Info.plist', info_plist_content)
        zf.writestr('小說配音室.app/Contents/PkgInfo', 'APPL????')
        
        info = zipfile.ZipInfo('小說配音室.app/Contents/MacOS/launch')
        info.external_attr = 0o755 << 16 # executable permissions
        zf.writestr(info, launch_sh_content)

        info2 = zipfile.ZipInfo('start_studio.command')
        info2.external_attr = 0o755 << 16
        zf.writestr(info2, start_studio_content)

        info3 = zipfile.ZipInfo('一鍵安裝與修復權限.command')
        info3.external_attr = 0o755 << 16
        zf.writestr(info3, install_cmd_content)

        zf.writestr('README_Mac安裝說明.txt', readme_content)

    # 2. Build ISO-9660 Disk Image (.dmg) mountable natively on macOS
    print(f"Creating native mountable DMG at: {dmg_path}")
    
    file_map = {
        'START.CMD;1': start_studio_content.encode('utf-8'),
        'INSTALL.CMD;1': install_cmd_content.encode('utf-8'),
        'README.TXT;1': readme_content.encode('utf-8'),
        'LAUNCH.SH;1': launch_sh_content.encode('utf-8'),
        'INFO.PLI;1': info_plist_content.encode('utf-8'),
    }

    # Layout sectors
    # 0-15: System area (16 sectors = 32KB)
    # 16: Primary Volume Descriptor (PVD)
    # 17: Terminator
    # 18: Path Table L
    # 19: Path Table M
    # 20: Root directory
    # 21+: File data

    root_dir_sector = 20
    current_sector = 21

    file_sectors = {}
    for fname, fdata in file_map.items():
        file_sectors[fname] = {
            'sector': current_sector,
            'length': len(fdata),
            'data': fdata
        }
        sectors_needed = (len(fdata) + SECTOR_SIZE - 1) // SECTOR_SIZE
        if sectors_needed == 0:
            sectors_needed = 1
        current_sector += sectors_needed

    total_sectors = current_sector + 2 # buffer

    iso = bytearray(total_sectors * SECTOR_SIZE)

    # Sector 16: PVD
    pvd_offset = 16 * SECTOR_SIZE
    pvd = iso[pvd_offset:pvd_offset + SECTOR_SIZE]
    pvd[0] = 1 # Type 1: Primary Volume Descriptor
    pvd[1:6] = b'CD001' # Identifier
    pvd[6] = 1 # Version
    pvd[8:40] = b'NOVEL_VOICE_STUDIO'.ljust(32) # System ID
    pvd[40:72] = b'NOVEL_VOICE_STUDIO'.ljust(32) # Volume ID
    pvd[80:88] = write_both_endian_32(total_sectors)
    pvd[120:124] = write_both_endian_16(1) # Volume set size
    pvd[124:128] = write_both_endian_16(1) # Volume seq number
    pvd[128:132] = write_both_endian_16(SECTOR_SIZE) # Logical block size
    pvd[132:140] = write_both_endian_32(10) # Path table size
    pvd[140:144] = struct.pack('<I', 18) # Type L path table sector
    pvd[148:152] = struct.pack('>I', 19) # Type M path table sector

    # Root Directory Record in PVD (offset 156, length 34)
    root_rec = create_directory_record(root_dir_sector, SECTOR_SIZE, is_dir=True, name=b'\x00')
    pvd[156:156 + len(root_rec)] = root_rec

    pvd[190:318] = b'NOVEL_VOICE_STUDIO'.ljust(128)
    pvd[813:830] = iso_date_now() # Creation date
    pvd[830:847] = iso_date_now() # Modification date
    pvd[881] = 1 # File structure version

    # Sector 17: Volume Descriptor Set Terminator
    term_offset = 17 * SECTOR_SIZE
    iso[term_offset] = 255 # Terminator
    iso[term_offset + 1:term_offset + 6] = b'CD001'
    iso[term_offset + 6] = 1

    # Sector 18: Path Table L
    ptl_offset = 18 * SECTOR_SIZE
    iso[ptl_offset:ptl_offset + 10] = struct.pack('<BBII', 1, 0, root_dir_sector, 1)

    # Sector 19: Path Table M
    ptm_offset = 19 * SECTOR_SIZE
    iso[ptm_offset:ptm_offset + 10] = struct.pack('>BBII', 1, 0, root_dir_sector, 1)

    # Sector 20: Root Directory Data
    rdir_offset = root_dir_sector * SECTOR_SIZE
    dot_rec = create_directory_record(root_dir_sector, SECTOR_SIZE, is_dir=True, name=b'\x00')
    dotdot_rec = create_directory_record(root_dir_sector, SECTOR_SIZE, is_dir=True, name=b'\x01')

    rdir_bytes = bytearray()
    rdir_bytes.extend(dot_rec)
    rdir_bytes.extend(dotdot_rec)

    for fname, finfo in file_sectors.items():
        frec = create_directory_record(finfo['sector'], finfo['length'], is_dir=False, name=fname.encode('ascii'))
        rdir_bytes.extend(frec)

    iso[rdir_offset:rdir_offset + len(rdir_bytes)] = rdir_bytes

    # Write file data
    for fname, finfo in file_sectors.items():
        f_offset = finfo['sector'] * SECTOR_SIZE
        iso[f_offset:f_offset + finfo['length']] = finfo['data']

    with open(dmg_path, 'wb') as f:
        f.write(iso)

    dmg_size_mb = os.path.getsize(dmg_path) / (1024 * 1024)
    zip_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"✓ Successfully built DMG: {dmg_path} ({dmg_size_mb:.2f} MB)")
    print(f"✓ Successfully built ZIP: {zip_path} ({zip_size_mb:.2f} MB)")

if __name__ == '__main__':
    build_dmg_and_zip()
