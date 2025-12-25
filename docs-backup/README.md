# 高等教育國際化策略執行管理系統

## 專案概述

本系統為高等教育機構打造的三層式策略執行管理平台，整合平衡計分卡(BSC)、目標與關鍵結果(OKR)、責任分配矩陣(RACI)、看板管理(Kanban)及PDCA循環，實現從教育部政策到日常執行的完整追蹤與治理。

## 技術棧

- **前端**: Next.js 14 + React + TypeScript + Tailwind CSS
- **後端**: Node.js + Express + TypeScript
- **資料庫**: PostgreSQL
- **快取**: Redis
- **檔案儲存**: MinIO (可替換為 S3)
- **圖表**: ECharts

## 專案結構

```
.
├── packages/
│   ├── frontend/          # 前端應用
│   ├── backend/           # 後端 API
│   └── shared/            # 共享程式碼
├── docs/                  # 專案文檔（已分類整理）
│   ├── core/              # 核心文檔（PRD、規範）
│   ├── development/       # 開發文檔（實作狀態、測試）
│   └── deployment/        # 部署文檔（Docker、遷移）
└── openspec/              # OpenSpec 規格文件
```

## 快速開始

### 前置需求

- Node.js 18+
- PostgreSQL 14+
- Redis (選配)
- MinIO (選配)

### 安裝依賴

```bash
npm install
```

### 設定環境變數

複製 `.env.example` 並設定環境變數：

```bash
cp .env.example .env
```

### 初始化資料庫

```bash
# 建立資料庫
createdb oga_ai_system

# 執行遷移
psql -d oga_ai_system -f packages/backend/src/db/migrations/001_initial_schema.sql
```

### 啟動開發伺服器

```bash
# 啟動所有服務
npm run dev

# 或分別啟動
cd packages/backend && npm run dev
cd packages/frontend && npm run dev
```

## 核心模組

1. **KPI 管理** - 指標字典與治理中樞
2. **戰略地圖與儀表板** - BSC 四構面管理
3. **策略專案與 OKR 管理** - Initiative 與 OKR 生命週期
4. **RACI 權責矩陣與工作流引擎** - 可執行工作流
5. **Kanban 任務管理** - 戰略對齊的任務管理
6. **緊急事件管理** - Incident 處理與追蹤
7. **PDCA 循環與改善追蹤** - 持續改善機制
8. **數據整合與來源管理** - 檔案匯入與系統對接
9. **權限管理與個資合規** - RBAC + Scope 權限模型
10. **UI/UX 與導覽設計** - 三層一條線導覽

## 開發規範

本專案使用 OpenSpec 進行規格驅動開發。詳細規範請參考 `openspec/AGENTS.md`。

## API 文件

API 端點文件將在開發過程中逐步完善。

## 授權

[授權資訊]

