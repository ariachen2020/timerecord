# Zeabur 備份設定指引

## 步驟 1：取得 DATABASE_URL

### 方式 A：從 Zeabur 控制台取得

1. 登入 Zeabur：https://zeabur.com
2. 進入您的專案
3. 點選 **PostgreSQL** 服務
4. 在「Instructions」或「連線資訊」區域找到以下其中一項：
   - **DATABASE_URL**
   - **Connection String**
   - **POSTGRES_URL**

5. 複製完整的連線字串，格式類似：
   ```
   postgresql://username:password@hostname.zeabur.app:5432/dbname
   ```

### 方式 B：使用 Zeabur CLI

```bash
# 安裝 Zeabur CLI（如果尚未安裝）
npm install -g @zeabur/cli

# 登入
zeabur auth login

# 查看環境變數
zeabur env list

# 找到 DATABASE_URL 或 POSTGRES_URL
```

### 方式 C：從 API 服務的環境變數取得

1. 在 Zeabur 控制台進入您的 **API 服務**（不是 PostgreSQL 服務）
2. 點選「Variables」或「環境變數」
3. 找到 `DATABASE_URL` 並複製

## 步驟 2：設定本地備份環境

1. **建立環境變數檔案**
   ```bash
   cd scripts/backup
   cp zeabur.env.example zeabur.env
   ```

2. **編輯 zeabur.env**
   ```bash
   # 使用任何文字編輯器
   nano zeabur.env
   # 或
   vim zeabur.env
   # 或
   code zeabur.env
   ```

3. **填入 DATABASE_URL**
   將檔案內容改為：
   ```env
   DATABASE_URL=postgresql://your-user:your-password@your-host.zeabur.app:5432/your-db
   ```
   （替換成您從 Zeabur 複製的實際 URL）

## 步驟 3：執行第一次備份測試

```bash
cd scripts/backup
./zeabur-backup-auto.sh
```

如果成功，您會看到：
```
================================================
🔄 Zeabur 資料庫自動備份
================================================
時間：2023-12-26 12:00:00
資料庫：your-host.zeabur.app:5432/your-db
備份位置：/path/to/backups/zeabur/zeabur_backup_20231226_120000.sql
保留天數：30 天
================================================
📦 正在備份資料庫...
✅ 備份成功！
   檔案：zeabur_backup_20231226_120000.sql
   大小：2.4M
🗜️  正在壓縮...
✅ 壓縮完成！壓縮後：456K
```

## 步驟 4：設定自動備份（推薦）

### macOS/Linux

```bash
# 編輯 crontab
crontab -e

# 新增以下行（每日凌晨 2:00 自動備份）
0 2 * * * cd /Users/aria/timerecord/scripts/backup && ./zeabur-backup-auto.sh >> ../../backups/zeabur/backup.log 2>&1
```

### Windows

使用 Windows 工作排程器：
1. 開啟「工作排程器」
2. 建立基本工作
3. 設定觸發程序（每日凌晨 2:00）
4. 動作：執行 `zeabur-backup-auto.sh`

## 常見問題

### Q1: 找不到 pg_dump 命令

**macOS:**
```bash
brew install postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

**Windows:**
下載並安裝 PostgreSQL：https://www.postgresql.org/download/windows/

### Q2: 連線被拒絕

確認：
1. DATABASE_URL 是否正確
2. Zeabur PostgreSQL 是否允許外部連線
3. 網路連線是否正常

### Q3: 認證失敗

重新從 Zeabur 複製 DATABASE_URL，確保：
- 使用者名稱正確
- 密碼正確（密碼中如有特殊字元，應該已經被 URL 編碼）

## 檢查備份

```bash
# 列出所有備份
ls -lh ../../backups/zeabur/

# 查看最新的備份日誌
tail -f ../../backups/zeabur/backup.log
```

## 還原備份

```bash
cd scripts/backup
./restore.sh ../../backups/zeabur/zeabur_backup_20231226_120000.sql.gz
```

⚠️ **警告**：還原操作會刪除目前資料庫的所有資料！

## 需要協助？

如果遇到問題，請檢查：
1. `zeabur.env` 檔案中的 DATABASE_URL 是否正確
2. 是否已安裝 `pg_dump` 和 `psql` 工具
3. 網路連線是否正常
4. Zeabur PostgreSQL 服務是否運行中
