#!/bin/bash

# 生產環境部署腳本（在 Lightsail 伺服器上執行）
# 使用方式: ./scripts/deploy-prod.sh

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_DIR="${PROJECT_DIR:-/home/ubuntu/oga-ai-system}"
GITHUB_REPO="${GITHUB_REPO:-git@github.com:tzustu63/ogaaisystem.git}"
BRANCH="${BRANCH:-main}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  OGA AI System 生產環境部署${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 檢查是否為首次部署
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}首次部署，克隆專案...${NC}"
    git clone "$GITHUB_REPO" "$PROJECT_DIR"
    cd "$PROJECT_DIR"

    # 提示設定環境變數
    echo ""
    echo -e "${YELLOW}⚠️  請先設定環境變數！${NC}"
    echo "1. 複製範本：cp .env.example .env"
    echo "2. 編輯檔案：nano .env"
    echo "3. 重新執行此腳本"
    exit 0
fi

cd "$PROJECT_DIR"

# 檢查 .env 檔案
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env 檔案不存在！${NC}"
    echo "請先執行："
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# 拉取最新程式碼
echo -e "${GREEN}📥 拉取最新程式碼...${NC}"
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# 顯示最新提交
echo ""
echo -e "${BLUE}最新提交：${NC}"
git log -1 --oneline
echo ""

# 停止現有服務
echo -e "${YELLOW}⏹️  停止現有服務...${NC}"
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 清理舊的映像（可選）
read -p "是否清理舊的 Docker 映像？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 清理舊映像...${NC}"
    docker system prune -f
fi

# 建置並啟動服務
echo -e "${GREEN}🔨 建置服務...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

echo -e "${GREEN}🚀 啟動服務...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# 等待服務啟動
echo -e "${YELLOW}⏳ 等待服務啟動...${NC}"
sleep 10

# 顯示服務狀態
echo ""
echo -e "${GREEN}📊 服務狀態：${NC}"
docker-compose -f docker-compose.prod.yml ps

# 健康檢查
echo ""
echo -e "${BLUE}🔍 健康檢查：${NC}"

# 檢查後端
if curl -s -o /dev/null -w "%{http_code}" http://localhost:13001/api/health 2>/dev/null | grep -q "200\|404"; then
    echo -e "  後端 API: ${GREEN}✅ 運行中${NC}"
else
    echo -e "  後端 API: ${YELLOW}⚠️  啟動中...${NC}"
fi

# 檢查前端
if curl -s -o /dev/null -w "%{http_code}" http://localhost:13000 2>/dev/null | grep -q "200"; then
    echo -e "  前端應用: ${GREEN}✅ 運行中${NC}"
else
    echo -e "  前端應用: ${YELLOW}⚠️  啟動中...${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "前端：http://18.181.71.46:13000"
echo -e "後端：http://18.181.71.46:13001/api"
echo ""
echo -e "${YELLOW}查看日誌：${NC}"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
