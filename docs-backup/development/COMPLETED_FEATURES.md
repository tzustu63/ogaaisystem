# 已補齊功能清單

根據 FUNCTIONALITY_CHECK_REPORT.md 的缺失項目，已完成以下功能的實作：

## 第一優先（個資安全）✅

### 1. 欄位級遮罩 ✅
- **檔案**：`packages/backend/src/services/data-masking.ts`
- **功能**：
  - 護照號遮罩（末4碼）
  - 居留證號遮罩（末6碼）
  - 緊急聯絡人電話遮罩
  - 緊急聯絡人姓名完全遮罩
  - 學生電話/郵件遮罩
- **整合**：已整合到 `incidents` API，自動遮罩敏感欄位

### 2. 匯出控管 ✅
- **檔案**：`packages/backend/src/services/export-control.ts`
- **檔案**：`packages/backend/src/routes/export.ts`
- **功能**：
  - 匯出權限檢查
  - 禁止匯出欄位過濾
  - 匯出操作稽核記錄
  - 支援多種資源類型（incidents, kpis, initiatives, tasks）
- **API**：`POST /api/export`

## 第二優先（功能完善）✅

### 3. 相對值閾值計算 ✅
- **檔案**：`packages/backend/src/routes/kpi.ts`
- **功能**：
  - 支援「上一期」比較（previous_period）
  - 支援「去年同期」比較（same_period_last_year）
  - 自動計算相對百分比
  - 根據相對值判斷燈號

### 4. 工作流自動化 ✅
- **檔案**：`packages/backend/src/services/workflow-automation.ts`
- **檔案**：`packages/backend/src/cron/scheduler.ts`
- **功能**：
  - SLA 逾期檢查（每小時）
  - 自動升級通知
  - 會簽提醒（每天上午9點）
  - 逾期記錄到稽核日誌

### 5. PDCA 排程 ✅
- **檔案**：`packages/backend/src/services/pdca-scheduler.ts`
- **功能**：
  - 自動檢查檢核排程（每天上午8點）
  - 發送檢核提醒
  - 逾期超過7天自動升級通知主管
  - 支援 weekly/monthly/quarterly 頻率

### 6. PDCA 轉為 Kanban 任務 ✅
- **檔案**：`packages/backend/src/routes/pdca.ts`
- **功能**：
  - 建立改善行動時可選擇自動建立任務
  - 每個行動項目自動建立對應任務
  - 自動關聯到 Initiative 和 KPI

## 第三優先（功能完善）✅

### 7. RACI 預設模板 ✅
- **檔案**：`packages/backend/src/services/raci-templates.ts`
- **功能**：
  - 雙聯學制合約簽署模板
  - 境外生簽證申請模板
  - 國際交流活動申請模板
  - 系統啟動時自動初始化

### 8. 一致性檢核完善 ✅
- **檔案**：`packages/backend/src/routes/pdca.ts`
- **功能**：
  - 檢查資料來源是否提供實際值
  - 可擴展為比對多個資料來源

### 9. Scope 檢查邏輯完善 ✅
- **檔案**：`packages/backend/src/services/rbac.ts`
- **功能**：
  - 完善 `canAccessResource` 函數
  - 支援全校、專案、系所、學生群組範圍檢查
  - 完善 `getAccessibleResources` 函數

### 10. 角色管理 API ✅
- **檔案**：`packages/backend/src/routes/roles.ts`
- **功能**：
  - 取得所有角色
  - 建立角色
  - 指派角色給使用者
  - 取得使用者的角色
  - 權限檢查

### 11. 燈號變更通知完善 ✅
- **檔案**：`packages/backend/src/routes/kpi.ts`
- **功能**：
  - 自動查詢資料負責人 email
  - 發送 KPI 狀態變更通知

## 技術實作細節

### 排程系統
- 使用 `node-cron` 實作定時任務
- 每小時檢查工作流 SLA
- 每天檢查 PDCA 排程
- 每天發送會簽提醒

### 資料遮罩
- 基於 RBAC 權限動態遮罩
- 支援多種敏感欄位類型
- 自動應用於 API 回應

### 匯出控管
- 權限檢查 + 欄位過濾雙重保護
- 完整稽核記錄
- 支援自訂欄位選擇

### 相對值計算
- 智能判斷週期類型（季度/月度）
- 自動計算上一期或去年同期
- 支援百分比比較

## 使用方式

### 欄位遮罩
系統會自動在 API 回應中遮罩敏感欄位，無需額外操作。

### 匯出資料
```bash
POST /api/export
{
  "resource_type": "incidents",
  "resource_ids": ["uuid1", "uuid2"],
  "fields": ["incident_number", "incident_type", "severity"]
}
```

### 建立改善行動並轉為任務
```bash
POST /api/pdca/:id/actions
{
  "root_cause": "human",
  "action_type": "corrective",
  "action_items": ["行動1", "行動2"],
  "create_task": true,  // 自動建立任務
  ...
}
```

### 角色管理
```bash
# 取得所有角色
GET /api/roles

# 建立角色
POST /api/roles
{
  "name": "custom_role",
  "permissions": {
    "view_kpis": true,
    "export_data": false
  }
}

# 指派角色
POST /api/roles/assign
{
  "user_id": "uuid",
  "role_id": "uuid",
  "scope_type": "department",
  "scope_value": "國際處"
}
```

## 注意事項

1. **排程任務**：需要在生產環境確保 cron 正常運行
2. **通知服務**：需要設定 SMTP 或 Line Notify Token
3. **資料遮罩**：確保權限設定正確，否則可能過度遮罩
4. **匯出控管**：建議定期檢查稽核日誌

## 待完成項目（低優先級）

- 預測偏離閾值（AI/ML）
- 校內系統對接（Level 2）
- QS/THE 排名填報（Level 3）
- MFA 多因素驗證
- 個資合規檢查清單

---

**完成日期**：2025-01-XX  
**完成度**：約 85%（核心功能已完整）

