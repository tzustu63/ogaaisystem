#!/bin/bash
# MCP 獨立部署啟動腳本

set -e

echo "🚀 啟動 MCP 獨立 Docker 部署..."
echo ""

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未運行，請先啟動 Docker"
    exit 1
fi

# 檢查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  端口 $port 已被占用"
        return 1
    fi
    return 0
}

echo "檢查端口可用性..."
PORTS=(25432 26379 29000 29001 23000 23001)
PORT_NAMES=("PostgreSQL" "Redis" "MinIO API" "MinIO Console" "Frontend" "Backend")

for i in "${!PORTS[@]}"; do
    if ! check_port "${PORTS[$i]}"; then
        echo "❌ ${PORT_NAMES[$i]} 端口 ${PORTS[$i]} 不可用"
        exit 1
    fi
done

echo "✅ 所有端口可用"
echo ""

# 啟動服務
echo "建置並啟動服務..."
docker-compose -f docker-compose.mcp.yml up -d --build

echo ""
echo "⏳ 等待服務啟動..."
sleep 5

# 檢查服務狀態
echo ""
echo "📊 服務狀態："
docker-compose -f docker-compose.mcp.yml ps

echo ""
echo "✅ 部署完成！"
echo ""
echo "🌐 服務訪問地址："
echo "  - 前端應用: http://localhost:23000"
echo "  - 後端 API: http://localhost:23001/api"
echo "  - MinIO Console: http://localhost:29001 (帳號: minioadmin, 密碼: minioadmin)"
echo ""
echo "📝 查看日誌: docker-compose -f docker-compose.mcp.yml logs -f"
echo "🛑 停止服務: docker-compose -f docker-compose.mcp.yml down"
