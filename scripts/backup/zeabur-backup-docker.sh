#!/bin/bash

# ============================================
# Zeabur 自動備份腳本（使用 Docker）
# ============================================
# 使用 Docker 來執行 pg_dump，避免版本不一致問題
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups/zeabur"
ENV_FILE="$SCRIPT_DIR/zeabur.env"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="zeabur_backup_$TIMESTAMP.sql"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    echo "❌ 錯誤：Docker 未安裝"
    echo "請先安裝 Docker：https://www.docker.com/products/docker-desktop"
    exit 1
fi

# 檢查環境變數檔案
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 錯誤：找不到 zeabur.env 檔案"
    exit 1
fi

# 載入環境變數
export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

# 檢查 DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ 錯誤：zeabur.env 中未設定 DATABASE_URL"
    exit 1
fi

# 建立備份目錄
mkdir -p "$BACKUP_DIR"

echo "================================================"
echo "🔄 Zeabur 資料庫自動備份 (Docker)"
echo "================================================"
echo "時間：$(date '+%Y-%m-%d %H:%M:%S')"
echo "資料庫：${DATABASE_URL#*@}"
echo "備份位置：$BACKUP_PATH"
echo "保留天數：$RETENTION_DAYS 天"
echo "================================================"

# 使用 Docker 執行備份（使用 PostgreSQL 18 映像）
echo "📦 正在備份資料庫..."
if docker run --rm \
    -e PGPASSWORD="${DATABASE_URL#*:*:*@*}" \
    postgres:18-alpine \
    pg_dump "$DATABASE_URL" \
    --no-owner --no-acl > "$BACKUP_PATH" 2>&1; then

    FILE_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    echo "✅ 備份成功！"
    echo "   檔案：$BACKUP_FILE"
    echo "   大小：$FILE_SIZE"

    # 壓縮備份
    echo "🗜️  正在壓縮..."
    gzip "$BACKUP_PATH"
    COMPRESSED_SIZE=$(du -h "$BACKUP_PATH.gz" | cut -f1)
    echo "✅ 壓縮完成！壓縮後：$COMPRESSED_SIZE"
else
    echo "❌ 備份失敗"
    exit 1
fi

# 清理舊備份
echo ""
echo "🧹 清理超過 $RETENTION_DAYS 天的舊備份..."
DELETED_COUNT=0
while IFS= read -r old_file; do
    rm -f "$old_file"
    echo "   已刪除：$(basename "$old_file")"
    ((DELETED_COUNT++))
done < <(find "$BACKUP_DIR" -name "zeabur_backup_*.sql.gz" -mtime +$RETENTION_DAYS 2>/dev/null)

if [ $DELETED_COUNT -gt 0 ]; then
    echo "✅ 已刪除 $DELETED_COUNT 個舊備份"
else
    echo "ℹ️  沒有需要清理的舊備份"
fi

# 顯示備份清單
echo ""
echo "📋 目前備份清單："
if ls "$BACKUP_DIR"/zeabur_backup_*.sql.gz 1> /dev/null 2>&1; then
    ls -lh "$BACKUP_DIR" | grep "zeabur_backup_" | awk '{print "   " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'
else
    echo "   (無備份檔案)"
fi

echo ""
echo "================================================"
echo "✅ 備份完成！"
echo "   位置：$BACKUP_PATH.gz"
echo "================================================"
