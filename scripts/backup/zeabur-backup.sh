#!/bin/bash

# ============================================
# Zeabur 部署環境 - 資料庫備份腳本
# ============================================
# 功能：連線到 Zeabur PostgreSQL 進行備份
# 使用方式：./zeabur-backup.sh
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups/zeabur"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="zeabur_backup_$TIMESTAMP.sql"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# 建立備份目錄
mkdir -p "$BACKUP_DIR"

echo "================================================"
echo "🔄 Zeabur 資料庫備份"
echo "================================================"
echo "時間：$(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "請提供 Zeabur PostgreSQL 連線資訊："
echo ""

# 讀取資料庫連線 URL
read -p "DATABASE_URL (postgresql://user:pass@host:port/db): " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "❌ 錯誤：DATABASE_URL 不能為空"
    exit 1
fi

echo ""
echo "================================================"
echo "📦 開始備份..."
echo "================================================"

# 執行備份
if pg_dump "$DATABASE_URL" > "$BACKUP_PATH"; then
    FILE_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    echo "✅ 備份成功！"
    echo "   檔案：$BACKUP_FILE"
    echo "   大小：$FILE_SIZE"

    # 壓縮備份
    echo "🗜️  壓縮中..."
    gzip "$BACKUP_PATH"
    COMPRESSED_SIZE=$(du -h "$BACKUP_PATH.gz" | cut -f1)
    echo "✅ 壓縮完成：$COMPRESSED_SIZE"
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
ls -lh "$BACKUP_DIR" | grep "zeabur_backup_" | awk '{print "   " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'

echo ""
echo "================================================"
echo "✅ 備份完成！"
echo "   位置：$BACKUP_PATH.gz"
echo "================================================"
