#!/bin/bash

set -euo pipefail

if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker daemon 沒有啟動（無法連線到 docker.sock）"
    echo "請先啟動 Docker Desktop，或執行：open -a Docker"
    exit 1
fi

echo "🚀 啟動 Docker 服務..."
echo ""

# 檢查端口
echo "📌 檢查端口..."
if lsof -ti:13001 > /dev/null 2>&1; then
    echo "  ⚠️  端口 13001 被佔用，正在釋放..."
    lsof -ti:13001 | xargs kill -9 2>/dev/null
    sleep 1
fi

if lsof -ti:13000 > /dev/null 2>&1; then
    echo "  ⚠️  端口 13000 被佔用，正在釋放..."
    lsof -ti:13000 | xargs kill -9 2>/dev/null
    sleep 1
fi

echo "  ✅ 端口檢查完成"
echo ""

# 啟動基礎服務
echo "📦 啟動基礎服務..."
docker-compose up -d postgres redis minio

# 等待基礎服務就緒
echo "⏳ 等待基礎服務就緒（10秒）..."
sleep 10

# 啟動 Backend
echo "🔧 啟動 Backend..."
docker-compose up -d backend

# 等待 Backend 啟動
echo "⏳ 等待 Backend 啟動（5秒）..."
sleep 5

# 啟動 Frontend
echo "🎨 啟動 Frontend..."
docker-compose up -d frontend

# 顯示狀態
echo ""
echo "📊 服務狀態:"
docker-compose ps

echo ""
echo "✅ 啟動完成！"
echo ""
echo "🌐 訪問地址:"
echo "  • 前端: http://localhost:13000"
echo "  • 後端 API: http://localhost:13001/api"
echo "  • MinIO Console: http://localhost:19001"
echo ""
echo "📋 查看日誌:"
echo "  docker-compose logs -f backend"

