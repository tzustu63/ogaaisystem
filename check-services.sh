#!/bin/bash

set -euo pipefail

if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker daemon 沒有啟動（無法連線到 docker.sock）"
  echo "請先啟動 Docker Desktop，或執行：open -a Docker"
  exit 1
fi

echo "🔍 檢查 Docker 服務狀態..."
echo ""

# 檢查端口佔用
echo "📌 檢查端口佔用:"
if lsof -ti:13001 > /dev/null 2>&1; then
    echo "  ⚠️  端口 13001 被佔用:"
    lsof -ti:13001 | xargs ps -p
    echo "  建議: 執行 'lsof -ti:13001 | xargs kill -9' 釋放端口"
else
    echo "  ✅ 端口 13001 可用"
fi

if lsof -ti:13000 > /dev/null 2>&1; then
    echo "  ⚠️  端口 13000 被佔用:"
    lsof -ti:13000 | xargs ps -p
    echo "  建議: 執行 'lsof -ti:13000 | xargs kill -9' 釋放端口"
else
    echo "  ✅ 端口 13000 可用"
fi

echo ""
echo "📦 檢查容器狀態:"
docker-compose ps

echo ""
echo "📋 檢查 Backend 日誌（最後 20 行）:"
docker logs --tail=20 oga-backend 2>&1 || echo "  ⚠️  無法讀取 Backend 日誌"

echo ""
echo "📋 檢查 Frontend 日誌（最後 20 行）:"
docker logs --tail=20 oga-frontend 2>&1 || echo "  ⚠️  無法讀取 Frontend 日誌"

echo ""
echo "🌐 檢查網路連接:"
if docker exec oga-backend ping -c 1 postgres > /dev/null 2>&1; then
    echo "  ✅ Backend 可以連接到 Postgres"
else
    echo "  ⚠️  Backend 無法連接到 Postgres"
fi

echo ""
echo "💡 建議操作:"
echo "  1. 在 Docker Desktop 中點擊 oga-backend 的播放按鈕"
echo "  2. 查看日誌找出具體錯誤"
echo "  3. 如果端口被佔用，先釋放端口"
echo "  4. 執行: docker-compose restart backend frontend"

