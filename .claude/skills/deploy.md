# /deploy - 部署流程

OGA AI System 的完整部署流程，包含本機測試和生產環境部署。

## 部署流程概覽

```
程式碼修改 → 本機 Docker 測試 → 推送 GitHub → Lightsail 自動部署
```

---

## 第一步：本機 Docker Desktop 測試

### 1.1 啟動本機服務

```bash
# 使用預設的 docker-compose.yml（本機開發用）
docker-compose up -d --build

# 或僅啟動基礎服務（PostgreSQL, Redis, MinIO）
docker-compose -f docker-compose.dev.yml up -d
```

### 1.2 檢查服務狀態

```bash
docker-compose ps
docker-compose logs -f
```

### 1.3 測試應用程式

- 前端：http://localhost:13000
- 後端：http://localhost:13001/api
- MinIO Console：http://localhost:19001

### 1.4 停止服務

```bash
docker-compose down
```

---

## 第二步：推送到 GitHub

```bash
# 檢查變更
git status
git diff

# 提交變更
git add .
git commit -m "feat: 功能描述"

# 推送到 main 分支
git push origin main
```

---

## 第三步：Lightsail 自動部署

### 首次部署設定

SSH 連線到 Lightsail：

```bash
ssh -i lightsail.pem ubuntu@18.181.71.46
```

在伺服器上執行：

```bash
# 克隆專案
git clone git@github.com:tzustu63/ogaaisystem.git /home/ubuntu/oga-ai-system
cd /home/ubuntu/oga-ai-system

# 設定環境變數
cp .env.example .env
nano .env  # 填入實際值

# 首次部署
./scripts/deploy-prod.sh
```

### 後續更新部署

在伺服器上執行：

```bash
cd /home/ubuntu/oga-ai-system
./scripts/deploy-prod.sh
```

或從本機遠端執行：

```bash
ssh -i lightsail.pem ubuntu@18.181.71.46 'cd /home/ubuntu/oga-ai-system && ./scripts/deploy-prod.sh'
```

---

## 環境差異對照

| 項目 | 本機 (docker-compose.yml) | 生產 (docker-compose.prod.yml) |
|------|---------------------------|-------------------------------|
| 前端 URL | http://localhost:13000 | http://18.181.71.46:13000 |
| 後端 URL | http://localhost:13001/api | http://18.181.71.46:13001/api |
| PostgreSQL | localhost:15432 | 內部:15437 |
| Redis | localhost:16379 | 內部:16383 |
| MinIO | localhost:19000 | 內部:19000 |
| API_URL 變數 | http://localhost:13001/api | http://18.181.71.46:13001/api |

---

## 伺服器資訊

| 項目 | 值 |
|------|-----|
| IP | 18.181.71.46 |
| 域名 | harvestwize.com |
| SSH 金鑰 | `lightsail.pem`（專案根目錄） |
| 用戶 | ubuntu |
| 專案路徑 | /home/ubuntu/oga-ai-system |

---

## 服務端口（生產環境）

| 服務 | 外部端口 | 內部端口 |
|------|---------|---------|
| 前端 (Next.js) | 13000 | 3000 |
| 後端 (Express) | 13001 | 3001 |
| PostgreSQL | 15437 | 5432 |
| Redis | 16383 | 6379 |
| MinIO API | 19000 | 9000 |
| MinIO Console | 19001 | 9001 |

---

## 故障排除

### 查看日誌

```bash
# 本機
docker-compose logs -f backend
docker-compose logs -f frontend

# 生產環境
ssh -i lightsail.pem ubuntu@18.181.71.46 'cd /home/ubuntu/oga-ai-system && docker-compose -f docker-compose.prod.yml logs -f'
```

### 重啟服務

```bash
# 本機
docker-compose restart

# 生產環境
ssh -i lightsail.pem ubuntu@18.181.71.46 'cd /home/ubuntu/oga-ai-system && docker-compose -f docker-compose.prod.yml restart'
```

### 完全重建

```bash
# 本機
docker-compose down
docker-compose up -d --build --force-recreate

# 生產環境
ssh -i lightsail.pem ubuntu@18.181.71.46 'cd /home/ubuntu/oga-ai-system && docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d --build'
```

---

## 環境變數設定

生產環境必須設定的變數（在 `.env` 檔案中）：

```bash
# 必填
JWT_SECRET=<使用 node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 生成>
GOOGLE_AI_API_KEY=<從 Google Cloud Console 取得>

# 可選（有預設值）
DB_PASSWORD=postgres
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
API_URL=http://18.181.71.46:13001/api
```
