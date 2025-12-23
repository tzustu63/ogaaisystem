#!/bin/bash

# 提交所有變更的腳本

REPO_DIR="/Users/kuoyuming/coding/oga ai system"
cd "$REPO_DIR"

echo "=========================================="
echo "📦 提交所有變更到 Git"
echo "=========================================="
echo ""

# 檢查是否為 Git 倉庫
if [ ! -d .git ]; then
  echo "初始化 Git 倉庫..."
  git init
fi

# 添加所有文件（包括新文件和修改的文件）
echo "📝 添加所有文件..."
git add -A

# 顯示狀態
echo ""
echo "📊 暫存區狀態："
git status --short

# 統計
STAGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')

echo ""
echo "✅ 已暫存 $STAGED 個文件"
if [ "$UNTRACKED" -gt 0 ]; then
  echo "⚠️  還有 $UNTRACKED 個未追蹤的文件（可能被 .gitignore 忽略）"
fi
echo ""

# 檢查是否有變更需要提交
if git diff --staged --quiet; then
  echo "ℹ️  沒有需要提交的變更"
  
  # 檢查是否有未推送的提交
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    LOCAL=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
    if [ "$LOCAL" -gt 0 ]; then
      echo "📤 發現 $LOCAL 個未推送的提交"
      echo ""
      read -p "是否現在推送到 GitHub？(y/n) " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push -u origin main
      fi
    fi
  fi
else
  # 提交變更
  echo "💾 提交變更..."
  git commit -m "feat: 更新系統功能

- 修復看板分組顯示問題
- 新增緊急事件管理功能
- 新增緊急事件建立頁面
- 更新看板寬度設定
- 將 Incident 管理改名為緊急事件管理
- 添加所有項目文件"

  echo ""
  echo "✅ 提交完成！"
  echo ""
  
  # 檢查是否有遠程倉庫
  if git remote get-url origin >/dev/null 2>&1; then
    read -p "是否現在推送到 GitHub？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo ""
      echo "📤 推送到 GitHub..."
      git push -u origin main
      echo ""
      echo "✅ 推送完成！"
    else
      echo ""
      echo "💡 稍後可以執行以下命令推送："
      echo "   git push -u origin main"
    fi
  else
    echo "⚠️  尚未設定遠程倉庫"
    echo ""
    echo "請先建立 GitHub 倉庫，然後執行："
    echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
    echo "   git push -u origin main"
  fi
fi

echo ""
echo "✨ 完成！"

