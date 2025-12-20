# 尚未開發功能完整檢查報告

本報告對照 PRD.md 與所有 OpenSpec 規格檔案，逐一列出尚未開發的功能與程式碼。

## 檢查日期
2025-01-XX

---

## 【高優先級 - 核心功能缺失】

### 1. KPI 手動標記例外 ⚠️
**規格來源**：`PRD.md` 3.4.2、`specs/strategy-map-dashboard/spec.md` 68-72

**需求**：
- 使用者可手動標記 KPI 燈號例外情況
- 需填寫說明原因
- 記錄稽核軌跡
- 在儀表板上顯示例外標記

**實作狀態**：
- ✅ 資料結構支援（`kpi_values` 表可能有欄位）
- ❌ 無後端 API 端點
- ❌ 無前端介面

**需實作**：
- `POST /api/kpis/:id/values/:period/exception` - 標記例外
- `DELETE /api/kpis/:id/values/:period/exception` - 取消例外
- 前端 KPI 詳情頁增加「標記例外」按鈕

---

### 2. 會簽進度儀表板 ⚠️
**規格來源**：`PRD.md` 3.7.3、`specs/raci-workflow/spec.md` 48

**需求**：
- 顯示會簽進度儀表板（已完成/進行中/逾期）
- 顯示每個 C 角色的會簽狀態
- 顯示逾期天數與 SLA 狀態

**實作狀態**：
- ✅ 資料可查詢（`workflow_actions` 表）
- ❌ 無專屬 API 端點
- ❌ 無前端儀表板頁面

**需實作**：
- `GET /api/raci/workflows/:id/consultation-progress` - 取得會簽進度
- 前端 `/raci/workflows/:id/progress` 頁面

---

### 3. 表單紀錄管理 ⚠️
**規格來源**：`PRD.md` 3.8.1、`specs/kanban-tasks/spec.md` 67-72

**需求**：
- 支援結構化表單紀錄
- 根據任務類型顯示對應表單
- 驗證必填欄位
- 儲存表單資料供後續查詢

**實作狀態**：
- ✅ 資料結構支援（`tasks` 表可能有欄位）
- ❌ 無表單定義管理
- ❌ 無表單填寫介面
- ❌ 無表單資料查詢 API

**需實作**：
- `GET /api/tasks/:id/forms` - 取得任務表單定義
- `POST /api/tasks/:id/forms` - 提交表單資料
- `GET /api/tasks/:id/forms/:formId` - 取得表單資料
- 前端表單填寫介面

---

### 4. Kanban 自訂分組 ⚠️
**規格來源**：`PRD.md` 3.8.2、`specs/kanban-tasks/spec.md` 30-35

**需求**：
- 依單位分組
- 依專案分組
- 依優先級分組
- 切換分組視圖

**實作狀態**：
- ✅ API 支援篩選（`GET /api/tasks` 有 `assignee_id`, `initiative_id` 參數）
- ❌ 無分組視圖 API
- ❌ 前端只有標準狀態分組，無自訂分組選項

**需實作**：
- `GET /api/tasks/kanban/board?groupBy=department|project|priority` - 分組視圖 API
- 前端 Kanban 頁面增加分組選項切換

---

### 5. 修改前後對比功能 ⚠️
**規格來源**：`PRD.md` 3.7.4、`specs/raci-workflow/spec.md` 72

**需求**：
- 記錄修改前後內容對比
- 顯示差異高亮
- 支援匯出對比報告

**實作狀態**：
- ✅ 有記錄（`audit_logs` 表有 `old_value`, `new_value` 欄位）
- ❌ 無對比功能 API
- ❌ 無前端對比顯示介面

**需實作**：
- `GET /api/audit-logs/:id/diff` - 取得修改對比
- 前端對比顯示組件

---

### 6. Initiative/OKR 報告生成 ⚠️
**規格來源**：`PRD.md` 3.5.3

**需求**：
- 一鍵產生計畫清單（適用計畫標記）
- 自動彙整執行證據
- 支援匯出報告

**實作狀態**：
- ✅ 資料可查詢（`initiative_programs` 表）
- ❌ 無專屬 API
- ❌ 無報告生成功能
- ❌ 無前端介面

**需實作**：
- `GET /api/initiatives/:id/program-report` - 產生計畫清單報告
- `GET /api/initiatives/:id/evidence-summary` - 自動彙整證據
- 前端報告生成與匯出介面

---

### 7. 上溯路徑完善 ⚠️
**規格來源**：`PRD.md` 3.13.2、`specs/ui-navigation/spec.md` 34-42

**需求**：
- 從任務詳情頁上溯到 Initiative
- 從任務上溯到 OKR
- 從任務上溯到 KPI
- 從任務上溯到 BSC 目標
- 提供連結至戰略地圖

**實作狀態**：
- ✅ 有麵包屑導航（部分頁面）
- ⚠️ 上溯連結不完整
- ❌ 無統一的上溯路徑 API

**需實作**：
- `GET /api/tasks/:id/trace-up` - 取得上溯路徑
- 前端統一上溯路徑組件

---

### 8. 戰略地圖展開/收合構面 ⚠️
**規格來源**：`specs/strategy-map-dashboard/spec.md` 15

**需求**：
- 支援展開/收合特定構面
- 互動式構面顯示

**實作狀態**：
- ✅ 前端有顯示（`/dashboard/strategy-map`）
- ❌ 無展開/收合互動功能

**需實作**：
- 前端戰略地圖頁面增加展開/收合按鈕與邏輯

---

### 9. BSC 目標協作單位欄位 ⚠️
**規格來源**：`PRD.md` 3.3.2、`specs/strategy-map-dashboard/spec.md` 19-25

**需求**：
- BSC 目標需指定協作單位
- 顯示協作單位資訊

**實作狀態**：
- ✅ 資料表有 `responsible_user_id`
- ❌ 無協作單位欄位（`collaborating_units`）

**需實作**：
- 資料庫遷移：新增 `bsc_objectives.collaborating_units` 欄位
- 更新 API 支援協作單位
- 前端顯示協作單位

---

## 【中優先級 - 重要功能缺失】

### 10. 個資合規檢查清單 ❌
**規格來源**：`PRD.md` 3.12.4、`specs/access-control/spec.md` 106-131

**需求**：
- 資料蒐集目的告知（記錄目的、告知時間、告知證明）
- 同意書管理（上傳同意書、記錄同意時間與範圍、追蹤到期日）
- 資料保存期限管理（設定保存期限、到期前提醒、到期後標記待刪除）
- 資料刪除請求處理（GDPR Right to be Forgotten）

**實作狀態**：
- ❌ 完全未實作

**需實作**：
- 資料表設計：
  - `data_collection_purposes` - 資料蒐集目的
  - `consent_forms` - 同意書管理
  - `data_retention_policies` - 資料保存期限政策
  - `data_deletion_requests` - 資料刪除請求
- API 端點：
  - `POST /api/gdpr/collection-purposes` - 記錄資料蒐集目的
  - `POST /api/gdpr/consent-forms` - 上傳同意書
  - `GET /api/gdpr/consent-forms/:id` - 查詢同意書
  - `POST /api/gdpr/retention-policies` - 設定保存期限
  - `POST /api/gdpr/deletion-requests` - 提交刪除請求
  - `GET /api/gdpr/deletion-requests` - 查詢刪除請求
  - `POST /api/gdpr/deletion-requests/:id/approve` - 核准刪除
- 前端頁面：
  - `/settings/gdpr` - 個資合規管理頁面

---

### 11. 系統對接狀態頁面 ❌
**規格來源**：`PRD.md` 3.11 Level 2、`specs/data-integration/spec.md` 51-55、`Sidebar.tsx` 39

**需求**：
- 顯示各系統的對接狀態
- 顯示最後同步時間
- 顯示同步錯誤（如有）
- 支援手動觸發同步

**實作狀態**：
- ✅ Sidebar 有連結（`/data/integration`）
- ❌ 無對應頁面
- ❌ 無 API 端點

**需實作**：
- 資料表設計：
  - `system_integrations` - 系統對接設定
  - `integration_sync_logs` - 同步記錄
- API 端點：
  - `GET /api/integrations` - 取得所有對接系統
  - `GET /api/integrations/:id/status` - 取得對接狀態
  - `POST /api/integrations/:id/sync` - 手動觸發同步
  - `GET /api/integrations/:id/sync-logs` - 取得同步記錄
- 前端頁面：
  - `/data/integration` - 系統對接狀態頁面

---

### 12. 資料品質報告頁面 ❌
**規格來源**：`Sidebar.tsx` 40

**需求**：
- 顯示資料品質檢核報告
- 顯示完整性、準時性、一致性檢核結果
- 支援篩選與匯出

**實作狀態**：
- ✅ Sidebar 有連結（`/data/quality`）
- ✅ PDCA 有資料品質檢核邏輯
- ❌ 無專屬報告頁面
- ❌ 無報告匯出功能

**需實作**：
- API 端點：
  - `GET /api/data-quality/reports` - 取得品質報告
  - `GET /api/data-quality/reports/:id` - 取得單一報告詳情
  - `POST /api/data-quality/reports/export` - 匯出報告
- 前端頁面：
  - `/data/quality` - 資料品質報告頁面

---

### 13. 系統設定頁面 ❌
**規格來源**：`Sidebar.tsx` 44-50

**需求**：
- 用戶與權限管理（`/settings/users`）
- 通知設定（`/settings/notifications`）
- 稽核日誌查詢（`/settings/audit`）

**實作狀態**：
- ✅ Sidebar 有連結
- ✅ 後端有角色管理 API（`/api/roles`）
- ✅ 後端有稽核日誌資料表
- ❌ 無前端設定頁面

**需實作**：
- API 端點：
  - `GET /api/users` - 取得使用者列表
  - `POST /api/users` - 建立使用者
  - `PUT /api/users/:id` - 更新使用者
  - `GET /api/audit-logs` - 查詢稽核日誌
  - `GET /api/notification-settings` - 取得通知設定
  - `PUT /api/notification-settings` - 更新通知設定
- 前端頁面：
  - `/settings/users` - 用戶與權限管理
  - `/settings/notifications` - 通知設定
  - `/settings/audit` - 稽核日誌查詢

---

## 【低優先級 - 進階功能缺失】

### 14. ETL 排程功能 ❌
**規格來源**：`PRD.md` 3.11 Level 2、`specs/data-integration/spec.md` 45-49

**需求**：
- 定時 ETL 排程
- 增量同步與全量同步
- 同步歷程記錄

**實作狀態**：
- ❌ 完全未實作

**需實作**：
- ETL 服務架構設計
- 排程任務管理
- 同步邏輯實作

---

### 15. 校內系統對接（Level 2）❌
**規格來源**：`PRD.md` 3.11 Level 2、`specs/data-integration/spec.md` 36-49

**需求**：
- 學籍/SIS 系統對接
- 財務/主計系統對接
- 人資/研習系統對接
- API 串接或 ETL 同步

**實作狀態**：
- ✅ 有 API 對接框架（基礎）
- ❌ 無具體系統對接實作

**需實作**：
- 各系統的對接實作
- 認證與授權處理
- 資料轉換邏輯

---

### 16. QS/THE 排名填報（Level 3）❌
**規格來源**：`PRD.md` 3.11 Level 3、`specs/data-integration/spec.md` 57-82

**需求**：
- 建立填報指標清單
- 追蹤填報完整率
- 資料佐證檢核清單
- 截止日提醒

**實作狀態**：
- ❌ 完全未實作

**需實作**：
- 資料表設計：
  - `ranking_submissions` - 排名填報專案
  - `ranking_indicators` - 填報指標
  - `ranking_evidence` - 佐證資料
- API 端點與前端頁面

---

### 17. 預測偏離閾值（AI/ML）❌
**規格來源**：`PRD.md` 3.2.2 模式3

**需求**：
- 使用 AI/ML 模型預測季末達標機率
- 根據預測機率判斷燈號

**實作狀態**：
- ✅ 資料結構支援（`thresholds.mode: 'predictive'`）
- ❌ AI/ML 邏輯未實作

**需實作**：
- AI/ML 模型設計與訓練
- 預測 API 端點
- 整合到 KPI 燈號計算邏輯

---

### 18. MFA 多因素驗證 ❌
**規格來源**：`PRD.md` 3.12.3、`specs/access-control/spec.md` 41-44

**需求**：
- 支援第二驗證因子（如 TOTP、SMS）
- 登入時要求提供第二因子

**實作狀態**：
- ❌ 完全未實作

**需實作**：
- MFA 設定資料表
- TOTP 生成與驗證邏輯
- 登入流程整合

---

### 19. 同比/環比對照完善 ⚠️
**規格來源**：`PRD.md` 3.4.1、`specs/strategy-map-dashboard/spec.md` 45

**需求**：
- 趨勢圖支援同比/環比對照
- 顯示對照線

**實作狀態**：
- ✅ KPI 詳情頁有趨勢圖
- ⚠️ 可能需完善同比/環比顯示

**需實作**：
- 前端趨勢圖增加同比/環比切換選項
- 顯示對照線

---

## 總結統計

### 功能完成度
- **高優先級缺失**：9 項
- **中優先級缺失**：4 項
- **低優先級缺失**：6 項
- **總計缺失**：19 項

### 實作優先順序建議

#### 第一階段（核心功能）
1. KPI 手動標記例外
2. 會簽進度儀表板
3. Kanban 自訂分組
4. 上溯路徑完善
5. 修改前後對比功能

#### 第二階段（重要功能）
6. 個資合規檢查清單
7. 系統設定頁面
8. 系統對接狀態頁面
9. 資料品質報告頁面
10. Initiative/OKR 報告生成

#### 第三階段（進階功能）
11. 表單紀錄管理
12. BSC 目標協作單位
13. 戰略地圖展開/收合
14. 同比/環比對照完善
15. ETL 排程功能
16. 校內系統對接
17. QS/THE 排名填報
18. 預測偏離閾值（AI/ML）
19. MFA 多因素驗證

---

## 檢查人員
AI Assistant (Auto)

