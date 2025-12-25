# 文檔導覽中心

歡迎來到 OGA AI System 文檔中心！本文檔提供完整的專案文檔導覽。

## 🚀 快速開始

**第一次使用？** 請按順序閱讀：

1. 📖 [專案概述](../README.md) - 了解專案背景和技術棧
2. ⚡ [快速開始](05-deployment/QUICK_START.md) - 5 分鐘快速部署
3. 🔐 [認證設置](01-getting-started/AUTHENTICATION.md) - 配置認證系統
4. 📋 [產品需求文件](02-core/PRD.md) - 深入了解系統功能

## 📁 文檔分類

### 01. 新手入門 ([01-getting-started/](01-getting-started/))
快速開始使用系統的必備資訊
- ⚡ [快速開始](05-deployment/QUICK_START.md)
- 🔐 [認證設置](01-getting-started/AUTHENTICATION.md)

### 02. 核心文檔 ([02-core/](02-core/))
專案的核心需求、架構和規範
- 📋 [產品需求文件 (PRD)](02-core/PRD.md)
- 🏗️ [系統架構](02-core/PRD.md#系統架構)
- 📐 [開發規範](02-core/AGENTS.md)

### 03. 功能說明 ([03-features/](03-features/))
各項功能的詳細說明文檔
- 🎯 [OKR-KPI 整合](03-features/OKR_KPI_INTEGRATION.md)
- 📊 [其他功能模組](03-features/README.md)

### 04. 開發文檔 ([04-development/](04-development/))
開發過程中的狀態、測試和優化指南
- ✅ [實作總結](04-development/IMPLEMENTATION_SUMMARY.md)
- 📝 [已完成功能](04-development/COMPLETED_FEATURES.md)
- ⚠️ [缺失功能報告](04-development/MISSING_FEATURES_REPORT.md)
- 🔧 [程式碼優化建議](04-development/CODE_OPTIMIZATION_REPORT.md)
- 🧪 [測試指南](04-development/TESTING_GUIDE.md)
- 📅 [變更日誌](04-development/CHANGELOG.md)

### 05. 部署文檔 ([05-deployment/](05-deployment/))
系統部署、遷移和故障排除
- 🐳 [Docker 部署指南](05-deployment/DOCKER_DEPLOYMENT.md)
- ⚡ [快速開始](05-deployment/QUICK_START.md)
- ☁️ [AWS Lightsail 部署](05-deployment/LIGHTSAIL_DEPLOYMENT.md)
- 🔌 [MCP 伺服器部署](05-deployment/MCP_DEPLOYMENT.md)
- 🔄 [資料庫遷移](05-deployment/MIGRATION_INSTRUCTIONS.md)
- 🔧 [故障排除](05-deployment/TROUBLESHOOTING.md)

### 06. 操作指南 ([06-guides/](06-guides/))
日常開發和維護的操作指南
- 🌿 [Git 工作流程](06-guides/GIT_WORKFLOW.md)
- 📖 [更多指南](06-guides/README.md)

### 07. API 文檔 ([07-api/](07-api/))
API 參考文檔（規劃中）
- 📚 [API 參考](07-api/README.md)

### 📦 歷史歸檔 ([archive/](archive/))
歷史文檔和狀態報告歸檔
- 📜 [歸檔說明](archive/README.md)

## 🎯 依使用情境查找

### 我想...

#### 🆕 **開始使用系統**
→ [快速開始](05-deployment/QUICK_START.md) → [認證設置](01-getting-started/AUTHENTICATION.md)

#### 💻 **開發新功能**
→ [PRD 文檔](02-core/PRD.md) → [開發規範](02-core/AGENTS.md) → [測試指南](04-development/TESTING_GUIDE.md)

#### 🚀 **部署到生產環境**
→ [Docker 部署](05-deployment/DOCKER_DEPLOYMENT.md) → [遷移指南](05-deployment/MIGRATION_INSTRUCTIONS.md)

#### 🔍 **了解系統功能**
→ [PRD 文檔](02-core/PRD.md) → [已完成功能](04-development/COMPLETED_FEATURES.md) → [功能說明](03-features/README.md)

#### 🐛 **排查問題**
→ [故障排除](05-deployment/TROUBLESHOOTING.md) → [歷史歸檔](archive/README.md)

#### 🔧 **優化程式碼**
→ [程式碼優化建議](04-development/CODE_OPTIMIZATION_REPORT.md) → [開發規範](02-core/AGENTS.md)

#### 📊 **查看開發進度**
→ [實作總結](04-development/IMPLEMENTATION_SUMMARY.md) → [缺失功能報告](04-development/MISSING_FEATURES_REPORT.md)

## 📚 完整文檔索引

詳細的文檔索引請參考：[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

## 🔗 外部資源

- **專案倉庫**: [GitHub Repository]（如有）
- **OpenSpec 規格**: [openspec/](../openspec/)
- **問題追蹤**: GitHub Issues

## 📝 文檔維護

文檔應保持最新，當功能更新時請同步更新相關文檔。

### 貢獻指南
- 遵循 [開發規範](02-core/AGENTS.md)
- 更新 [變更日誌](04-development/CHANGELOG.md)
- 在 PR 中說明文檔變更

### 文檔結構
```
docs/
├── 01-getting-started/    # 新手入門
├── 02-core/               # 核心文檔
├── 03-features/           # 功能說明
├── 04-development/        # 開發文檔
├── 05-deployment/         # 部署文檔
├── 06-guides/             # 操作指南
├── 07-api/                # API 文檔
└── archive/               # 歷史歸檔
```

## 💡 幫助與支援

遇到問題？
1. 查看 [故障排除](05-deployment/TROUBLESHOOTING.md)
2. 搜尋 [歷史文檔](archive/README.md)
3. 提交 Issue（如有 GitHub 倉庫）

---

**最後更新**: 2025-12-25
**文檔版本**: 2.0（重新組織後）
