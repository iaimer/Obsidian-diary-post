#!/bin/bash
set -e

PLIST_NAME="com.cloudflare.cloudflared.plist"
PLIST_SRC="$(dirname "$0")/$PLIST_NAME"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "=== 部署 cloudflared 后台服务 ==="

if [ ! -f "$PLIST_SRC" ]; then
    echo "错误：找不到 $PLIST_SRC"
    exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

if launchctl list | grep -q "com.cloudflare.cloudflared"; then
    echo "检测到已有服务在运行，先停止..."
    launchctl unload "$PLIST_DST" 2>/dev/null || true
fi

cp "$PLIST_SRC" "$PLIST_DST"
echo "已安装 plist → $PLIST_DST"

launchctl load "$PLIST_DST"
echo "已加载服务"

sleep 2

if launchctl list | grep -q "com.cloudflare.cloudflared"; then
    echo ""
    echo "✅ cloudflared 后台服务运行中"
    echo ""
    echo "日志查看: tail -f /tmp/cloudflared.log"
    echo "停止服务: launchctl unload $PLIST_DST"
    echo ""
    echo "重启 Mac 后会自动启动，无需干预。"
else
    echo ""
    echo "❌ 服务未成功启动，请检查日志: cat /tmp/cloudflared.log"
    exit 1
fi
