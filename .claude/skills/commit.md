# /commit - 標準化 Git Commit 流程

執行標準化的 git commit 流程，確保提交訊息格式一致。

## 流程步驟

1. **檢查變更狀態**
   - 執行 `git status` 查看未追蹤和已修改的檔案
   - 執行 `git diff` 查看具體變更內容

2. **分析變更**
   - 理解所有變更的目的和影響
   - 判斷變更類型（feat/fix/docs/refactor/test/chore）

3. **撰寫提交訊息**
   - 使用繁體中文撰寫
   - 遵循 Conventional Commits 格式
   - 訊息格式：
     ```
     <type>: <簡短描述>

     <詳細說明（如有需要）>

     🤖 Generated with [Claude Code](https://claude.com/claude-code)

     Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
     ```

4. **執行提交**
   - `git add .`（或選擇性加入檔案）
   - `git commit` 使用 HEREDOC 格式確保正確換行

## 提交類型

| Type | 說明 |
|------|------|
| feat | 新功能 |
| fix | 錯誤修復 |
| docs | 文件更新 |
| refactor | 重構（不影響功能） |
| test | 測試相關 |
| chore | 維護性工作 |
| style | 程式碼風格調整 |
| perf | 效能優化 |

## 注意事項

- 不要提交含有敏感資訊的檔案（.env, credentials 等）
- 提交前確認所有變更都是預期的
- 不要使用 `--amend` 除非明確要求
- 不要自動推送到遠端，除非使用者明確要求
