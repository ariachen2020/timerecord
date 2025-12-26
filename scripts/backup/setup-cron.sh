#!/bin/bash

# ============================================
# 補休登錄系統 - Cron 自動備份設定腳本
# ============================================
# 功能：設定每日自動備份排程
# 使用方式：./setup-cron.sh
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"

echo "================================================"
echo "🔧 設定自動備份排程"
echo "================================================"
echo "專案路徑：$PROJECT_ROOT"
echo "備份腳本：$BACKUP_SCRIPT"
echo ""

# 檢查備份腳本是否存在
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ 錯誤：找不到備份腳本：$BACKUP_SCRIPT"
    exit 1
fi

# 檢查是否已經有設定
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "⚠️  警告：已經存在自動備份排程"
    echo ""
    crontab -l | grep "$BACKUP_SCRIPT"
    echo ""
    read -p "是否要更新設定？(yes/no) " -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "❌ 已取消設定"
        exit 0
    fi

    # 移除舊的設定
    crontab -l | grep -v "$BACKUP_SCRIPT" | crontab -
    echo "✅ 已移除舊的排程設定"
fi

echo "請選擇備份時間："
echo "1) 每日凌晨 2:00"
echo "2) 每日凌晨 3:00"
echo "3) 每日凌晨 4:00"
echo "4) 每 6 小時執行一次"
echo "5) 每 12 小時執行一次"
echo "6) 自訂時間"
echo ""
read -p "請選擇 (1-6): " -r CHOICE
echo ""

case $CHOICE in
    1)
        CRON_TIME="0 2 * * *"
        DESCRIPTION="每日凌晨 2:00"
        ;;
    2)
        CRON_TIME="0 3 * * *"
        DESCRIPTION="每日凌晨 3:00"
        ;;
    3)
        CRON_TIME="0 4 * * *"
        DESCRIPTION="每日凌晨 4:00"
        ;;
    4)
        CRON_TIME="0 */6 * * *"
        DESCRIPTION="每 6 小時"
        ;;
    5)
        CRON_TIME="0 */12 * * *"
        DESCRIPTION="每 12 小時"
        ;;
    6)
        echo "請輸入 cron 時間表達式 (例如：0 2 * * * 代表每日 2:00)"
        read -p "cron 時間: " -r CRON_TIME
        DESCRIPTION="自訂時間：$CRON_TIME"
        ;;
    *)
        echo "❌ 無效的選擇"
        exit 1
        ;;
esac

echo ""
read -p "請輸入備份保留天數 (預設 30): " -r RETENTION_DAYS
RETENTION_DAYS=${RETENTION_DAYS:-30}

# 建立 cron job
CRON_JOB="$CRON_TIME $BACKUP_SCRIPT $RETENTION_DAYS >> $PROJECT_ROOT/backups/backup.log 2>&1"

echo ""
echo "即將新增以下排程："
echo "  時間：$DESCRIPTION"
echo "  保留天數：$RETENTION_DAYS 天"
echo "  命令：$CRON_JOB"
echo ""
read -p "確定要新增嗎？(yes/no) " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ 已取消設定"
    exit 0
fi

# 新增到 crontab
(crontab -l 2>/dev/null; echo "# 補休登錄系統自動備份 - $DESCRIPTION"; echo "$CRON_JOB") | crontab -

echo "✅ 排程設定完成！"
echo ""
echo "================================================"
echo "📋 目前的排程設定："
echo "================================================"
crontab -l | grep -A 1 "補休登錄系統"
echo ""
echo "================================================"
echo "📝 管理指令："
echo "================================================"
echo "查看排程：crontab -l"
echo "編輯排程：crontab -e"
echo "移除排程：crontab -r"
echo "查看日誌：tail -f $PROJECT_ROOT/backups/backup.log"
echo ""
echo "✅ 設定完成！"
