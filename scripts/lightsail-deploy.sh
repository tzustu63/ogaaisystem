#!/bin/bash

# AWS Lightsail 部署腳本
# 使用方式: ./scripts/lightsail-deploy.sh [instance-name]

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
INSTANCE_NAME="${1:-oga-ai-system}"
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/lightsail-key.pem}"
REGION="${AWS_REGION:-ap-northeast-1}"
PROJECT_DIR="/home/ubuntu/oga-ai-system"

echo -e "${BLUE}🚀 部署到 AWS Lightsail...${NC}"
echo ""

# 檢查 AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI 未安裝${NC}"
    exit 1
fi

# 獲取實例 IP
echo -e "${GREEN}📡 獲取實例資訊...${NC}"
INSTANCE_INFO=$(aws lightsail get-instance \
    --instance-name "$INSTANCE_NAME" \
    --region $REGION 2>/dev/null || echo "")

if [ -z "$INSTANCE_INFO" ]; then
    echo -e "${RED}❌ 找不到實例: $INSTANCE_NAME${NC}"
    exit 1
fi

PUBLIC_IP=$(echo "$INSTANCE_INFO" | grep -oP '"publicIpAddress":\s*"\K[^"]+' || echo "")
USERNAME="ubuntu"

if [ -z "$PUBLIC_IP" ]; then
    echo -e "${RED}❌ 無法獲取實例 IP${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 連接到: $PUBLIC_IP${NC}"
echo ""

# 設置 SSH key 權限
chmod 400 "$SSH_KEY_PATH" 2>/dev/null || true

# 準備部署
echo -e "${YELLOW}📦 準備部署檔案...${NC}"
cd "$(dirname "$0")/.."

# 創建部署包（排除 node_modules 等）
echo -e "${YELLOW}📝 創建部署包...${NC}"
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next' \
    --exclude='dist' \
    --exclude='.turbo' \
    --exclude='*.log' \
    -czf /tmp/oga-ai-system-deploy.tar.gz .

# 上傳到伺服器
echo -e "${YELLOW}📤 上傳檔案到伺服器...${NC}"
scp -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    /tmp/oga-ai-system-deploy.tar.gz \
    "$USERNAME@$PUBLIC_IP:/tmp/"

# 在伺服器上執行部署
echo -e "${YELLOW}🔧 在伺服器上執行部署...${NC}"
ssh -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    "$USERNAME@$PUBLIC_IP" << 'ENDSSH'
set -e

PROJECT_DIR="/home/ubuntu/oga-ai-system"

# 創建專案目錄
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 解壓縮
echo "📦 解壓縮檔案..."
tar -xzf /tmp/oga-ai-system-deploy.tar.gz
rm /tmp/oga-ai-system-deploy.tar.gz

# 檢查 Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 安裝 Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
fi

# 檢查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 安裝 Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 安裝依賴（如果需要）
if [ -f "package.json" ]; then
    echo "📦 安裝依賴..."
    npm install --production || true
fi

# 啟動服務
echo "🚀 啟動 Docker 服務..."
docker-compose down 2>/dev/null || true
docker-compose up -d --build

echo "✅ 部署完成！"
echo ""
echo "服務狀態："
docker-compose ps

echo ""
echo "🌐 訪問地址："
echo "  • 前端: http://$PUBLIC_IP:13000"
echo "  • 後端 API: http://$PUBLIC_IP:13001/api"
ENDSSH

# 清理本地臨時檔案
rm -f /tmp/oga-ai-system-deploy.tar.gz

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo -e "${BLUE}🌐 訪問地址：${NC}"
echo "  • 前端: http://$PUBLIC_IP:13000"
echo "  • 後端 API: http://$PUBLIC_IP:13001/api"
echo ""
echo -e "${YELLOW}💡 提示：${NC}"
echo "  1. 確保 Lightsail 防火牆規則允許端口 13000 和 13001"
echo "  2. 查看日誌: ssh -i $SSH_KEY_PATH $USERNAME@$PUBLIC_IP 'cd $PROJECT_DIR && docker-compose logs -f'"


