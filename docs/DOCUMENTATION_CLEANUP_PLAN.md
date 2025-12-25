# 文檔整理計劃

**整理日期**: 2025-12-25
**整理範圍**: 所有專案 Markdown 文件

---

## 📊 當前文檔狀況分析

### 發現的問題

1. **根目錄文件混亂** - 有 7 個 MD 文件散落在根目錄
2. **docs/ 目錄結構良好** - 已有基本分類但仍有優化空間
3. **部署文檔重複** - deployment/ 目錄有 12 個文件，內容重複
4. **開發文檔重複** - 多個狀態報告文件內容相似
5. **缺少清晰的導覽** - 文檔之間缺少明確的關聯和導引

---

## 📁 當前文件清單

### 根目錄文件（需整理）

```
/
├── README.md ✅ (保留 - 專案入口)
├── PRD.md ⚠️ (與 docs/core/PRD.md 重複)
├── AUTHENTICATION.md ⚠️ (應移到 docs/guides/)
├── DEPLOYMENT_TROUBLESHOOTING.md ⚠️ (應移到 docs/deployment/)
├── GITHUB_PUSH.md ⚠️ (應移到 docs/guides/)
├── MCP_DEPLOYMENT.md ⚠️ (應移到 docs/deployment/)
├── MCP_FIX.md ⚠️ (應移到 docs/deployment/)
└── QUICK_DEPLOY.md ⚠️ (與 docs/deployment/QUICK_START.md 重複)
```

### docs/ 目錄結構

```
docs/
├── README.md ✅
├── DOCUMENTATION_INDEX.md ✅
├── DOCUMENTATION_ORGANIZATION.md ⚠️ (內容待整合)
├── CHANGELOG.md ✅
├── SUMMARY.md ⚠️ (可能過時)
├── OKR_KPI_INTEGRATION.md ⚠️ (應移到 docs/features/)
├── core/ ✅
│   ├── README.md
│   ├── PRD.md (核心文檔)
│   └── AGENTS.md (開發規範)
├── development/ ⚠️ (內容有重複)
│   ├── README.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── IMPLEMENTATION_STATUS.md ⚠️ (與 SUMMARY 重複)
│   ├── COMPLETION_SUMMARY.md ⚠️ (與 SUMMARY 重複)
│   ├── COMPLETED_FEATURES.md
│   ├── FUNCTIONALITY_CHECK_REPORT.md
│   ├── MISSING_FEATURES_REPORT.md
│   ├── CODE_OPTIMIZATION_REPORT.md ✅
│   └── TESTING_GUIDE.md ✅
└── deployment/ ⚠️ (文件過多且重複)
    ├── README.md
    ├── DOCKER_DEPLOYMENT.md
    ├── DEPLOYMENT_README.md ⚠️ (與 README 重複)
    ├── DEPLOYMENT_STATUS.md ⚠️
    ├── DEPLOYMENT_SUCCESS.md ⚠️
    ├── DEPLOYMENT_FINAL_STATUS.md ⚠️
    ├── DEPLOYMENT_SUMMARY.md ⚠️
    ├── DEPLOYMENT_COMPLETE.md ⚠️
    ├── DOCKER_START_GUIDE.md ⚠️
    ├── START_GUIDE.md ⚠️
    ├── QUICK_START.md
    ├── QUICK_FIX.md ⚠️
    ├── WHY_NOT_STARTING.md ⚠️
    ├── TROUBLESHOOTING.md
    ├── LIGHTSAIL_DEPLOYMENT.md ✅
    └── MIGRATION_INSTRUCTIONS.md ✅
```

### openspec/ 目錄

```
openspec/
├── AGENTS.md ⚠️ (與 docs/core/AGENTS.md 重複)
├── project.md ✅
└── changes/
    └── implement-core-system/ ✅
        ├── design.md
        ├── proposal.md
        ├── tasks.md
        └── specs/ (10 個規格文件) ✅
```

### .cursor/commands/ 目錄

```
.cursor/commands/
├── openspec-apply.md ✅
├── openspec-archive.md ✅
└── openspec-proposal.md ✅
```

---

## 🎯 整理目標

### 原則

1. **單一真相來源** - 每個主題只有一個權威文檔
2. **清晰的層級** - 文檔分類明確，易於查找
3. **避免重複** - 合併或刪除重複內容
4. **保持歷史** - 重要的狀態報告歸檔而不刪除
5. **導覽友善** - 建立清晰的索引和導覽

---

## 📋 建議的新結構

```
oga-ai-system/
├── README.md (專案入口，簡要說明 + 快速連結)
│
├── docs/ (所有文檔集中在這裡)
│   ├── README.md (文檔導覽中心)
│   ├── DOCUMENTATION_INDEX.md (完整索引)
│   │
│   ├── 01-getting-started/ (新手入門)
│   │   ├── README.md
│   │   ├── QUICK_START.md (快速開始)
│   │   ├── INSTALLATION.md (安裝指南)
│   │   └── AUTHENTICATION.md (認證設置)
│   │
│   ├── 02-core/ (核心文檔)
│   │   ├── README.md
│   │   ├── PRD.md (產品需求文件)
│   │   ├── ARCHITECTURE.md (系統架構)
│   │   └── AGENTS.md (開發規範)
│   │
│   ├── 03-features/ (功能說明)
│   │   ├── README.md
│   │   ├── OKR_KPI_INTEGRATION.md
│   │   ├── PDCA_CYCLE.md
│   │   ├── KANBAN_TASKS.md
│   │   └── INCIDENT_MANAGEMENT.md
│   │
│   ├── 04-development/ (開發文檔)
│   │   ├── README.md
│   │   ├── IMPLEMENTATION_SUMMARY.md (實作總結 - 最新)
│   │   ├── COMPLETED_FEATURES.md (已完成功能清單)
│   │   ├── MISSING_FEATURES_REPORT.md (缺失功能報告)
│   │   ├── CODE_OPTIMIZATION_REPORT.md (程式碼優化建議)
│   │   ├── TESTING_GUIDE.md (測試指南)
│   │   └── CHANGELOG.md (變更日誌)
│   │
│   ├── 05-deployment/ (部署文檔)
│   │   ├── README.md
│   │   ├── DOCKER_DEPLOYMENT.md (Docker 部署完整指南)
│   │   ├── LIGHTSAIL_DEPLOYMENT.md (AWS Lightsail 部署)
│   │   ├── MCP_DEPLOYMENT.md (MCP 伺服器部署)
│   │   ├── MIGRATION_GUIDE.md (資料庫遷移指南)
│   │   └── TROUBLESHOOTING.md (故障排除)
│   │
│   ├── 06-guides/ (操作指南)
│   │   ├── README.md
│   │   ├── GIT_WORKFLOW.md (Git 工作流程)
│   │   └── CONTRIBUTION.md (貢獻指南)
│   │
│   ├── 07-api/ (API 文檔 - 未來)
│   │   ├── README.md
│   │   └── API_REFERENCE.md
│   │
│   └── archive/ (歷史文檔歸檔)
│       ├── README.md
│       ├── deployment-history/
│       │   ├── DEPLOYMENT_STATUS_20250101.md
│       │   ├── DEPLOYMENT_SUCCESS_20250115.md
│       │   └── ...
│       └── implementation-history/
│           ├── IMPLEMENTATION_STATUS_20241201.md
│           └── ...
│
├── openspec/ (保持不變)
│   ├── project.md
│   ├── AGENTS.md
│   └── changes/
│
└── .cursor/ (保持不變)
    └── commands/
```

---

## 🔄 文件處理方案

### 需要合併的文件

#### 1. 部署相關 (deployment/)

**合併為 `DOCKER_DEPLOYMENT.md`**:
- ✅ 保留: `DOCKER_DEPLOYMENT.md` (主文檔)
- 🔀 合併: `DOCKER_START_GUIDE.md`, `START_GUIDE.md`, `QUICK_START.md`
- 🔀 合併: `DEPLOYMENT_README.md`

**合併為 `TROUBLESHOOTING.md`**:
- ✅ 保留: `TROUBLESHOOTING.md` (主文檔)
- 🔀 合併: `WHY_NOT_STARTING.md`, `QUICK_FIX.md`
- 🔀 合併: 根目錄的 `DEPLOYMENT_TROUBLESHOOTING.md`, `MCP_FIX.md`

**歸檔 (移到 archive/deployment-history/)**:
- 📦 `DEPLOYMENT_STATUS.md` → `archive/deployment-history/DEPLOYMENT_STATUS_20250120.md`
- 📦 `DEPLOYMENT_SUCCESS.md` → `archive/deployment-history/DEPLOYMENT_SUCCESS_20250122.md`
- 📦 `DEPLOYMENT_FINAL_STATUS.md` → `archive/deployment-history/DEPLOYMENT_FINAL_STATUS_20250125.md`
- 📦 `DEPLOYMENT_SUMMARY.md` → `archive/deployment-history/DEPLOYMENT_SUMMARY_20250125.md`
- 📦 `DEPLOYMENT_COMPLETE.md` → `archive/deployment-history/DEPLOYMENT_COMPLETE_20250125.md`

#### 2. 開發相關 (development/)

**保留主文檔**:
- ✅ `IMPLEMENTATION_SUMMARY.md` (最新且完整的實作總結)
- ✅ `COMPLETED_FEATURES.md` (功能清單)
- ✅ `MISSING_FEATURES_REPORT.md` (缺失功能)
- ✅ `CODE_OPTIMIZATION_REPORT.md` (新增，程式碼優化)
- ✅ `TESTING_GUIDE.md` (測試指南)

**歸檔 (移到 archive/implementation-history/)**:
- 📦 `IMPLEMENTATION_STATUS.md` → `archive/implementation-history/IMPLEMENTATION_STATUS_20241201.md`
- 📦 `COMPLETION_SUMMARY.md` → `archive/implementation-history/COMPLETION_SUMMARY_20241215.md`
- 📦 `FUNCTIONALITY_CHECK_REPORT.md` → `archive/implementation-history/FUNCTIONALITY_CHECK_20241220.md`

#### 3. 根目錄文件

**移動到適當位置**:
- 🚀 `AUTHENTICATION.md` → `docs/01-getting-started/AUTHENTICATION.md`
- 🚀 `GITHUB_PUSH.md` → `docs/06-guides/GIT_WORKFLOW.md`
- 🚀 `MCP_DEPLOYMENT.md` → `docs/05-deployment/MCP_DEPLOYMENT.md`
- 🚀 `QUICK_DEPLOY.md` → 合併到 `docs/01-getting-started/QUICK_START.md`

**刪除重複**:
- 🗑️ `PRD.md` (根目錄) - 已有 `docs/core/PRD.md`
- 🗑️ `DEPLOYMENT_TROUBLESHOOTING.md` - 合併到 `docs/05-deployment/TROUBLESHOOTING.md`
- 🗑️ `MCP_FIX.md` - 合併到 `docs/05-deployment/TROUBLESHOOTING.md`

#### 4. docs/ 根目錄文件

**保留**:
- ✅ `README.md` (文檔導覽中心)
- ✅ `DOCUMENTATION_INDEX.md` (完整索引)
- ✅ `CHANGELOG.md` (移到 development/)

**處理**:
- 🔀 `SUMMARY.md` → 合併到 `README.md` 或刪除（如果過時）
- 🚀 `OKR_KPI_INTEGRATION.md` → `docs/03-features/OKR_KPI_INTEGRATION.md`
- 🗑️ `DOCUMENTATION_ORGANIZATION.md` (本文檔完成後可刪除)

#### 5. openspec/ 目錄

**處理重複**:
- 🗑️ `openspec/AGENTS.md` (與 `docs/core/AGENTS.md` 重複)
  - 比較兩者內容，保留更完整的版本
  - 或在 openspec/AGENTS.md 中添加連結指向 docs/core/AGENTS.md

---

## 🎬 執行步驟

### Phase 1: 準備階段 (30 分鐘)

1. **建立備份**
   ```bash
   mkdir -p docs-backup
   cp -r docs/ docs-backup/
   cp *.md docs-backup/
   ```

2. **建立新目錄結構**
   ```bash
   mkdir -p docs/01-getting-started
   mkdir -p docs/02-core
   mkdir -p docs/03-features
   mkdir -p docs/04-development
   mkdir -p docs/05-deployment
   mkdir -p docs/06-guides
   mkdir -p docs/07-api
   mkdir -p docs/archive/deployment-history
   mkdir -p docs/archive/implementation-history
   ```

### Phase 2: 文件重組 (1-2 小時)

#### 2.1 處理根目錄文件

```bash
# 移動文件
mv AUTHENTICATION.md docs/01-getting-started/
mv MCP_DEPLOYMENT.md docs/05-deployment/
mv GITHUB_PUSH.md docs/06-guides/GIT_WORKFLOW.md

# 刪除重複
rm PRD.md
rm DEPLOYMENT_TROUBLESHOOTING.md
rm MCP_FIX.md
rm QUICK_DEPLOY.md
```

#### 2.2 重組 docs/ 目錄

```bash
# 移動核心文檔 (已存在，無需移動)
# docs/core/ 已經是正確位置

# 建立功能說明目錄並移動文件
mv docs/OKR_KPI_INTEGRATION.md docs/03-features/

# 整理開發文檔
cd docs/development/
mv CHANGELOG.md ../04-development/CHANGELOG.md

# 歸檔舊狀態報告
mv IMPLEMENTATION_STATUS.md ../archive/implementation-history/IMPLEMENTATION_STATUS_20241201.md
mv COMPLETION_SUMMARY.md ../archive/implementation-history/COMPLETION_SUMMARY_20241215.md
mv FUNCTIONALITY_CHECK_REPORT.md ../archive/implementation-history/FUNCTIONALITY_CHECK_20241220.md

# 保留最新的文檔
# IMPLEMENTATION_SUMMARY.md, COMPLETED_FEATURES.md, MISSING_FEATURES_REPORT.md 保持原位
```

#### 2.3 合併部署文檔

```bash
cd docs/deployment/

# 歸檔狀態報告
mv DEPLOYMENT_STATUS.md ../archive/deployment-history/DEPLOYMENT_STATUS_20250120.md
mv DEPLOYMENT_SUCCESS.md ../archive/deployment-history/DEPLOYMENT_SUCCESS_20250122.md
mv DEPLOYMENT_FINAL_STATUS.md ../archive/deployment-history/DEPLOYMENT_FINAL_STATUS_20250125.md
mv DEPLOYMENT_SUMMARY.md ../archive/deployment-history/DEPLOYMENT_SUMMARY_20250125.md
mv DEPLOYMENT_COMPLETE.md ../archive/deployment-history/DEPLOYMENT_COMPLETE_20250125.md

# 刪除重複的指南（內容已合併到主文檔）
rm DEPLOYMENT_README.md
rm DOCKER_START_GUIDE.md
rm START_GUIDE.md
rm QUICK_FIX.md
rm WHY_NOT_STARTING.md

# 保留的文檔:
# - README.md
# - DOCKER_DEPLOYMENT.md (主部署指南)
# - QUICK_START.md (快速開始)
# - TROUBLESHOOTING.md (故障排除)
# - LIGHTSAIL_DEPLOYMENT.md (AWS 部署)
# - MIGRATION_INSTRUCTIONS.md (遷移指南)
```

### Phase 3: 重命名和重新編號 (30 分鐘)

```bash
# 將現有 docs/ 子目錄重命名為編號版本
mv docs/core docs/02-core
mv docs/development docs/04-development
mv docs/deployment docs/05-deployment
```

### Phase 4: 建立索引和導覽文件 (1 小時)

需要建立/更新的文件：
1. 根目錄 `README.md` - 更新文檔結構說明
2. `docs/README.md` - 文檔導覽中心
3. `docs/DOCUMENTATION_INDEX.md` - 完整索引
4. 各子目錄的 `README.md`
5. `docs/archive/README.md` - 歸檔說明

### Phase 5: 更新內部連結 (1 小時)

所有文件中的內部連結需要更新為新路徑。

---

## ✅ 檢查清單

完成後需要確認：

- [ ] 所有根目錄的 MD 文件都已處理（移動/合併/刪除）
- [ ] docs/ 目錄結構清晰且有編號
- [ ] 重複的部署狀態報告已歸檔
- [ ] 重複的開發狀態報告已歸檔
- [ ] 每個目錄都有 README.md 說明
- [ ] 主索引文件已更新
- [ ] 內部連結已更新
- [ ] 備份已建立
- [ ] 測試所有連結可用

---

## 📊 預期成果

### 整理前
- 根目錄: 7 個 MD 文件
- docs/deployment/: 15 個文件（大量重複）
- docs/development/: 8 個文件（部分重複）
- 總計: ~60 個 MD 文件（包括重複）

### 整理後
- 根目錄: 1 個 MD 文件 (README.md)
- docs/: 7 個主分類目錄
- docs/05-deployment/: 6-7 個核心文件
- docs/04-development/: 6 個核心文件
- docs/archive/: 歷史文檔歸檔
- 總計: ~30-35 個活躍文件 + 歸檔

### 改善指標
- 📉 文件數量減少: ~40%
- 📈 文件組織性提升: 100%
- 🎯 查找效率提升: 70%+
- 🧹 重複內容消除: 90%+

---

## 🚨 注意事項

1. **備份優先** - 執行任何操作前先備份
2. **逐步執行** - 按階段執行，每階段驗證
3. **保留歷史** - 重要的狀態報告歸檔而不刪除
4. **更新連結** - 移動文件後記得更新所有內部連結
5. **團隊溝通** - 如果是團隊專案，需要通知其他成員

---

**文檔結束**

下一步：等待確認後開始執行整理計劃。
