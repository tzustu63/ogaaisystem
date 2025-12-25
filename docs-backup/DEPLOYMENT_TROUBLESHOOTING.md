# GitHub 部署故障排除指南

## 快速診斷

執行以下命令檢查當前狀態：

```bash
cd "/Users/kuoyuming/coding/oga ai system"

# 檢查 Git 是否初始化
ls -la .git

# 檢查 Git 狀態
git status

# 檢查遠程倉庫
git remote -v

# 檢查提交歷史
git log --oneline -5
```

## 常見問題與解決方法

### 1. Git 尚未初始化

**症狀：** `fatal: not a git repository`

**解決方法：**
```bash
git init
```

### 2. 未設定 Git 用戶資訊

**症狀：** 提交時提示需要設定 user.name 和 user.email

**解決方法：**
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3. 未設定遠程倉庫

**症狀：** `fatal: no upstream branch` 或 `fatal: 'origin' does not appear to be a git repository`

**解決方法：**
```bash
# 先建立 GitHub 倉庫，然後執行：
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 或使用 SSH：
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
```

### 4. 推送被拒絕 - 認證失敗

**症狀：** `Permission denied` 或 `Authentication failed`

**解決方法：**

#### 方法 A：使用 Personal Access Token
1. 前往 https://github.com/settings/tokens
2. 建立新的 token（選擇 `repo` 權限）
3. 推送時使用 token 作為密碼：
```bash
git push -u origin main
# Username: your_username
# Password: your_personal_access_token
```

#### 方法 B：使用 SSH Key
1. 檢查是否已有 SSH key：
```bash
ls -la ~/.ssh
```

2. 如果沒有，建立新的 SSH key：
```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
```

3. 將公鑰添加到 GitHub：
```bash
cat ~/.ssh/id_ed25519.pub
# 複製輸出內容，添加到 https://github.com/settings/keys
```

4. 更改遠程 URL 為 SSH：
```bash
git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
```

### 5. 推送被拒絕 - 遠程有變更

**症狀：** `Updates were rejected because the remote contains work`

**解決方法：**
```bash
# 先拉取遠程變更
git pull origin main --allow-unrelated-histories

# 解決衝突後再推送
git push -u origin main
```

### 6. 分支名稱問題

**症狀：** `error: src refspec main does not match any`

**解決方法：**
```bash
# 檢查當前分支
git branch

# 如果沒有分支，先提交一次
git add -A
git commit -m "Initial commit"

# 建立並切換到 main 分支
git branch -M main
```

## 完整部署流程

### 步驟 1：準備 GitHub 倉庫
1. 前往 https://github.com/new
2. 建立新倉庫（例如：`oga-ai-system`）
3. **不要**初始化 README、.gitignore 或 license

### 步驟 2：初始化本地 Git
```bash
cd "/Users/kuoyuming/coding/oga ai system"

# 初始化（如果尚未初始化）
git init

# 設定用戶資訊（如果尚未設定）
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 步驟 3：添加並提交文件
```bash
# 添加所有文件
git add -A

# 檢查狀態
git status

# 提交
git commit -m "feat: 初始提交 - 高等教育國際化策略執行管理系統"
```

### 步驟 4：連接遠程倉庫
```bash
# 添加遠程倉庫
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 驗證
git remote -v
```

### 步驟 5：推送到 GitHub
```bash
# 建立 main 分支（如果尚未建立）
git branch -M main

# 推送
git push -u origin main
```

## 使用提供的腳本

### 檢查狀態
```bash
./scripts/check-git-status.sh
```

### 自動部署
```bash
# 需要先建立 GitHub 倉庫
./scripts/deploy-to-github.sh https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

## 驗證部署成功

部署成功後，您應該能夠：
1. 在 GitHub 上看到您的倉庫
2. 看到所有文件都已上傳
3. 看到提交歷史

檢查命令：
```bash
# 檢查遠程狀態
git remote show origin

# 檢查本地與遠程的差異
git log origin/main..HEAD
```

## 需要幫助？

如果以上方法都無法解決問題，請提供：
1. 錯誤訊息的完整內容
2. 執行 `git status` 的輸出
3. 執行 `git remote -v` 的輸出
4. 執行 `./scripts/check-git-status.sh` 的輸出

