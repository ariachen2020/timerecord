# ✅ 備份系統設定完成

## 🎉 恭喜！您的自動備份系統已經設定完成

### 📋 已完成的設定

#### 1. Zeabur 內建備份
- ✅ 已開啟 Zeabur 自動備份（每天執行）

#### 2. 本地異地備份
- ✅ 已安裝 PostgreSQL 18 客戶端工具
- ✅ 已建立 `scripts/backup/zeabur.env` 檔案
- ✅ 已設定每週日凌晨 2:00 自動備份
- ✅ 備份保留 30 天
- ✅ 首次備份已成功完成

### 📊 備份策略

| 備份類型 | 頻率 | 保留天數 | 位置 |
|---------|------|---------|------|
| Zeabur 內建 | 每天 | 視 Zeabur 設定 | Zeabur 平台 |
| 本地備份 | 每週日凌晨 2:00 | 30 天 | `backups/zeabur/` |

### 📁 備份檔案位置

```
backups/zeabur/
├── zeabur_backup_20251226_203447.sql.gz  ← 已完成的第一次備份
└── backup.log                             ← 備份日誌（自動建立）
```

### 🔧 常用指令

#### 手動執行備份
```bash
cd scripts/backup
./zeabur-backup-auto.sh
```

#### 查看自動備份排程
```bash
crontab -l
```

#### 列出所有備份
```bash
ls -lh backups/zeabur/
```

#### 查看備份日誌
```bash
tail -f backups/zeabur/backup.log
```

#### 還原備份
```bash
cd scripts/backup
./restore.sh ../../backups/zeabur/zeabur_backup_20251226_203447.sql.gz
```

### 📅 自動備份排程

```
每週日凌晨 2:00 自動執行備份
```

crontab 設定：
```cron
0 2 * * 0 ./zeabur-backup-auto.sh >> /Users/aria/timerecord/backups/zeabur/backup.log 2>&1
```

### ⚙️ 技術細節

- **PostgreSQL 版本**：18.1
- **備份工具**：pg_dump
- **壓縮格式**：gzip
- **備份參數**：`--no-sync --no-owner --no-acl`

### 🛡️ 安全性

- ✅ `zeabur.env` 已加入 `.gitignore`（不會上傳到 Git）
- ✅ 備份檔案已加入 `.gitignore`（不會上傳到 Git）
- ✅ DATABASE_URL 包含敏感資訊，已妥善保護

### 📝 維護建議

#### 每月檢查
```bash
# 檢查備份是否正常執行
ls -lh backups/zeabur/

# 查看最近的備份日誌
tail -20 backups/zeabur/backup.log
```

#### 每季測試還原
建議每 3 個月測試一次還原流程，確保備份可用：
```bash
# 1. 建立測試資料庫
createdb timerecord_test

# 2. 還原到測試資料庫（修改 DATABASE_URL 指向測試庫）
./restore.sh ../../backups/zeabur/zeabur_backup_YYYYMMDD_HHMMSS.sql.gz

# 3. 驗證資料完整性
psql timerecord_test -c "SELECT COUNT(*) FROM employees;"

# 4. 刪除測試資料庫
dropdb timerecord_test
```

### 🔄 修改備份頻率

如果想改變備份頻率：

```bash
# 編輯 crontab
crontab -e
```

常用時間設定：
- 每天凌晨 2:00：`0 2 * * *`
- 每週日凌晨 2:00：`0 2 * * 0`（目前設定）
- 每月 1 號凌晨 2:00：`0 2 1 * *`

### ⚠️ 重要提醒

1. **確保電腦在備份時間開機**
   - cron 只在電腦開機時執行
   - 如果週日凌晨 2:00 電腦關機，備份不會執行

2. **定期檢查備份**
   - 每月查看一次 `backups/zeabur/` 確保有新備份產生

3. **磁碟空間**
   - 備份檔案會自動刪除超過 30 天的舊檔案
   - 每個備份約 3-4KB（目前資料量）

4. **DATABASE_URL 更新**
   - 如果 Zeabur 的 DATABASE_URL 變更，需要更新 `scripts/backup/zeabur.env`

### 📞 需要協助？

請參閱：
- `scripts/backup/README.md` - 完整備份說明
- `scripts/backup/ZEABUR_SETUP.md` - Zeabur 設定指引
- `README.md` - 專案主要文件

### 🎯 下次備份時間

**2025年1月5日（週日）凌晨 2:00**

您可以隨時手動執行 `./zeabur-backup-auto.sh` 來立即備份！

---

✅ 備份系統設定完成日期：2025-12-26
✅ 首次備份：zeabur_backup_20251226_203447.sql.gz (3.0K)
