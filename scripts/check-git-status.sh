#!/bin/bash

# 檢查 Git 狀態腳本

REPO_DIR="/Users/kuoyuming/coding/oga ai system"
cd "$REPO_DIR"

echo "=========================================="
echo "📊 Git 狀態檢查"
echo "=========================================="
echo ""

# 檢查 Git 是否初始化
if [ -d .git ]; then
  echo "✅ Git 倉庫已初始化"
else
  echo "❌ Git 倉庫尚未初始化"
  echo "   執行: git init"
  exit 1
fi
echo ""

# 檢查用戶設定
echo "👤 Git 用戶資訊："
if [ -n "$(git config user.name)" ]; then
  echo "   姓名: $(git config user.name)"
else
  echo "   ❌ 未設定 user.name"
fi
if [ -n "$(git config user.email)" ]; then
  echo "   Email: $(git config user.email)"
else
  echo "   ❌ 未設定 user.email"
fi
echo ""

# 檢查遠程倉庫
echo "🔗 遠程倉庫："
if git remote get-url origin >/dev/null 2>&1; then
  echo "   ✅ $(git remote get-url origin)"
else
  echo "   ❌ 未設定遠程倉庫"
  echo "   執行: git remote add origin <your-repo-url>"
fi
echo ""

# 檢查暫存區
echo "📝 暫存區狀態："
if git diff --staged --quiet 2>/dev/null; then
  echo "   ✅ 暫存區為空（沒有待提交的變更）"
else
  echo "   ⚠️  有文件在暫存區，等待提交"
  git status --short | head -10
fi
echo ""

# 檢查工作區
echo "📁 工作區狀態："
if git diff --quiet 2>/dev/null; then
  echo "   ✅ 工作區乾淨（沒有未追蹤的變更）"
else
  echo "   ⚠️  有未追蹤的變更"
  git status --short | head -10
fi
echo ""

# 檢查提交歷史
echo "📜 提交歷史："
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
if [ -z "$CURRENT_BRANCH" ]; then
  echo "   ⚠️  尚未建立分支"
else
  echo "   當前分支: $CURRENT_BRANCH"
  COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
  echo "   提交數量: $COMMIT_COUNT"
  if [ "$COMMIT_COUNT" -gt 0 ]; then
    echo "   最新提交:"
    git log -1 --oneline 2>/dev/null || echo "   無法讀取提交歷史"
  fi
fi
echo ""

# 檢查遠程同步狀態
if git remote get-url origin >/dev/null 2>&1; then
  echo "🔄 遠程同步狀態："
  if git fetch origin --dry-run 2>&1 | grep -q "fatal"; then
    echo "   ❌ 無法連接到遠程倉庫"
    echo "   可能原因："
    echo "   - 遠程 URL 錯誤"
    echo "   - 沒有網路連接"
    echo "   - 認證失敗"
  else
    LOCAL_COMMITS=$(git rev-list --count origin/$CURRENT_BRANCH..HEAD 2>/dev/null || echo "0")
    REMOTE_COMMITS=$(git rev-list --count HEAD..origin/$CURRENT_BRANCH 2>/dev/null || echo "0")
    
    if [ "$LOCAL_COMMITS" -gt 0 ]; then
      echo "   ⚠️  有 $LOCAL_COMMITS 個本地提交未推送"
    fi
    if [ "$REMOTE_COMMITS" -gt 0 ]; then
      echo "   ⚠️  有 $REMOTE_COMMITS 個遠程提交未拉取"
    fi
    if [ "$LOCAL_COMMITS" -eq 0 ] && [ "$REMOTE_COMMITS" -eq 0 ]; then
      echo "   ✅ 本地與遠程已同步"
    fi
  fi
fi
echo ""

echo "=========================================="
echo "檢查完成"
echo "=========================================="

