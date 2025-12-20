# Frontend Dockerfile
FROM node:18-alpine AS base

# 設定工作目錄
WORKDIR /app

# 複製根目錄的 package 檔案（用於 workspace 管理）
COPY package*.json ./
COPY turbo.json ./

# 複製前端 package 檔案
COPY packages/frontend/package*.json ./packages/frontend/

# 安裝所有依賴（包括 workspace 依賴）
RUN npm ci

# 複製前端原始碼
COPY packages/frontend ./packages/frontend

# 建置前端
WORKDIR /app/packages/frontend
# 設定 Next.js 建置環境變數
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 生產環境映像
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 複製根目錄的 package 檔案
COPY --from=base /app/package*.json ./
COPY --from=base /app/turbo.json ./

# 複製前端相關檔案
COPY --from=base /app/packages/frontend/package*.json ./packages/frontend/
COPY --from=base /app/packages/frontend/.next ./packages/frontend/.next
COPY --from=base /app/packages/frontend/next.config.js ./packages/frontend/

# 確保 public 目錄存在並複製（如果存在）
RUN mkdir -p ./packages/frontend/public
COPY --from=base /app/packages/frontend/public ./packages/frontend/public/

# 複製必要的 node_modules（僅生產依賴）
COPY --from=base /app/node_modules ./node_modules

# 設定工作目錄
WORKDIR /app/packages/frontend

# 暴露端口
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 啟動應用
CMD ["npm", "start"]
