#!/bin/bash

# ============================================
# 補休登錄系統 - 資料庫備份腳本
# ============================================
# 功能：自動備份 PostgreSQL 資料庫
# 使用方式：./backup.sh [保留天數，預設30天]
# ============================================

set -e  # 遇到錯誤立即停止

# 設定變數
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS=${1:-30}  # 預設保留 30 天
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="timerecord_backup_$TIMESTAMP.sql"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# 載入環境變數
if [ -f "$PROJECT_ROOT/api/.env" ]; then
    export $(cat "$PROJECT_ROOT/api/.env" | grep -v '^#' | xargs)
else
    echo "❌ 錯誤：找不到 api/.env 檔案"
    exit 1
fi

# 檢查 DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ 錯誤：DATABASE_URL 未設定"
    exit 1
fi

# 建立備份目錄
mkdir -p "$BACKUP_DIR"

echo "================================================"
echo "🔄 開始備份資料庫..."
echo "================================================"
echo "時間：$(date '+%Y-%m-%d %H:%M:%S')"
echo "資料庫：${DATABASE_URL#*@}"  # 只顯示 host 部分
echo "備份位置：$BACKUP_PATH"
echo "保留天數：$RETENTION_DAYS 天"
echo "================================================"

# 執行備份
echo "📦 正在備份資料庫..."
if pg_dump "$DATABASE_URL" > "$BACKUP_PATH"; then
    # 計算檔案大小
    FILE_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    echo "✅ 備份成功！"
    echo "   檔案：$BACKUP_FILE"
    echo "   大小：$FILE_SIZE"

    # 壓縮備份檔案
    echo "🗜️  正在壓縮備份檔案..."
    gzip "$BACKUP_PATH"
    COMPRESSED_SIZE=$(du -h "$BACKUP_PATH.gz" | cut -f1)
    echo "✅ 壓縮完成！"
    echo "   壓縮後：$COMPRESSED_SIZE"
else
    echo "❌ 備份失敗！"
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
done < <(find "$BACKUP_DIR" -name "timerecord_backup_*.sql.gz" -mtime +$RETENTION_DAYS)

if [ $DELETED_COUNT -gt 0 ]; then
    echo "✅ 已刪除 $DELETED_COUNT 個舊備份"
else
    echo "ℹ️  沒有需要清理的舊備份"
fi

# 顯示目前所有備份
echo ""
echo "📋 目前備份清單："
ls -lh "$BACKUP_DIR" | grep "timerecord_backup_" | awk '{print "   " $9 " (" $5 ")"}'

echo ""
echo "================================================"
echo "✅ 備份完成！"
echo "================================================"

# 回傳備份檔案路徑（供其他腳本使用）
echo "$BACKUP_PATH.gz"
