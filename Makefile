.PHONY: help build up down logs clean migrate

help: ## 顯示此說明
	@echo "可用的命令："
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## 建置所有 Docker 映像
	docker-compose build

up: ## 啟動所有服務
	docker-compose up -d

down: ## 停止所有服務
	docker-compose down

logs: ## 查看所有服務日誌
	docker-compose logs -f

logs-backend: ## 查看後端日誌
	docker-compose logs -f backend

logs-db: ## 查看資料庫日誌
	docker-compose logs -f postgres

clean: ## 停止並刪除所有容器、volumes
	docker-compose down -v

migrate: ## 手動執行資料庫遷移
	docker exec -it oga-backend npm run migrate $(FILE)

shell-backend: ## 進入後端容器
	docker exec -it oga-backend sh

shell-db: ## 進入資料庫容器
	docker exec -it oga-postgres psql -U postgres -d oga_ai_system

restart: ## 重啟所有服務
	docker-compose restart

rebuild: ## 重建並啟動所有服務
	docker-compose up -d --build

status: ## 查看服務狀態
	docker-compose ps

dev-services: ## 僅啟動基礎服務（資料庫、Redis、MinIO）
	docker-compose -f docker-compose.dev.yml up -d

dev-services-down: ## 停止基礎服務
	docker-compose -f docker-compose.dev.yml down

