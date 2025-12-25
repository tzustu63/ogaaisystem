# 新手入門指南

本目錄包含快速開始使用 OGA AI System 的所有必要資訊。

## 📚 文檔列表

### 快速開始
- **[QUICK_START.md](../05-deployment/QUICK_START.md)** - 快速開始指南（5 分鐘快速部署）
  - 前置需求
  - 環境設定
  - 啟動服務
  - 驗證安裝

### 認證設置
- **[AUTHENTICATION.md](AUTHENTICATION.md)** - 認證系統設置
  - JWT 配置
  - 用戶權限
  - 角色管理
  - 安全最佳實踐

## 🎯 推薦閱讀順序

1. **第一步**: 閱讀 [快速開始指南](../05-deployment/QUICK_START.md)
2. **第二步**: 設置 [認證系統](AUTHENTICATION.md)
3. **第三步**: 查看 [核心文檔](../02-core/PRD.md) 了解系統功能
4. **第四步**: 參考 [部署文檔](../05-deployment/DOCKER_DEPLOYMENT.md) 進行生產部署

## 💡 常見問題

### Q: 最低系統需求是什麼？
A: Node.js 18+, PostgreSQL 14+, 建議 4GB RAM

### Q: 需要哪些服務？
A:
- 必須: PostgreSQL
- 選配: Redis (快取), MinIO (檔案儲存)

### Q: 如何快速測試系統？
A: 使用 Docker Compose 一鍵啟動所有服務

## 🔗 相關連結

- [完整部署指南](../05-deployment/DOCKER_DEPLOYMENT.md)
- [故障排除](../05-deployment/TROUBLESHOOTING.md)
- [開發指南](../04-development/README.md)
