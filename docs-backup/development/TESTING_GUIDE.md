# 功能測試指南

## 資料庫遷移

### 執行遷移
```bash
# 方法 1：使用 psql 直接執行
psql -d oga_ai_system -f packages/backend/src/db/migrations/002_add_missing_features.sql

# 方法 2：使用遷移腳本（需先安裝依賴）
cd packages/backend
npm install
npm run migrate 002_add_missing_features.sql
```

### 驗證遷移
```sql
-- 檢查新欄位
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'kpi_values' AND column_name LIKE '%exception%';

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'bsc_objectives' AND column_name = 'collaborating_units';

-- 檢查新資料表
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'form_definitions', 
  'task_form_records', 
  'system_integrations',
  'integration_sync_logs',
  'data_collection_purposes',
  'consent_forms',
  'data_retention_policies',
  'data_deletion_requests'
);
```

## API 測試

### 1. KPI 手動標記例外
```bash
# 標記例外
curl -X POST http://localhost:13001/api/kpi/{kpi_id}/values/{period}/exception \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"reason": "因特殊情況，此期間數值異常"}'

# 取消例外
curl -X DELETE http://localhost:13001/api/kpi/{kpi_id}/values/{period}/exception \
  -H "Authorization: Bearer {token}"
```

### 2. 會簽進度儀表板
```bash
curl http://localhost:13001/api/raci/workflows/{workflow_id}/consultation-progress \
  -H "Authorization: Bearer {token}"
```

### 3. 表單紀錄管理
```bash
# 取得表單定義
curl http://localhost:13001/api/tasks/forms/definitions?task_type=project \
  -H "Authorization: Bearer {token}"

# 取得任務的表單紀錄
curl http://localhost:13001/api/tasks/{task_id}/forms \
  -H "Authorization: Bearer {token}"

# 提交表單
curl -X POST http://localhost:13001/api/tasks/{task_id}/forms \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "form_definition_id": "{form_id}",
    "form_data": {"field1": "value1", "field2": "value2"}
  }'
```

### 4. Kanban 自訂分組
```bash
# 依狀態分組（預設）
curl http://localhost:13001/api/tasks/kanban/board \
  -H "Authorization: Bearer {token}"

# 依單位分組
curl "http://localhost:13001/api/tasks/kanban/board?groupBy=department" \
  -H "Authorization: Bearer {token}"

# 依專案分組
curl "http://localhost:13001/api/tasks/kanban/board?groupBy=project" \
  -H "Authorization: Bearer {token}"

# 依優先級分組
curl "http://localhost:13001/api/tasks/kanban/board?groupBy=priority" \
  -H "Authorization: Bearer {token}"
```

### 5. 修改前後對比
```bash
# 取得稽核日誌
curl "http://localhost:13001/api/audit?limit=50" \
  -H "Authorization: Bearer {token}"

# 取得對比資料
curl http://localhost:13001/api/audit/{log_id}/diff \
  -H "Authorization: Bearer {token}"
```

### 6. Initiative/OKR 報告生成
```bash
# 產生計畫清單報告
curl http://localhost:13001/api/initiatives/{initiative_id}/program-report \
  -H "Authorization: Bearer {token}"

# 自動彙整執行證據
curl http://localhost:13001/api/initiatives/{initiative_id}/evidence-summary \
  -H "Authorization: Bearer {token}"
```

### 7. 上溯路徑
```bash
# 從任務上溯到戰略
curl http://localhost:13001/api/trace/task/{task_id}/up \
  -H "Authorization: Bearer {token}"

# 從 KPI 下鑽到任務
curl http://localhost:13001/api/trace/kpi/{kpi_id}/down \
  -H "Authorization: Bearer {token}"
```

### 8. BSC 目標協作單位
```bash
# 建立 BSC 目標（含協作單位）
curl -X POST http://localhost:13001/api/bsc/objectives \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name_zh": "提升國際化程度",
    "perspective": "customer",
    "responsible_user_id": "{user_id}",
    "collaborating_units": ["國際處", "教務處"],
    "kpi_ids": ["{kpi_id}"]
  }'
```

### 9. 個資合規管理
```bash
# 取得資料蒐集目的
curl http://localhost:13001/api/gdpr/collection-purposes \
  -H "Authorization: Bearer {token}"

# 建立同意書
curl -X POST http://localhost:13001/api/gdpr/consent-forms \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "data_subject_id": "student_123",
    "data_subject_type": "student",
    "purpose_id": "{purpose_id}",
    "consent_scope": "學籍資料、成績資料",
    "consent_date": "2024-01-01"
  }'

# 取得刪除請求
curl http://localhost:13001/api/gdpr/deletion-requests \
  -H "Authorization: Bearer {token}"

# 核准刪除請求
curl -X POST http://localhost:13001/api/gdpr/deletion-requests/{request_id}/approve \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"completion_notes": "資料已刪除"}'
```

### 10. 系統對接狀態
```bash
# 取得所有對接
curl http://localhost:13001/api/integrations \
  -H "Authorization: Bearer {token}"

# 取得對接狀態
curl http://localhost:13001/api/integrations/{integration_id}/status \
  -H "Authorization: Bearer {token}"

# 手動觸發同步
curl -X POST http://localhost:13001/api/integrations/{integration_id}/sync \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"sync_type": "incremental"}'
```

### 11. 資料品質報告
```bash
# 取得報告列表
curl "http://localhost:13001/api/data-quality/reports?start_date=2024-01-01" \
  -H "Authorization: Bearer {token}"

# 取得單一報告
curl http://localhost:13001/api/data-quality/reports/{report_id} \
  -H "Authorization: Bearer {token}"
```

### 12. 系統設定
```bash
# 取得通知設定
curl http://localhost:13001/api/settings/notifications \
  -H "Authorization: Bearer {token}"

# 更新通知設定
curl -X PUT http://localhost:13001/api/settings/notifications \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "email_enabled": true,
    "kpi_status_change": true
  }'
```

## 前端頁面測試

### 測試路徑
1. **KPI 詳情頁** - `/kpi/[id]`
   - 測試例外標記按鈕
   - 測試下鑽路徑顯示

2. **會簽進度儀表板** - `/raci/workflows/[id]/progress`
   - 測試進度統計
   - 測試會簽狀態顯示

3. **Kanban 看板** - `/kanban`
   - 測試分組切換（狀態/單位/專案/優先級）
   - 測試上溯路徑顯示

4. **任務表單管理** - `/tasks/[id]/forms`
   - 測試表單定義列表
   - 測試表單填寫與提交

5. **Initiative 詳情** - `/initiatives/[id]`
   - 測試報告生成按鈕
   - 測試報告下載

6. **戰略地圖** - `/dashboard/strategy-map`
   - 測試構面展開/收合
   - 測試節點過濾

7. **系統對接狀態** - `/data/integration`
   - 測試對接列表顯示
   - 測試手動同步按鈕

8. **資料品質報告** - `/data/quality`
   - 測試報告列表
   - 測試統計資訊顯示

9. **系統設定** - `/settings/*`
   - `/settings/users` - 使用者管理
   - `/settings/notifications` - 通知設定
   - `/settings/audit` - 稽核日誌與對比
   - `/settings/gdpr` - 個資合規管理

## 測試檢查清單

### 後端 API
- [ ] KPI 例外標記 API 正常運作
- [ ] 會簽進度 API 返回正確資料結構
- [ ] 表單管理 API 可建立與查詢
- [ ] Kanban 自訂分組 API 正確分組
- [ ] 稽核對比 API 返回對比資料
- [ ] 報告生成 API 返回完整資料
- [ ] 上溯/下鑽路徑 API 正確建立路徑
- [ ] BSC 協作單位欄位可儲存與讀取
- [ ] GDPR API 所有端點正常運作
- [ ] 系統對接 API 可建立與查詢
- [ ] 資料品質 API 返回報告資料
- [ ] 系統設定 API 可讀取與更新

### 前端頁面
- [ ] 所有新增頁面可正常載入
- [ ] 表單提交功能正常
- [ ] 分組切換功能正常
- [ ] 展開/收合互動正常
- [ ] 路徑顯示組件正常
- [ ] 報告生成與下載正常
- [ ] 對比顯示面板正常

### 資料庫
- [ ] 所有新資料表已建立
- [ ] 所有新欄位已新增
- [ ] 索引已建立
- [ ] 外鍵約束正常

## 已知問題

1. **TypeScript 類型錯誤**：已修復大部分，部分可能需重新編譯
2. **資料庫連線**：需確認環境變數設定
3. **前端路由**：部分頁面需確認 Sidebar 連結是否正確

## 後續優化建議

1. 完善表單定義的預設資料
2. 實作系統對接的實際同步邏輯
3. 完善 GDPR 的資料刪除實際執行邏輯
4. 增加單元測試與整合測試
5. 優化前端 UI/UX

