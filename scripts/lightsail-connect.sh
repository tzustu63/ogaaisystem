#!/bin/bash

# AWS Lightsail 連接腳本
# 使用方式: ./scripts/lightsail-connect.sh [instance-name]

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置（請根據你的實際情況修改）
INSTANCE_NAME="${1:-oga-ai-system}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$(cd "$(dirname "$0")/.." && pwd)/lightsail.pem}"
REGION="${AWS_REGION:-ap-northeast-1}"  # 東京區域，可改為其他區域

echo -e "${GREEN}🔗 連接到 AWS Lightsail 實例...${NC}"
echo ""

# 檢查 AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI 未安裝${NC}"
    echo "請先安裝: https://aws.amazon.com/cli/"
    exit 1
fi

# 檢查 SSH key
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${YELLOW}⚠️  SSH key 不存在: $SSH_KEY_PATH${NC}"
    echo ""
    echo "請選擇："
    echo "1. 下載 Lightsail 預設 key"
    echo "2. 使用現有 key 路徑"
    echo "3. 退出"
    read -p "請選擇 (1-3): " choice
    
    case $choice in
        1)
            echo "正在下載預設 key..."
            aws lightsail download-default-key-pair --region $REGION 2>/dev/null || {
                echo -e "${RED}❌ 下載失敗，請手動下載或使用現有 key${NC}"
                exit 1
            }
            SSH_KEY_PATH="~/.ssh/lightsail-key.pem"
            ;;
        2)
            read -p "請輸入 SSH key 完整路徑: " SSH_KEY_PATH
            ;;
        3)
            exit 0
            ;;
    esac
fi

# 獲取實例資訊
echo -e "${GREEN}📡 獲取實例資訊...${NC}"
INSTANCE_INFO=$(aws lightsail get-instance \
    --instance-name "$INSTANCE_NAME" \
    --region $REGION 2>/dev/null || echo "")

if [ -z "$INSTANCE_INFO" ]; then
    echo -e "${RED}❌ 找不到實例: $INSTANCE_NAME${NC}"
    echo ""
    echo "可用實例列表："
    aws lightsail get-instances --region $REGION --query 'instances[*].[name,state.name,publicIpAddress]' --output table
    exit 1
fi

# 提取 IP 和用戶名
PUBLIC_IP=$(echo "$INSTANCE_INFO" | grep -oP '"publicIpAddress":\s*"\K[^"]+' || echo "")
USERNAME="ubuntu"  # 預設為 ubuntu，可改為 ec2-user (Amazon Linux)

if [ -z "$PUBLIC_IP" ]; then
    echo -e "${RED}❌ 無法獲取實例 IP 地址${NC}"
    echo "實例可能未啟動或沒有公網 IP"
    exit 1
fi

echo -e "${GREEN}✅ 實例資訊:${NC}"
echo "  名稱: $INSTANCE_NAME"
echo "  IP: $PUBLIC_IP"
echo "  用戶: $USERNAME"
echo "  Key: $SSH_KEY_PATH"
echo ""

# 設置 SSH key 權限
chmod 400 "$SSH_KEY_PATH" 2>/dev/null || true

# 連接
echo -e "${GREEN}🚀 正在連接...${NC}"
ssh -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    "$USERNAME@$PUBLIC_IP"






