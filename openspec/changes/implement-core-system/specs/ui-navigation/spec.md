## ADDED Requirements

### Requirement: 左側主選單
系統 SHALL 提供左側主選單，包含戰略儀表板、戰術管理、執行管理、數據管理、系統設定等主要功能區塊。

#### Scenario: 顯示主選單
- **WHEN** 使用者登入系統
- **THEN** 系統在左側顯示主選單
- **AND** 系統依使用者權限顯示可用的功能選項
- **AND** 系統支援選單展開/收合

#### Scenario: 選單結構
- **WHEN** 使用者查看主選單
- **THEN** 系統顯示以下主要區塊：
  - 📊 戰略儀表板（BSC四構面總覽、戰略地圖）
  - 🎯 戰術管理（Initiatives、OKR管理、RACI模板）
  - ✅ 執行管理（Kanban看板、Incident管理、PDCA循環）
  - 📁 數據管理（資料匯入、系統對接狀態、資料品質報告）
  - 👥 系統設定（用戶與權限、通知設定、稽核日誌）

### Requirement: 上溯/下鑽路徑導覽
系統 SHALL 提供從戰略到執行（下鑽）與從執行到戰略（上溯）的完整導覽路徑。

#### Scenario: 從戰略下鑽到執行
- **WHEN** 使用者在戰略儀表板點擊某 KPI
- **THEN** 系統導航至 KPI 詳情頁
- **AND** 系統顯示 KPI 定義、公式、趨勢圖
- **AND** 系統提供「查看相關 Initiatives」按鈕
- **AND** 點擊後導航至 Initiative 專案頁
- **AND** Initiative 頁提供「查看任務」按鈕
- **AND** 點擊後導航至 Kanban 任務清單
- **AND** 點擊任務卡導航至任務詳情

#### Scenario: 從執行上溯到戰略
- **WHEN** 使用者在任務詳情頁
- **THEN** 系統顯示麵包屑導航
- **AND** 系統顯示關聯的 Initiative
- **AND** 系統顯示關聯的 OKR
- **AND** 系統顯示影響的 KPI
- **AND** 系統顯示所屬 BSC 目標
- **AND** 系統提供連結至戰略地圖

### Requirement: 戰略儀表板頁面
系統 SHALL 提供戰略儀表板頁面，顯示四構面達成率、燈號統計、支援視圖切換與篩選。

#### Scenario: 顯示儀表板
- **WHEN** 使用者進入戰略儀表板
- **THEN** 系統首屏顯示四構面雷達圖與燈號統計
- **AND** 系統支援切換年度/季度/月度視圖
- **AND** 系統提供一鍵篩選依計畫標籤（深耕/雙語等）

#### Scenario: 互動功能
- **WHEN** 使用者與儀表板互動
- **THEN** 系統支援點擊 KPI 進行下鑽
- **AND** 系統支援點擊構面查看詳情
- **AND** 系統支援切換不同視圖模式

### Requirement: KPI 詳情頁
系統 SHALL 提供 KPI 詳情頁，顯示定義、公式、目標、實際值、燈號、趨勢圖與下鑽按鈕。

#### Scenario: 顯示 KPI 詳情
- **WHEN** 使用者查看 KPI 詳情頁
- **THEN** 系統上半部顯示：定義、公式、目標、實際值、燈號
- **AND** 系統下半部顯示趨勢圖與下鑽按鈕（Initiatives/OKR/任務）
- **AND** 系統右側欄顯示：資料來源、更新頻率、資料負責人

#### Scenario: 下鑽功能
- **WHEN** 使用者點擊下鑽按鈕
- **THEN** 系統導航至對應的 Initiatives/OKR/任務列表
- **AND** 系統自動篩選顯示與該 KPI 相關的項目

### Requirement: Initiative 專案頁
系統 SHALL 提供 Initiative 專案頁，顯示專案資訊、RACI 矩陣、OKR 進度、關鍵任務、風險警示。

#### Scenario: 顯示專案頁
- **WHEN** 使用者查看 Initiative 專案頁
- **THEN** 系統左側顯示：專案基本資訊、RACI 矩陣
- **AND** 系統中間顯示：OKR 進度條、關鍵任務列表
- **AND** 系統右側顯示：風險警示、最新動態

#### Scenario: 互動功能
- **WHEN** 使用者與專案頁互動
- **THEN** 系統支援點擊 OKR 查看詳情
- **AND** 系統支援點擊任務導航至 Kanban
- **AND** 系統支援點擊 RACI 角色查看工作流

### Requirement: Kanban 看板頁
系統 SHALL 提供 Kanban 看板頁，支援多種分組、卡片顯示、快速篩選、拖曳功能。

#### Scenario: 顯示看板
- **WHEN** 使用者查看 Kanban 看板
- **THEN** 系統顯示標準泳道或自訂分組
- **AND** 系統卡片顯示：任務名稱、負責人、截止日、標籤
- **AND** 系統支援拖曳任務改變狀態

#### Scenario: 篩選功能
- **WHEN** 使用者使用篩選功能
- **THEN** 系統支援依 Initiative 篩選
- **AND** 系統支援依類型篩選
- **AND** 系統支援依風險標記篩選
- **AND** 系統支援依負責人篩選

### Requirement: 響應式設計
系統 SHALL 支援響應式設計，適配桌機、平板等不同裝置。

#### Scenario: 桌機顯示
- **WHEN** 使用者在桌機上使用系統
- **THEN** 系統顯示完整功能與多欄佈局
- **AND** 系統充分利用螢幕空間

#### Scenario: 平板顯示
- **WHEN** 使用者在平板上使用系統
- **THEN** 系統自動調整佈局適應螢幕
- **AND** 系統保持核心功能可用
- **AND** 系統優化觸控操作

### Requirement: 麵包屑導航
系統 SHALL 提供麵包屑導航，顯示當前頁面在系統中的位置與路徑。

#### Scenario: 顯示麵包屑
- **WHEN** 使用者在任何頁面
- **THEN** 系統在頁面頂部顯示麵包屑
- **AND** 系統顯示完整路徑（如：戰術管理 > KPI 管理 > 外部經費成長率）
- **AND** 系統支援點擊麵包屑項目進行導航

