# 文檔索引

本文檔提供專案所有文檔的完整索引和分類。

## 📚 文檔結構

```
docs/
├── README.md                    # 文檔目錄說明（本文件）
├── DOCUMENTATION_INDEX.md       # 完整文檔索引（本文件）
├── core/                        # 核心文檔
│   ├── README.md
│   ├── PRD.md                   # 產品需求文件
│   └── AGENTS.md                # 開發規範
├── development/                 # 開發文檔
│   ├── README.md
│   ├── IMPLEMENTATION_SUMMARY.md      # 實作總結
│   ├── IMPLEMENTATION_STATUS.md      # 實作狀態
│   ├── COMPLETION_SUMMARY.md          # 完成總結
│   ├── COMPLETED_FEATURES.md          # 已完成功能
│   ├── FUNCTIONALITY_CHECK_REPORT.md  # 功能檢查報告
│   ├── MISSING_FEATURES_REPORT.md     # 缺失功能報告
│   └── TESTING_GUIDE.md               # 測試指南
└── deployment/                  # 部署文檔
    ├── README.md
    ├── DOCKER_DEPLOYMENT.md           # Docker 部署詳細說明
    ├── DEPLOYMENT_README.md            # 部署說明
    ├── DEPLOYMENT_STATUS.md            # 部署狀態
    ├── DEPLOYMENT_SUCCESS.md           # 部署成功說明
    ├── DEPLOYMENT_FINAL_STATUS.md      # 最終部署狀態
    ├── DEPLOYMENT_SUMMARY.md           # 部署總結
    ├── QUICK_START.md                  # 快速開始
    └── MIGRATION_INSTRUCTIONS.md       # 資料庫遷移說明
```

## 📖 文檔分類說明

### 1. 核心文檔 (`docs/core/`)

專案的核心文檔，包括專案概述、需求文件和開發規範。

| 文件 | 說明 | 優先級 |
|------|------|--------|
| `PRD.md` | 產品需求文件，包含所有功能需求 | ⭐⭐⭐ |
| `AGENTS.md` | 開發規範和 OpenSpec 使用說明 | ⭐⭐ |

### 2. 開發文檔 (`docs/development/`)

開發過程中的狀態報告、功能檢查和測試指南。

| 文件 | 說明 | 優先級 |
|------|------|--------|
| `IMPLEMENTATION_SUMMARY.md` | 功能實作總結 | ⭐⭐⭐ |
| `MISSING_FEATURES_REPORT.md` | 缺失功能報告 | ⭐⭐⭐ |
| `TESTING_GUIDE.md` | 測試指南 | ⭐⭐ |
| `IMPLEMENTATION_STATUS.md` | 實作狀態追蹤 | ⭐⭐ |
| `COMPLETION_SUMMARY.md` | 完成總結 | ⭐ |
| `COMPLETED_FEATURES.md` | 已完成功能清單 | ⭐ |
| `FUNCTIONALITY_CHECK_REPORT.md` | 功能檢查報告 | ⭐ |

### 3. 部署文檔 (`docs/deployment/`)

系統部署相關的所有文檔。

| 文件 | 說明 | 優先級 |
|------|------|--------|
| `DOCKER_DEPLOYMENT.md` | Docker 部署詳細說明 | ⭐⭐⭐ |
| `QUICK_START.md` | 快速開始指南 | ⭐⭐⭐ |
| `MIGRATION_INSTRUCTIONS.md` | 資料庫遷移說明 | ⭐⭐ |
| `DEPLOYMENT_README.md` | 部署總結 | ⭐⭐ |
| `DEPLOYMENT_SUMMARY.md` | 部署狀態總結 | ⭐ |
| `DEPLOYMENT_FINAL_STATUS.md` | 最終部署狀態 | ⭐ |
| `DEPLOYMENT_SUCCESS.md` | 部署成功說明 | ⭐ |
| `DEPLOYMENT_STATUS.md` | 部署狀態 | ⭐ |

## 🎯 快速導航

### 新手上路
1. 閱讀 [README.md](../README.md) 了解專案
2. 查看 [PRD.md](core/PRD.md) 了解需求
3. 參考 [QUICK_START.md](deployment/QUICK_START.md) 開始部署

### 開發者
1. 查看 [IMPLEMENTATION_SUMMARY.md](development/IMPLEMENTATION_SUMMARY.md) 了解實作狀態
2. 參考 [MISSING_FEATURES_REPORT.md](development/MISSING_FEATURES_REPORT.md) 了解待開發功能
3. 使用 [TESTING_GUIDE.md](development/TESTING_GUIDE.md) 進行測試

### 部署人員
1. 閱讀 [DOCKER_DEPLOYMENT.md](deployment/DOCKER_DEPLOYMENT.md) 了解部署流程
2. 參考 [MIGRATION_INSTRUCTIONS.md](deployment/MIGRATION_INSTRUCTIONS.md) 執行資料庫遷移
3. 查看 [DEPLOYMENT_SUMMARY.md](deployment/DEPLOYMENT_SUMMARY.md) 了解當前狀態

## 📝 文檔維護指南

### 何時更新文檔
- 新增功能時：更新 `IMPLEMENTATION_SUMMARY.md`
- 發現缺失功能：更新 `MISSING_FEATURES_REPORT.md`
- 部署變更時：更新相關部署文檔
- 測試流程變更：更新 `TESTING_GUIDE.md`

### 文檔命名規範
- 使用大寫字母和底線：`UPPER_CASE.md`
- 描述性命名：清楚表達文檔內容
- 避免重複：合併相似內容的文檔

### 文檔結構建議
每個文檔應包含：
1. 標題和簡介
2. 目錄（長文檔）
3. 主要內容
4. 相關連結
5. 更新日期

## 🔗 相關資源

- [專案 README](../README.md)
- [OpenSpec 規格](../openspec/)
- [Docker Compose](../docker-compose.yml)

