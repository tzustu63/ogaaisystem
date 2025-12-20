## ADDED Requirements

### Requirement: Initiative 主檔管理
系統 SHALL 管理策略專案（Initiative），每個 Initiative 必須包含：Initiative ID、專案名稱、關聯BSC目標、影響的KPI、專案類型、負責單位、RACI矩陣、起訖日期、預算、狀態、風險標記。

#### Scenario: 建立新 Initiative
- **WHEN** 使用者建立新 Initiative
- **THEN** 系統要求填寫所有必填欄位
- **AND** 系統要求關聯至少一個 BSC 目標
- **AND** 系統要求標記至少一個影響的 KPI（含預期影響方向）
- **AND** 系統要求指定至少一個 A 角色（Accountable）

#### Scenario: 標記適用計畫
- **WHEN** 使用者標記 Initiative 適用計畫
- **THEN** 系統允許多選計畫標籤（深耕/雙語/新南向/學海等）
- **AND** 系統支援一鍵產生「該計畫下所有 Initiatives 清單」供視導使用
- **AND** 系統自動彙整該 Initiative 下的所有執行證據

#### Scenario: 查看 Initiative 詳情
- **WHEN** 使用者查看 Initiative 詳情
- **THEN** 系統顯示完整的專案資訊
- **AND** 系統顯示 RACI 矩陣
- **AND** 系統顯示關聯的 OKR 與進度
- **AND** 系統顯示相關任務列表

### Requirement: OKR 管理
系統 SHALL 管理每個 Initiative 的季度 OKR，包括 Objective（定性描述）與 Key Results（3-5個可量化結果）。

#### Scenario: 建立 OKR
- **WHEN** 使用者為 Initiative 建立 OKR
- **THEN** 系統要求輸入至少一個 Objective（定性描述）
- **AND** 系統要求輸入 3-5 個 Key Results（可量化）
- **AND** 系統要求每個 KR 設定目標值與衡量方式

#### Scenario: 關聯任務到 KR
- **WHEN** 使用者將任務關聯到 KR
- **THEN** 系統允許一個 KR 關聯多個 Kanban 任務
- **AND** 系統自動計算 KR 進度（基於任務完成度）
- **AND** 系統在 KR 達成時自動通知相關人員

#### Scenario: 自動更新 KR 進度
- **WHEN** 關聯到 KR 的任務完成
- **THEN** 系統自動更新 KR 進度百分比
- **AND** 系統重新計算 Initiative 整體進度
- **AND** 系統在 KR 達成 100% 時發送通知

### Requirement: Initiative 與 KPI 的影響追蹤
系統 SHALL 追蹤 Initiative 對 KPI 的實際影響，並允許使用者記錄實際影響說明。

#### Scenario: 標記影響 KPI
- **WHEN** 使用者建立或更新 Initiative
- **THEN** 系統允許標記會影響的 KPI
- **AND** 系統要求標記預期影響方向（正向/負向/中性）

#### Scenario: 記錄實際影響
- **WHEN** Initiative 相關任務完成且標記為「影響 KPI」
- **THEN** 系統要求填寫「實際影響說明」
- **AND** 系統允許上傳佐證資料
- **AND** 系統記錄影響時間與負責人

