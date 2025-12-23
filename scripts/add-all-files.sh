#!/bin/bash

# 添加所有文件並顯示狀態

REPO_DIR="/Users/kuoyuming/coding/oga ai system"
cd "$REPO_DIR"

echo "=========================================="
echo "📦 添加所有文件到 Git"
echo "=========================================="
echo ""

# 檢查是否為 Git 倉庫
if [ ! -d .git ]; then
  echo "❌ 錯誤：尚未初始化 Git 倉庫"
  echo "執行: git init"
  exit 1
fi

# 顯示未追蹤的文件
echo "🔍 檢查未追蹤的文件..."
UNTRACKED=$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')
echo "發現 $UNTRACKED 個未追蹤的文件"
echo ""

if [ "$UNTRACKED" -gt 0 ]; then
  echo "未追蹤的文件列表："
  git ls-files --others --exclude-standard | head -20
  if [ "$UNTRACKED" -gt 20 ]; then
    echo "... 還有 $((UNTRACKED - 20)) 個文件"
  fi
  echo ""
fi

# 顯示已修改但未暫存的文件
echo "🔍 檢查已修改的文件..."
MODIFIED=$(git diff --name-only | wc -l | tr -d ' ')
echo "發現 $MODIFIED 個已修改的文件"
echo ""

# 添加所有文件
echo "📝 添加所有文件到暫存區..."
git add -A

# 顯示狀態
echo ""
echo "📊 當前狀態："
git status --short | head -50

TOTAL=$(git status --short | wc -l | tr -d ' ')
echo ""
echo "總共有 $TOTAL 個文件在暫存區"
echo ""

# 詢問是否提交
read -p "是否現在提交這些變更？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "💾 提交變更..."
  git commit -m "feat: 添加所有項目文件

- 添加前端和後端源代碼
- 添加配置文件
- 添加文檔和腳本
- 更新系統功能"
  
  echo ""
  echo "✅ 提交完成！"
  echo ""
  echo "📤 要推送到 GitHub，請執行："
  echo "   git push -u origin main"
else
  echo ""
  echo "✅ 文件已添加到暫存區，但尚未提交"
  echo ""
  echo "要提交，請執行："
  echo "   git commit -m 'your commit message'"
fi

