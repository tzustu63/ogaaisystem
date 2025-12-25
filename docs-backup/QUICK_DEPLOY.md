# 快速部署指南 - 解決 48 個未上傳文件

## 問題
有 48 個文件尚未上傳到 GitHub。

## 快速解決方法

### 方法 1：使用自動化腳本（推薦）

```bash
cd "/Users/kuoyuming/coding/oga ai system"
./scripts/commit-all-changes.sh
```

這個腳本會：
1. ✅ 自動添加所有文件到 Git
2. ✅ 提交所有變更
3. ✅ 詢問是否推送到 GitHub

### 方法 2：手動執行命令

```bash
cd "/Users/kuoyuming/coding/oga ai system"

# 1. 添加所有文件（包括新文件和修改的文件）
git add -A

# 2. 檢查狀態
git status

# 3. 提交變更
git commit -m "feat: 更新系統功能

- 修復看板分組顯示問題
- 新增緊急事件管理功能
- 新增緊急事件建立頁面
- 更新看板寬度設定
- 將 Incident 管理改名為緊急事件管理
- 添加所有項目文件"

# 4. 推送到 GitHub（如果已設定遠程倉庫）
git push -u origin main
```

## 檢查哪些文件未上傳

```bash
# 查看未追蹤的文件
git ls-files --others --exclude-standard

# 查看已修改但未暫存的文件
git diff --name-only

# 查看所有狀態
git status
```

## 常見原因

### 1. 新創建的文件
- 新頁面（如 `/incidents/new/page.tsx`）
- 新腳本（如 `scripts/deploy-to-github.sh`）
- 新文檔（如 `GITHUB_PUSH.md`）

這些文件需要執行 `git add` 才會被追蹤。

### 2. 修改過的文件
- 已存在的文件被修改
- 需要執行 `git add` 才會被暫存

### 3. 被 .gitignore 忽略的文件
這些文件**不應該**上傳，包括：
- `node_modules/`
- `.next/`
- `dist/`
- `build/`
- `.env` 文件

## 驗證上傳成功

```bash
# 檢查本地與遠程的差異
git log origin/main..HEAD

# 如果沒有輸出，表示已同步
```

## 如果還有問題

1. **檢查 .gitignore**
   ```bash
   cat .gitignore
   ```
   確認不應該上傳的文件已被忽略

2. **檢查遠程倉庫**
   ```bash
   git remote -v
   ```
   確認遠程倉庫 URL 正確

3. **檢查認證**
   - 確保已設定 GitHub Personal Access Token
   - 或已設定 SSH key

4. **查看詳細錯誤**
   ```bash
   git push -u origin main -v
   ```

## 完整流程

```bash
# 1. 進入專案目錄
cd "/Users/kuoyuming/coding/oga ai system"

# 2. 添加所有文件
git add -A

# 3. 提交
git commit -m "feat: 更新系統功能"

# 4. 推送到 GitHub
git push -u origin main
```

如果推送時需要認證：
- **用戶名**：您的 GitHub 用戶名
- **密碼**：使用 Personal Access Token（不是 GitHub 密碼）

取得 Personal Access Token：
1. 前往 https://github.com/settings/tokens
2. 點擊 "Generate new token (classic)"
3. 選擇 `repo` 權限
4. 複製 token 並在推送時作為密碼使用

