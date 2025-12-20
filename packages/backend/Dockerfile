# Backend Dockerfile
FROM node:18-alpine AS base

# 安裝必要的系統依賴
RUN apk add --no-cache \
    postgresql-client \
    curl \
    bash

# 設定工作目錄
WORKDIR /app

# 複製根目錄的 package 檔案（用於 workspace 管理）
COPY package*.json ./
COPY turbo.json ./

# 複製後端 package 檔案
COPY packages/backend/package*.json ./packages/backend/

# 安裝所有依賴（包括 workspace 依賴）
RUN npm ci

# 複製後端原始碼
COPY packages/backend ./packages/backend

# 建置後端
WORKDIR /app/packages/backend
RUN npm run build

# 生產環境映像
FROM node:18-alpine

# 安裝 PostgreSQL 客戶端工具（用於健康檢查和遷移）
RUN apk add --no-cache postgresql-client bash

WORKDIR /app

# 複製根目錄的 package 檔案（用於 workspace）
COPY --from=base /app/package*.json ./
COPY --from=base /app/turbo.json ./

# 複製後端相關檔案
COPY --from=base /app/packages/backend/package*.json ./packages/backend/
COPY --from=base /app/packages/backend/dist ./packages/backend/dist
COPY --from=base /app/packages/backend/src ./packages/backend/src

# 複製 node_modules（從 base 階段）
COPY --from=base /app/node_modules ./node_modules

# 安裝生產依賴和開發工具（tsx 用於遷移）
WORKDIR /app/packages/backend
RUN npm ci --only=production && \
    npm install --save-dev tsx

# 設定工作目錄回到後端目錄
WORKDIR /app/packages/backend

# 暴露端口
EXPOSE 3001

# 啟動應用
CMD ["npm", "start"]
