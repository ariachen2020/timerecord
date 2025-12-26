#!/bin/bash

# ============================================
# 補休登錄系統 - 資料庫還原腳本
# ============================================
# 功能：從備份檔案還原 PostgreSQL 資料庫
# 使用方式：./restore.sh <備份檔案路徑>
# 範例：./restore.sh ../../backups/timerecord_backup_20231226_120000.sql.gz
# ============================================

set -e  # 遇到錯誤立即停止

# 檢查參數
if [ $# -eq 0 ]; then
    echo "❌ 錯誤：請提供備份檔案路徑"
    echo "使用方式：$0 <備份檔案路徑>"
    echo ""
    echo "範例："
    echo "  $0 ../../backups/timerecord_backup_20231226_120000.sql.gz"
    echo ""

    # 列出可用的備份檔案
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    BACKUP_DIR="$PROJECT_ROOT/backups"

    if [ -d "$BACKUP_DIR" ]; then
        echo "📋 可用的備份檔案："
        ls -lh "$BACKUP_DIR" | grep "timerecord_backup_.*\.gz" | awk '{print "   " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'
    fi

    exit 1
fi

BACKUP_FILE="$1"

# 檢查備份檔案是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 錯誤：備份檔案不存在：$BACKUP_FILE"
    exit 1
fi

# 設定變數
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

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

echo "================================================"
echo "⚠️  警告：資料庫還原"
echo "================================================"
echo "即將還原的備份：$(basename "$BACKUP_FILE")"
echo "目標資料庫：${DATABASE_URL#*@}"  # 只顯示 host 部分
echo ""
echo "⚠️  這個操作將會："
echo "   1. 刪除目前資料庫中的所有資料表"
echo "   2. 從備份檔案還原所有資料"
echo "   3. 無法復原！"
echo ""
read -p "確定要繼續嗎？(yes/no) " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ 已取消還原操作"
    exit 0
fi

# 再次確認
read -p "請再次確認（輸入 YES 繼續）：" -r
echo ""

if [[ ! $REPLY == "YES" ]]; then
    echo "❌ 已取消還原操作"
    exit 0
fi

echo "================================================"
echo "🔄 開始還原資料庫..."
echo "================================================"
echo "時間：$(date '+%Y-%m-%d %H:%M:%S')"

# 解壓縮檔案（如果是 .gz）
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "📦 正在解壓縮備份檔案..."
    TEMP_SQL="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"
    SQL_FILE="$TEMP_SQL"
    CLEANUP_TEMP=true
else
    SQL_FILE="$BACKUP_FILE"
    CLEANUP_TEMP=false
fi

# 執行還原
echo "🔄 正在還原資料庫..."
if psql "$DATABASE_URL" < "$SQL_FILE"; then
    echo "✅ 還原成功！"
else
    echo "❌ 還原失敗！"

    # 清理暫存檔
    if [ "$CLEANUP_TEMP" = true ]; then
        rm -f "$TEMP_SQL"
    fi

    exit 1
fi

# 清理暫存檔
if [ "$CLEANUP_TEMP" = true ]; then
    rm -f "$TEMP_SQL"
fi

# 驗證還原結果
echo ""
echo "🔍 驗證還原結果..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "   資料表數量：$TABLE_COUNT"

echo ""
echo "📋 資料表清單："
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

echo ""
echo "================================================"
echo "✅ 還原完成！"
echo "================================================"
