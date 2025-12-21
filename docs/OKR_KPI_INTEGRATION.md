# OKR 與 KPI 整合說明

## 整合目的

解決 OKR 的 Key Result 與 KPI 重複定義的問題，讓 KR 可以直接引用現有的 KPI，避免維護兩套相同的指標。

## 整合後的架構

```
┌─────────────────────────────────────────────────────────────────┐
│  KPI 管理（唯一的指標定義來源）                               │
│  ├── BSC-F-001: 國際學生人數                                     │
│  ├── BSC-C-002: 學生滿意度                                       │
│  └── BSC-I-003: 雙語課程數量                                     │
│                                                                  │
│  OKR（季度目標）                                                  │
│  ├── O: 「讓學校成為國際學生的首選」                               │
│  │                                                               │
│  └── Key Results                                                 │
│       ├── KR1 [KPI 連動]: 國際學生人數從 400 → 500                │
│       │     └── 自動同步 KPI 進度                                 │
│       ├── KR2 [KPI 連動]: 學生滿意度達 4.5/5                      │
│       │     └── 自動同步 KPI 進度                                 │
│       └── KR3 [自定義]: 完成 5 場海外招生說明會                    │
│             └── 手動更新進度                                      │
│                                                                  │
│  Task（執行任務）                                                 │
│  └── 關聯 KR → 自動連結到 KPI                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Key Result 類型

### 1. KPI 連動類型 (`kpi_based`)

- 引用現有的 KPI 作為衡量標準
- 設定基準值（設定 OKR 時的起始值）和目標值
- 進度可透過「同步 KPI 進度」功能自動更新
- **推薦使用**：避免重複定義指標

### 2. 自定義類型 (`custom`)

- 獨立的臨時性指標
- 適用於不屬於現有 KPI 的季度目標
- 需手動更新進度

## 資料庫變更

### key_results 表新增欄位

| 欄位 | 類型 | 說明 |
|------|------|------|
| `kr_type` | VARCHAR(20) | `kpi_based` 或 `custom` |
| `kpi_id` | UUID | 引用的 KPI（KPI 類型必填） |
| `kpi_baseline_value` | NUMERIC | KPI 基準值（設定時的起始值） |
| `kpi_target_value` | NUMERIC | KPI 本季目標值 |

## API 變更

### 建立 OKR

```json
POST /api/okr
{
  "initiative_id": "xxx",
  "quarter": "2024-Q1",
  "objective": "讓學校成為國際學生的首選",
  "key_results": [
    {
      "description": "國際學生人數從 400 增加到 500",
      "kr_type": "kpi_based",
      "kpi_id": "xxx-xxx-xxx",
      "kpi_baseline_value": 400,
      "kpi_target_value": 500
    },
    {
      "description": "完成 5 場海外招生說明會",
      "kr_type": "custom",
      "target_value": 5,
      "unit": "場"
    }
  ]
}
```

### 同步 KPI 進度

```bash
# 同步單一 KR
POST /api/okr/key-results/:id/sync-kpi

# 同步所有 KPI 類型的 KR
POST /api/okr/sync-all-kpi-kr
```

### 整合視圖

```bash
# 查看 OKR 與 KPI 整合關係
GET /api/okr/integration/view
```

## 追溯路徑更新

### 上溯路徑 (Task → KPI)

```
Task → KR → [KR 引用的 KPI] → OKR → Initiative → BSC 目標
```

### 下鑽路徑 (KPI → Task)

```
KPI → {
  initiatives: 透過 initiative_kpis 關聯,
  okrs: 透過 KR 引用此 KPI,
  key_results: 引用此 KPI 的 KR,
  tasks: 透過 KR 關聯的 Task
}
```

## 使用流程

### 1. 先建立 KPI

在 KPI 管理中定義組織需要持續監控的指標。

### 2. 建立 OKR 時選擇 KPI

1. 前往 OKR 管理 → 新增 OKR
2. 填寫 Objective（定性、激勵人心）
3. 新增 Key Result 時選擇類型：
   - **引用現有 KPI**：選擇 KPI、設定基準值和目標值
   - **自定義指標**：填寫目標值和單位

### 3. 同步 KPI 進度

當 KPI 數值更新後，點擊「同步 KPI 進度」按鈕，系統會：
1. 取得 KPI 最新數值
2. 計算 KR 進度：`(現值 - 基準值) / (目標值 - 基準值) * 100%`
3. 更新 KR 狀態

### 4. 追蹤關聯

- 在 KPI 詳情頁可看到哪些 OKR 的 KR 引用了此 KPI
- 在 Task 可追溯到對應的 KPI

## 優點

1. **避免重複定義**：KR 引用現有 KPI，無需重複維護
2. **自動同步進度**：KPI 更新後可自動反映到 KR
3. **完整追蹤鏈**：從 Task 到 KPI 的完整追溯路徑
4. **彈性兼容**：支援自定義 KR 滿足臨時性目標
5. **向後相容**：Task 的 kpi_id 仍保留，支援直接關聯

## 注意事項

- KPI 類型的 KR 不允許手動更新進度，需透過同步功能
- 建議定期（每週/每月）執行「同步所有 KPI 進度」
- 設定 KR 時，基準值應填寫設定當下的 KPI 數值
