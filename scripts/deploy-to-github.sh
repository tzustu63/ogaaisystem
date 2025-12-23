#!/bin/bash

# GitHub 部署腳本 - 帶詳細輸出和錯誤檢查
# 使用方式：./scripts/deploy-to-github.sh [repository-url]

set -e  # 遇到錯誤立即停止

REPO_DIR="/Users/kuoyuming/coding/oga ai system"
cd "$REPO_DIR"

echo "=========================================="
echo "🚀 開始部署到 GitHub"
echo "=========================================="
echo ""

# 檢查目錄是否存在
if [ ! -d "$REPO_DIR" ]; then
  echo "❌ 錯誤：找不到專案目錄: $REPO_DIR"
  exit 1
fi

echo "📁 當前目錄: $(pwd)"
echo ""

# 1. 初始化 Git（如果尚未初始化）
if [ ! -d .git ]; then
  echo "📦 初始化 Git 倉庫..."
  git init
  echo "✅ Git 倉庫已初始化"
else
  echo "✅ Git 倉庫已存在"
fi
echo ""

# 2. 檢查 Git 用戶設定
if [ -z "$(git config user.name)" ]; then
  echo "⚠️  警告：尚未設定 git user.name"
  echo "請執行以下命令設定："
  echo "  git config --global user.name 'Your Name'"
  echo "  git config --global user.email 'your.email@example.com'"
  echo ""
  read -p "是否現在設定？(y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "輸入您的姓名: " USER_NAME
    read -p "輸入您的 Email: " USER_EMAIL
    git config user.name "$USER_NAME"
    git config user.email "$USER_EMAIL"
    echo "✅ Git 用戶資訊已設定"
  else
    echo "⚠️  請先設定 Git 用戶資訊後再繼續"
    exit 1
  fi
else
  echo "✅ Git 用戶資訊已設定: $(git config user.name) <$(git config user.email)>"
fi
echo ""

# 3. 檢查遠程倉庫
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$REMOTE_URL" ]; then
  if [ -n "$1" ]; then
    echo "🔗 設定遠程倉庫: $1"
    git remote add origin "$1"
    REMOTE_URL="$1"
  else
    echo "❌ 錯誤：尚未設定遠程倉庫"
    echo ""
    echo "請先建立 GitHub 倉庫，然後執行："
    echo "  ./scripts/deploy-to-github.sh https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
    echo ""
    echo "或手動執行："
    echo "  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
    exit 1
  fi
else
  echo "✅ 遠程倉庫已設定: $REMOTE_URL"
fi
echo ""

# 4. 添加所有文件
echo "📝 添加文件到暫存區..."
git add -A
echo "✅ 文件已添加"
echo ""

# 5. 檢查是否有變更
if git diff --staged --quiet 2>/dev/null; then
  echo "ℹ️  沒有需要提交的變更"
  
  # 檢查是否有未推送的提交
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
  if [ -z "$CURRENT_BRANCH" ]; then
    git branch -M main 2>/dev/null || true
    CURRENT_BRANCH="main"
  fi
  
  LOCAL_COMMITS=$(git rev-list --count origin/$CURRENT_BRANCH..HEAD 2>/dev/null || echo "0")
  if [ "$LOCAL_COMMITS" -gt 0 ]; then
    echo "📤 發現 $LOCAL_COMMITS 個未推送的提交，正在推送..."
    git push -u origin "$CURRENT_BRANCH"
    echo "✅ 推送成功！"
  else
    echo "✅ 所有變更已同步到 GitHub"
  fi
else
  # 6. 提交變更
  echo "💾 提交變更..."
  git commit -m "feat: 更新系統功能

- 修復看板分組顯示問題
- 新增緊急事件管理功能
- 新增緊急事件建立頁面
- 更新看板寬度設定
- 將 Incident 管理改名為緊急事件管理" || {
    echo "❌ 提交失敗"
    exit 1
  }
  echo "✅ 變更已提交"
  echo ""

  # 7. 推送到 GitHub
  echo "📤 推送到 GitHub..."
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
  
  # 如果分支不存在，創建 main 分支
  if [ -z "$CURRENT_BRANCH" ]; then
    git branch -M main
    CURRENT_BRANCH="main"
  fi
  
  # 嘗試推送
  if git push -u origin "$CURRENT_BRANCH" 2>&1; then
    echo ""
    echo "=========================================="
    echo "✅ 成功推送到 GitHub!"
    echo "=========================================="
    echo ""
    echo "🌐 倉庫地址: $REMOTE_URL"
  else
    echo ""
    echo "=========================================="
    echo "❌ 推送失敗"
    echo "=========================================="
    echo ""
    echo "可能的原因："
    echo "1. GitHub 倉庫不存在或 URL 錯誤"
    echo "2. 沒有推送權限"
    echo "3. 需要設定認證（SSH key 或 Personal Access Token）"
    echo ""
    echo "解決方法："
    echo "1. 確認 GitHub 倉庫已建立"
    echo "2. 檢查遠程 URL: git remote -v"
    echo "3. 設定認證："
    echo "   - SSH: https://docs.github.com/en/authentication/connecting-to-github-with-ssh"
    echo "   - Token: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
    exit 1
  fi
fi

echo ""
echo "✨ 部署完成！"

