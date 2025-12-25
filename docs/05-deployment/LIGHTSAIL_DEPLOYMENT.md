# AWS Lightsail 部署指南

## 前置需求

1. **AWS 帳號** 和 Lightsail 實例
2. **AWS CLI** 已安裝並配置
3. **SSH Key** 用於連接 Lightsail 實例

## 快速開始

### 1. 安裝 AWS CLI（如果尚未安裝）

```bash
# macOS
brew install awscli

# 或使用 pip
pip install awscli
```

### 2. 配置 AWS CLI

```bash
aws configure
```

輸入：
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `ap-northeast-1` (或其他區域)
- Default output format: `json`

### 3. 創建 Lightsail 實例

#### 方法 1: 使用 AWS Console
1. 登入 AWS Console
2. 進入 Lightsail
3. 創建新實例
4. 選擇 **Ubuntu 22.04 LTS**
5. 選擇實例方案（建議至少 2GB RAM）
6. 命名實例（例如：`oga-ai-system`）

#### 方法 2: 使用 AWS CLI

```bash
# 創建實例
aws lightsail create-instances \
    --instance-names oga-ai-system \
    --availability-zone ap-northeast-1a \
    --blueprint-id ubuntu_22_04 \
    --bundle-id nano_2_0 \
    --region ap-northeast-1

# 開啟必要端口
aws lightsail open-instance-public-ports \
    --instance-name oga-ai-system \
    --port-info fromPort=13000,toPort=13001,protocol=tcp \
    --region ap-northeast-1

aws lightsail open-instance-public-ports \
    --instance-name oga-ai-system \
    --port-info fromPort=22,toPort=22,protocol=tcp \
    --region ap-northeast-1
```

### 4. 下載 SSH Key

```bash
# 下載預設 key
aws lightsail download-default-key-pair \
    --region ap-northeast-1

# 設置權限
chmod 400 ~/.ssh/lightsail-key.pem
```

## 部署步驟

### 方法 1: 使用自動部署腳本（推薦）

```bash
# 設置 SSH key 路徑（如果需要）
export SSH_KEY_PATH=~/.ssh/lightsail-key.pem

# 執行部署
./scripts/lightsail-deploy.sh oga-ai-system
```

### 方法 2: 手動部署

#### 步驟 1: 連接伺服器

```bash
# 獲取實例 IP
INSTANCE_IP=$(aws lightsail get-instance \
    --instance-name oga-ai-system \
    --region ap-northeast-1 \
    --query 'instance.publicIpAddress' \
    --output text)

# 連接
ssh -i ~/.ssh/lightsail-key.pem ubuntu@$INSTANCE_IP
```

#### 步驟 2: 在伺服器上安裝依賴

```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# 安裝 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 安裝 Git
sudo apt install -y git

# 登出並重新登入以應用 docker 群組變更
exit
```

#### 步驟 3: 克隆專案

```bash
# 重新連接
ssh -i ~/.ssh/lightsail-key.pem ubuntu@$INSTANCE_IP

# 克隆專案
git clone git@github.com:tzustu63/ogaaisystem.git oga-ai-system
cd oga-ai-system
```

#### 步驟 4: 配置環境變數

```bash
# 創建 .env 檔案（如果需要）
nano .env
```

#### 步驟 5: 啟動服務

```bash
# 啟動所有服務
docker-compose up -d --build

# 查看狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

## 連接腳本

使用提供的連接腳本快速連接：

```bash
# 使用預設實例名稱
./scripts/lightsail-connect.sh

# 或指定實例名稱
./scripts/lightsail-connect.sh my-instance-name
```

## 防火牆配置

確保 Lightsail 防火牆規則允許以下端口：

- **22** (SSH)
- **13000** (Frontend)
- **13001** (Backend API)
- **19001** (MinIO Console，可選)

在 AWS Console 中：
1. 進入 Lightsail
2. 選擇你的實例
3. 點擊 **Networking** 標籤
4. 添加防火牆規則

或使用 CLI：

```bash
# 開啟前端端口
aws lightsail open-instance-public-ports \
    --instance-name oga-ai-system \
    --port-info fromPort=13000,toPort=13000,protocol=tcp \
    --region ap-northeast-1

# 開啟後端端口
aws lightsail open-instance-public-ports \
    --instance-name oga-ai-system \
    --port-info fromPort=13001,toPort=13001,protocol=tcp \
    --region ap-northeast-1
```

## 常用操作

### 查看服務狀態

```bash
ssh -i ~/.ssh/lightsail-key.pem ubuntu@$INSTANCE_IP \
    "cd oga-ai-system && docker-compose ps"
```

### 查看日誌

```bash
ssh -i ~/.ssh/lightsail-key.pem ubuntu@$INSTANCE_IP \
    "cd oga-ai-system && docker-compose logs -f backend"
```

### 重啟服務

```bash
ssh -i ~/.ssh/lightsail-key.pem ubuntu@$INSTANCE_IP \
    "cd oga-ai-system && docker-compose restart"
```

### 更新代碼

```bash
# 在伺服器上
cd oga-ai-system
git pull origin main
docker-compose up -d --build
```

## 故障排除

### 無法連接 SSH

1. 檢查實例狀態是否為 `running`
2. 確認 SSH key 路徑正確
3. 檢查防火牆規則是否允許端口 22

### 服務無法啟動

```bash
# 查看詳細日誌
docker-compose logs backend
docker-compose logs frontend

# 檢查端口是否被佔用
sudo netstat -tulpn | grep -E '13000|13001'
```

### 資料庫連接失敗

```bash
# 檢查資料庫容器
docker-compose ps postgres
docker-compose logs postgres

# 進入資料庫容器
docker exec -it oga-postgres psql -U postgres -d oga_ai_system
```

## 安全建議

1. **使用環境變數**：不要在代碼中硬編碼敏感資訊
2. **定期更新**：保持系統和 Docker 映像更新
3. **備份資料**：定期備份資料庫和重要檔案
4. **限制訪問**：使用防火牆限制不必要的端口
5. **使用 HTTPS**：生產環境建議使用 Nginx 反向代理並配置 SSL

## 成本優化

- 使用 Lightsail 的固定價格方案
- 考慮使用較小的實例方案（如果資源足夠）
- 定期檢查未使用的資源

## 下一步

部署完成後，你可以：

1. 配置域名和 SSL 證書
2. 設置自動備份
3. 配置監控和告警
4. 設置 CI/CD 自動部署


