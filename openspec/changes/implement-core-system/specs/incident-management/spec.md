## ADDED Requirements

### Requirement: Incident 卡片管理
系統 SHALL 管理緊急事件（Incident），包含事件編號、事件類型、嚴重程度、發生時間、發生地點、當事人、緊急聯絡人、事件描述、RACI、處置清單、通報紀錄、追蹤與結案報告。

#### Scenario: 建立 Incident
- **WHEN** 使用者建立新 Incident
- **THEN** 系統自動產生事件編號（如 INC-2025-001）
- **AND** 系統要求填寫所有必填欄位
- **AND** 系統要求指定至少一個 A 角色
- **AND** 系統自動通知 RACI 中所有角色

#### Scenario: 選擇事件類型
- **WHEN** 使用者選擇事件類型
- **THEN** 系統提供選項：校安/醫療/法務/簽證/其他
- **AND** 系統根據事件類型自動載入對應的 Checklist 範本

#### Scenario: 設定嚴重程度
- **WHEN** 使用者設定嚴重程度
- **THEN** 系統提供選項：Critical/High/Medium/Low
- **AND** 系統根據嚴重程度調整通知優先級

### Requirement: 處置清單管理
系統 SHALL 管理 Incident 的處置清單（Checklist），支援預設範本與自訂清單。

#### Scenario: 載入預設 Checklist
- **WHEN** 使用者建立特定類型的 Incident
- **THEN** 系統自動載入對應的 Checklist 範本
- **AND** 系統允許使用者修改或新增清單項目

#### Scenario: 完成 Checklist 項目
- **WHEN** 使用者完成 Checklist 項目
- **THEN** 系統記錄完成時間與完成人
- **AND** 系統顯示完成進度百分比
- **AND** 系統在全部完成時提示可進行結案

#### Scenario: 自訂 Checklist
- **WHEN** 使用者需要自訂 Checklist
- **THEN** 系統允許新增、刪除、修改清單項目
- **AND** 系統允許儲存為新範本供後續使用

### Requirement: 通報機制
系統 SHALL 記錄與追蹤 Incident 的通報紀錄，包括已通報單位與時間。

#### Scenario: 記錄通報
- **WHEN** 使用者記錄通報
- **THEN** 系統要求選擇通報單位
- **AND** 系統要求記錄通報時間
- **AND** 系統允許上傳通報證明（如通報單據）

#### Scenario: 查看通報紀錄
- **WHEN** 使用者查看 Incident 通報紀錄
- **THEN** 系統顯示所有通報單位與時間
- **AND** 系統顯示通報狀態（已通報/待通報）

### Requirement: 結案流程
系統 SHALL 要求 Incident 結案時填寫追蹤與結案報告，包括 Action taken 與 Prevention 措施。

#### Scenario: 結案前檢查
- **WHEN** A 角色嘗試結案
- **THEN** 系統檢查所有 Checklist 是否完成
- **AND** 系統檢查必要通報是否已完成
- **AND** 系統要求填寫「追蹤與結案報告」

#### Scenario: 填寫結案報告
- **WHEN** 使用者填寫結案報告
- **THEN** 系統要求填寫 Action taken（已採取的行動）
- **AND** 系統要求填寫 Prevention（預防復發措施）
- **AND** 系統允許上傳相關文件

#### Scenario: 完成結案
- **WHEN** 所有結案條件滿足且 A 角色確認結案
- **THEN** 系統標記 Incident 為「已結案」
- **AND** 系統通知所有相關人員
- **AND** 系統記錄結案時間與結案人

### Requirement: Incident 協作
系統 SHALL 支援多角色協作處理 Incident，C 角色可在系統內協作並留下處置紀錄。

#### Scenario: 協作處理
- **WHEN** C 角色（如校安、心理諮商）參與處理
- **THEN** 系統允許在系統內留下處置紀錄
- **AND** 系統允許上傳相關文件
- **AND** 系統記錄所有協作活動的稽核軌跡

#### Scenario: 查看協作紀錄
- **WHEN** 使用者查看 Incident 協作紀錄
- **THEN** 系統顯示所有角色的處理紀錄
- **AND** 系統依時間順序顯示
- **AND** 系統顯示處理人與處理內容

