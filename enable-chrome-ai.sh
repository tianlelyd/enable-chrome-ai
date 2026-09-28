#!/bin/bash

# Enable Chrome AI - 全平台通用版本 (支持 Windows & macOS)
# 自动检测操作系统并修改 Chrome 配置文件

echo "=========================================="
echo "     Enable Chrome AI - 自动配置工具"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查当前是否在 Windows 环境 (Git Bash / MINGW / MSYS / WSL)
if [[ "$OSTYPE" == "msys"* || "$OSTYPE" == "cygwin"* || "$OSTYPE" == "win32"* || -n "$LOCALAPPDATA" ]]; then
    echo "[INFO] 检测到 Windows 系统环境"
    
    # 优先使用 node 运行全功能修复脚本
    if command -v node &> /dev/null; then
        echo "[INFO] 正在调用 Node.js 执行全自动修复..."
        node "$SCRIPT_DIR/apply_all_flags.js"
    else
        echo "[INFO] 正在调用 PowerShell 执行配置..."
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_DIR/enable-chrome-ai.ps1"
    fi
else
    # macOS / Linux 逻辑
    echo "[INFO] 检测到 macOS/Linux 系统环境"
    if command -v node &> /dev/null; then
        node "$SCRIPT_DIR/enable-chrome-ai-win.js"
    else
        echo "[ERROR] 未检测到 Node.js，请安装 Node 后运行。"
    fi
fi

echo ""
echo "=========================================="
echo "操作已完成！请按任意键退出..."
echo "=========================================="
read -n 1 -s -r -p "按回车键或任意键关闭窗口..."
echo ""
