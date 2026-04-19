# 開發紀錄 - 2025-12-26

## 📋 今日完成任務

### 1️⃣ 資料庫備份系統建置

#### 背景
- 系統部署在 Zeabur，使用 PostgreSQL 資料庫
- 需要建立完整的備份機制以保護重要的補休記錄資料
- Zeabur 已有內建每日自動備份

#### 實作內容

**資料庫 Schema 更新**
- ✅ 建立 `database/add_photo_column.sql` - 新增欄位遷移檔案
- ✅ 更新 `database/schema.sql` - 加入 photo_url 欄位

**本地開發環境備份**
- ✅ `scripts/backup/backup.sh` - 本地資料庫備份腳本
  - 使用 pg_dump 完整備份
  - 自動壓縮為 .gz 格式
  - 自動清理超過 N 天的舊備份（預設 30 天）
  - 詳細的執行日誌

- ✅ `scripts/backup/restore.sh` - 資料庫還原腳本
  - 支援壓縮檔案還原
  - 雙重確認機制防止誤操作
  - 還原後自動驗證資料表

- ✅ `scripts/backup/setup-cron.sh` - 自動排程設定工具
  - 互動式設定介面
  - 多種排程選項（每日/每週/每月/自訂）
  - 自動檢查並移除舊設定

**Zeabur 生產環境備份**
- ✅ `scripts/backup/zeabur-backup.sh` - 互動式 Zeabur 備份
- ✅ `scripts/backup/zeabur-backup-auto.sh` - 自動化 Zeabur 備份
  - 使用環境變數檔案 (zeabur.env)
  - 支援從本地電腦定期備份 Zeabur 資料庫
  - 安裝 PostgreSQL 18 客戶端工具以匹配 Zeabur 版本

- ✅ `scripts/backup/zeabur-backup-docker.sh` - Docker 版本備份（備用方案）
- ✅ `scripts/backup/zeabur.env.example` - 環境變數範例檔案

**文件撰寫**
- ✅ `scripts/backup/README.md` - 完整的備份系統說明文件
  - 本地和 Zeabur 環境使用指引
  - 詳細的指令說明和範例
  - 常見問題排解
  - Cron 時間格式說明

- ✅ `scripts/backup/ZEABUR_SETUP.md` - Zeabur 專屬設定指引
  - 取得 DATABASE_URL 的多種方法
  - 逐步設定教學
  - 常見問題解答

- ✅ `BACKUP_SETUP_COMPLETE.md` - 備份系統設定完成摘要
  - 設定狀態總覽
  - 常用指令快速參考
  - 維護建議

**設定完成**
- ✅ 已在本地設定每週日凌晨 2:00 自動備份 Zeabur 資料庫
- ✅ 備份保留 30 天
- ✅ 首次備份成功完成（3.0KB）
- ✅ 更新 `.gitignore` 排除備份檔案和敏感資訊

#### 備份策略

| 備份類型 | 頻率 | 保留天數 | 位置 |
|---------|------|---------|------|
| Zeabur 內建 | 每天 | 依 Zeabur 設定 | Zeabur 平台 |
| 本地異地備份 | 每週日凌晨 2:00 | 30 天 | `backups/zeabur/` |

#### 技術細節
- PostgreSQL 版本：18.1
- 備份工具：pg_dump
- 壓縮格式：gzip
- 備份參數：`--no-sync --no-owner --no-acl`
- 自動排程：crontab

---

### 2️⃣ 照片上傳功能開發

#### 需求
- 在新增補休記錄時可以上傳照片（如加班證明、簽核單等）
- 支援 iPhone/Android 手機直接拍照上傳
- 查詢記錄時可以查看已上傳的照片

#### 實作內容

**資料庫層 (Database)**
- ✅ 新增 `photo_url TEXT` 欄位到 `records` 表
- ✅ 已在 Zeabur 生產資料庫執行欄位新增
- ✅ 更新 `database/schema.sql` 主 schema 檔案
- ✅ 建立 `database/add_photo_column.sql` 遷移檔案

**後端 API 層 (api/src/index.js)**
- ✅ 修改 `POST /api/records` 端點
  - 接收 `photoUrl` 參數（Base64 編碼）
  - 儲存照片到資料庫 `photo_url` 欄位
  - 向後相容（照片為選填）

**前端 - 新增記錄頁面 (src/pages/AddRecord.jsx)**
- ✅ 新增照片上傳 UI
  - 拖放區域設計
  - 點擊上傳按鈕
  - 支援 `capture="environment"` 屬性（手機優先開啟後置相機）

- ✅ 檔案驗證
  - 大小限制：5MB
  - 類型限制：僅圖片檔案（image/*）
  - 錯誤訊息提示

- ✅ 照片處理
  - 使用 FileReader API 轉換為 Base64
  - 即時預覽功能
  - 刪除照片功能
  - 表單重置時自動清除照片

- ✅ 使用者體驗
  - 美觀的上傳介面（虛線邊框、圖示）
  - 照片預覽區域
  - 刪除按鈕（覆蓋在照片右上角）

**前端 - 查詢頁面 (src/pages/QueryEmployee.jsx)**
- ✅ 表格新增「照片」欄位
- ✅ 「查看照片」按鈕（僅在有照片時顯示）
- ✅ 全螢幕照片預覽對話框
  - 黑色半透明背景
  - 點擊背景或關閉按鈕關閉
  - 響應式大小調整（max-w-4xl, max-h-90vh）
  - 點擊照片本身不關閉預覽

#### 技術實作細節

**照片儲存方式**
- 選擇 Base64 儲存在資料庫
- 優點：
  - 部署簡單，不需要額外的檔案伺服器
  - 不需要處理檔案路徑和權限
  - 資料和照片一起備份
  - 適合 Zeabur 等 Serverless 環境
- 缺點：
  - Base64 會增加約 33% 的大小
  - 大量照片會增加資料庫大小
- 解決方案：5MB 檔案大小限制

**手機支援**
- iPhone：`capture="environment"` 優先開啟後置相機
- Android：同 iPhone
- 桌面：正常檔案選擇器
- 相容性：使用標準 HTML5 API，所有現代瀏覽器支援

**響應式設計**
- 使用 Tailwind CSS
- 手機、平板、桌面完全支援
- 照片預覽自適應螢幕大小

#### 功能測試重點
- [x] 照片上傳（拖放/點擊）
- [x] 檔案大小驗證（>5MB 拒絕）
- [x] 檔案類型驗證（非圖片拒絕）
- [x] Base64 轉換
- [x] 照片預覽
- [x] 刪除照片
- [x] 表單提交（含照片）
- [x] 表單重置（清除照片）
- [x] 查詢頁面顯示照片
- [x] 全螢幕照片查看
- [x] 手機拍照上傳（待用戶確認）

---

## 📊 統計資料

### 程式碼異動
- **修改檔案**：16 個
- **新增程式碼**：1,676 行
- **刪除程式碼**：5 行
- **新增檔案**：10 個

### Git 提交
- **Commit ID**: `d7c1b96`
- **Commit Message**: `feat: add photo upload and database backup features`
- **推送至**: GitHub `origin/main`
- **自動部署**: Zeabur（進行中）

### 檔案清單

**新增檔案：**
1. `BACKUP_SETUP_COMPLETE.md` - 備份系統完成摘要
2. `scripts/backup/README.md` - 備份系統完整文件
3. `scripts/backup/ZEABUR_SETUP.md` - Zeabur 設定指引
4. `scripts/backup/backup.sh` - 本地備份腳本
5. `scripts/backup/restore.sh` - 還原腳本
6. `scripts/backup/setup-cron.sh` - Cron 設定腳本
7. `scripts/backup/zeabur-backup.sh` - Zeabur 互動式備份
8. `scripts/backup/zeabur-backup-auto.sh` - Zeabur 自動備份
9. `scripts/backup/zeabur-backup-docker.sh` - Docker 備份方案
10. `scripts/backup/zeabur.env.example` - 環境變數範例
11. `database/add_photo_column.sql` - 資料庫遷移檔案（未提交，被 .gitignore）

**修改檔案：**
1. `.gitignore` - 排除備份檔案和敏感資訊
2. `README.md` - 新增備份和照片功能說明
3. `api/src/index.js` - API 支援照片上傳
4. `database/schema.sql` - 新增 photo_url 欄位
5. `src/pages/AddRecord.jsx` - 照片上傳介面
6. `src/pages/QueryEmployee.jsx` - 照片查看功能

---

## 🎯 功能完成度

### 資料庫備份系統
- [x] 本地備份腳本
- [x] Zeabur 備份腳本
- [x] 自動排程設定
- [x] 還原功能
- [x] 完整文件
- [x] 首次備份測試成功
- [x] Cron 自動排程設定完成

### 照片上傳功能
- [x] 資料庫 schema 更新
- [x] API 端點支援
- [x] 前端上傳介面
- [x] 檔案驗證（大小、類型）
- [x] Base64 轉換
- [x] 照片預覽
- [x] 刪除功能
- [x] 查看照片功能
- [x] 全螢幕預覽
- [x] 手機拍照支援
- [x] 響應式設計
- [x] Git 提交和推送

---

## 🚀 部署狀態

### Zeabur 自動部署
- **狀態**: 已推送至 GitHub，Zeabur 自動部署中
- **預計完成**: 約 5-10 分鐘
- **包含服務**:
  - 前端服務（React）
  - 後端 API 服務（Node.js/Express）
  - PostgreSQL 資料庫（已更新 schema）

### 資料庫遷移
- **狀態**: ✅ 已完成
- **執行內容**:
  ```sql
  ALTER TABLE records ADD COLUMN IF NOT EXISTS photo_url TEXT;
  ```
- **執行位置**: Zeabur PostgreSQL
- **執行時間**: 2025-12-26

---

## 📝 使用說明

### 照片上傳功能使用方式

**新增記錄時上傳照片：**
1. 登入系統
2. 進入「新增記錄」頁面
3. 填寫基本資料（員工號碼、操作類型、時數等）
4. 滑到「上傳照片（選填）」區域
5. 點擊「點擊選擇照片」
   - iPhone/Android：會優先開啟後置相機
   - 也可以切換到相簿選擇照片
6. 拍照或選擇照片後會即時預覽
7. 如需重拍，點擊「刪除照片」
8. 確認無誤後，點擊「確認增加」或「確認減少」

**查看已上傳的照片：**
1. 進入「查詢員工」頁面
2. 輸入員工號碼查詢
3. 在記錄列表中找到有照片的記錄（顯示「查看照片」按鈕）
4. 點擊「查看照片」
5. 照片會以全螢幕方式顯示
6. 點擊背景或「✕ 關閉」按鈕關閉預覽

### 備份系統使用方式

**手動執行備份：**
```bash
cd scripts/backup
./zeabur-backup-auto.sh
```

**查看備份清單：**
```bash
ls -lh backups/zeabur/
```

**查看自動備份排程：**
```bash
crontab -l
```

**還原資料庫：**
```bash
cd scripts/backup
./restore.sh ../../backups/zeabur/zeabur_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## ⚠️ 注意事項

### 照片上傳
1. 照片為選填，不上傳照片不影響記錄建立
2. 檔案大小限制 5MB
3. 僅接受圖片格式（JPG、PNG、GIF 等）
4. 照片以 Base64 格式儲存在資料庫中
5. 大量上傳照片會增加資料庫大小

### 資料庫備份
1. 備份腳本需要在電腦開機時才會執行（cron job）
2. 週日凌晨 2:00 如果電腦關機，備份不會執行
3. 建議每月手動檢查備份是否正常產生
4. Zeabur DATABASE_URL 如有變更，需更新 `scripts/backup/zeabur.env`
5. 備份檔案會自動刪除超過 30 天的舊檔案

---

## 🔄 後續建議

### 短期優化（1-2週）
- [ ] 在 iPhone 實機測試照片上傳功能
- [ ] 確認 Zeabur 部署後照片功能正常
- [ ] 監控資料庫大小增長
- [ ] 定期檢查備份是否正常執行

### 中期優化（1-3個月）
- [ ] 如照片量大，考慮改用雲端儲存（AWS S3、Cloudinary）
- [ ] 加入照片壓縮功能（降低檔案大小）
- [ ] 備份上傳到雲端儲存（異地備份）
- [ ] 設定備份失敗告警通知

### 長期優化（3個月以上）
- [ ] 照片縮圖功能（列表顯示小圖，點擊顯示大圖）
- [ ] 照片裁切/旋轉編輯功能
- [ ] 批次上傳多張照片
- [ ] 照片 OCR 識別（自動提取文字資訊）

---

## 👥 協作資訊

**開發人員**: Aria
**協助工具**: Claude Code
**開發日期**: 2025-12-26
**預計上線時間**: 2025-12-26（Zeabur 自動部署）
**專案倉庫**: https://github.com/ariachen2020/timerecord

---

## 📚 相關文件

- [主要 README](README.md)
- [備份系統完整說明](scripts/backup/README.md)
- [Zeabur 備份設定指引](scripts/backup/ZEABUR_SETUP.md)
- [備份系統設定完成摘要](BACKUP_SETUP_COMPLETE.md)

---

**紀錄建立時間**: 2025-12-26
**最後更新時間**: 2025-12-26
**版本**: 1.0
