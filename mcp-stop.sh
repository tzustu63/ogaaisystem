#!/bin/bash
# MCP 獨立部署停止腳本

echo "🛑 停止 MCP Docker 服務..."

docker-compose -f docker-compose.mcp.yml down

echo ""
echo "✅ 服務已停止"
echo ""
echo "💡 如需刪除所有資料（包括資料庫），請執行："
echo "   docker-compose -f docker-compose.mcp.yml down -v"
