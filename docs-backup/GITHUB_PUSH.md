# 推送到 GitHub 指南

## 方法一：使用提供的腳本（推薦）

1. **建立 GitHub 倉庫**
   - 前往 https://github.com/new
   - 建立一個新的倉庫（例如：`oga-ai-system`）
   - 不要初始化 README、.gitignore 或 license（因為本地已有）

2. **執行推送腳本**
   ```bash
   ./scripts/github-push.sh https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

## 方法二：手動執行 Git 命令

### 1. 初始化 Git 倉庫（如果尚未初始化）

```bash
cd "/Users/kuoyuming/coding/oga ai system"
git init
```

### 2. 設定 Git 用戶資訊（如果尚未設定）

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3. 添加所有文件

```bash
git add -A
```

### 4. 提交變更

```bash
git commit -m "feat: 更新系統功能

- 修復看板分組顯示問題
- 新增緊急事件管理功能
- 新增緊急事件建立頁面
- 更新看板寬度設定
- 將 Incident 管理改名為緊急事件管理"
```

### 5. 建立 GitHub 倉庫並設定遠程

```bash
# 建立 GitHub 倉庫後，執行：
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 或使用 SSH（如果已設定 SSH key）：
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
```

### 6. 推送到 GitHub

```bash
# 建立並切換到 main 分支
git branch -M main

# 推送到 GitHub
git push -u origin main
```

## 方法三：使用 GitHub CLI

如果已安裝 GitHub CLI (`gh`):

```bash
# 登入 GitHub
gh auth login

# 建立並推送倉庫
cd "/Users/kuoyuming/coding/oga ai system"
git init
git add -A
git commit -m "feat: 初始提交"
gh repo create oga-ai-system --public --source=. --remote=origin --push
```

## 注意事項

1. **敏感資訊**：確保 `.env` 文件已在 `.gitignore` 中（已包含）
2. **大文件**：如果倉庫很大，考慮使用 Git LFS
3. **認證**：推送時可能需要輸入 GitHub 用戶名和密碼，或使用 Personal Access Token

## 如果遇到問題

### 推送被拒絕
- 確認遠程倉庫已建立
- 檢查是否有權限推送到該倉庫
- 如果遠程倉庫有內容，可能需要先拉取：`git pull origin main --allow-unrelated-histories`

### 認證問題
- 使用 Personal Access Token 代替密碼
- 或設定 SSH key：https://docs.github.com/en/authentication/connecting-to-github-with-ssh

