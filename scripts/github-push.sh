#!/bin/bash

# GitHub 推送腳本
# 使用方式：./scripts/github-push.sh [repository-url]

set -e

REPO_DIR="/Users/kuoyuming/coding/oga ai system"
cd "$REPO_DIR"

echo "📦 準備推送到 GitHub..."

# 檢查是否已初始化 git
if [ ! -d .git ]; then
  echo "初始化 Git 倉庫..."
  git init
fi

# 檢查是否有遠程倉庫
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$REMOTE_URL" ] && [ -n "$1" ]; then
  echo "設定遠程倉庫: $1"
  git remote add origin "$1"
elif [ -z "$REMOTE_URL" ]; then
  echo "⚠️  尚未設定遠程倉庫"
  echo "請先建立 GitHub 倉庫，然後執行："
  echo "  git remote add origin <your-repo-url>"
  echo "或執行："
  echo "  ./scripts/github-push.sh <your-repo-url>"
  exit 1
fi

# 設定 git 用戶資訊（如果尚未設定）
if [ -z "$(git config user.name)" ]; then
  echo "⚠️  尚未設定 git user.name，請執行："
  echo "  git config --global user.name 'Your Name'"
  echo "  git config --global user.email 'your.email@example.com'"
fi

# 添加所有文件
echo "添加文件..."
git add -A

# 檢查是否有變更
if git diff --staged --quiet; then
  echo "✅ 沒有需要提交的變更"
else
  # 提交變更
  echo "提交變更..."
  git commit -m "feat: 更新系統功能

- 修復看板分組顯示問題
- 新增緊急事件管理功能
- 新增緊急事件建立頁面
- 更新看板寬度設定
- 將 Incident 管理改名為緊急事件管理"

  # 推送到 GitHub
  echo "推送到 GitHub..."
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
  
  # 如果分支不存在，創建 main 分支
  if [ -z "$CURRENT_BRANCH" ]; then
    git branch -M main
    CURRENT_BRANCH="main"
  fi
  
  # 嘗試推送
  if git push -u origin "$CURRENT_BRANCH" 2>/dev/null; then
    echo "✅ 成功推送到 GitHub!"
  else
    echo "⚠️  推送失敗，可能是遠程倉庫不存在或沒有權限"
    echo "請確認："
    echo "1. GitHub 倉庫已建立"
    echo "2. 已設定正確的遠程 URL"
    echo "3. 已配置 SSH 或 Personal Access Token"
  fi
fi

echo "完成！"

