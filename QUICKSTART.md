# 快速開始指南

## 前置需求

- Node.js 18+
- PostgreSQL 14+
- npm 或 yarn

## 5 分鐘啟動

### 1. 安裝依賴 (2 分鐘)

\`\`\`bash
# 安裝前端依賴
npm install

# 安裝後端依賴
cd api && npm install && cd ..
\`\`\`

### 2. 設定資料庫 (2 分鐘)

\`\`\`bash
# 建立資料庫
createdb timerecord

# 執行 schema
psql timerecord < database/schema.sql
\`\`\`

### 3. 設定環境變數 (1 分鐘)

#### 前端 \`.env\`
\`\`\`bash
echo "VITE_API_URL=http://localhost:3000" > .env
\`\`\`

#### 後端 \`api/.env\`
\`\`\`bash
cat > api/.env << 'EOF'
DATABASE_URL=postgresql://localhost:5432/timerecord
SESSION_SECRET=dev-secret-key-change-in-production
PORT=3000
FRONTEND_URL=http://localhost:5173
DEPARTMENTS={"HR":{"name":"人資部","username":"hr","password":"hr123"},"IT":{"name":"資訊部","username":"it","password":"it123"}}
EOF
\`\`\`

### 4. 啟動服務

開兩個終端視窗：

#### 終端 1 - 後端
\`\`\`bash
cd api
npm run dev
\`\`\`

#### 終端 2 - 前端
\`\`\`bash
npm run dev
\`\`\`

### 5. 開始使用

打開瀏覽器訪問: **http://localhost:5173**

預設帳號:
- 人資部: \`hr\` / \`hr123\`
- 資訊部: \`it\` / \`it123\`

## 測試流程

### 1. 登入系統
使用 \`hr\` / \`hr123\` 登入

### 2. 新增補休
- 點擊「新增記錄」
- 員工號碼: \`A001\`
- 操作: 增加
- 時數: 8 小時 0 分
- 日期: 今天
- 原因: 加班
- 提交

### 3. 查詢員工
- 點擊「查詢員工」
- 輸入: \`A001\`
- 查看統計和記錄

### 4. 測試扣除
- 點擊「新增記錄」
- 員工號碼: \`A001\`
- 操作: 減少
- 時數: 4 小時 0 分
- 提交

### 5. 查看總覽
- 點擊「首頁」
- 查看部門全員狀態

## 測試 FIFO 扣除邏輯

\`\`\`bash
# 1. 新增多筆補休（不同日期）
員工 A001:
  - 2024-01-15 增加 8小時
  - 2024-06-20 增加 6小時
  - 2024-11-01 增加 4小時

# 2. 使用補休
  - 2024-11-30 減少 10小時

# 3. 查詢 A001，系統應該:
  - 從 1/15 的 8小時全扣 (最早)
  - 從 6/20 的 6小時扣 2小時
  - 11/01 的 4小時保持不變
  - 可用餘額: 8小時
\`\`\`

## 測試到期機制

\`\`\`bash
# 1. 新增即將到期的補休
  - 生效日期設為 365 天前
  - 查看首頁應出現在「即將到期」

# 2. 新增已過期的補休
  - 生效日期設為 366 天前
  - 查看首頁應出現在「已過期」
\`\`\`

## 常見問題

### Q: 資料庫連線失敗？
A: 檢查 PostgreSQL 是否啟動，DATABASE_URL 是否正確

### Q: 前端無法連接後端？
A: 確認後端在 port 3000 運行，檢查 CORS 設定

### Q: Session 無法保持？
A: 檢查 database 中的 session 表是否建立

### Q: 登入後立即登出？
A: 檢查前端的 \`withCredentials: true\` 設定

## 下一步

- 閱讀 [README.md](README.md) 了解完整功能
- 查看 [API 文件](#) 了解 API 規格
- 準備部署到 Zeabur

## 需要幫助？

提交 Issue 或聯繫開發團隊
