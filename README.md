# 補休登錄系統

多部門補休時數管理系統，支援手機/平板/電腦使用。

## 功能特色

- ✅ 多部門獨立管理
- ✅ 員工號碼全域唯一控管
- ✅ FIFO 先進先出扣除邏輯
- ✅ 自動到期提醒（365天）
- ✅ 負數餘額控管
- ✅ 響應式設計（支援手機/平板）
- ✅ Excel 匯出功能

## 技術棧

### 前端
- React 18
- Vite 5
- Tailwind CSS 3
- React Router 6
- Axios

### 後端
- Node.js 18+
- Express 4
- PostgreSQL 14+
- ExcelJS

### 部署
- Zeabur

## 本地開發

### 1. 安裝依賴

\`\`\`bash
# 前端
npm install

# 後端
cd api
npm install
\`\`\`

### 2. 設定環境變數

#### 前端 (\`.env\`)
\`\`\`env
VITE_API_URL=http://localhost:3000
\`\`\`

#### 後端 (\`api/.env\`)
\`\`\`env
DATABASE_URL=postgresql://user:password@localhost:5432/timerecord
SESSION_SECRET=your-secret-key
PORT=3000
FRONTEND_URL=http://localhost:5173

# 部門設定 (JSON 格式)
DEPARTMENTS={"HR":{"name":"人資部","username":"hr_admin","password":"hr123"},"IT":{"name":"資訊部","username":"it_admin","password":"it123"}}
\`\`\`

### 3. 建立資料庫

\`\`\`bash
# 建立資料庫
createdb timerecord

# 執行 schema
psql timerecord < database/schema.sql
\`\`\`

### 4. 啟動服務

\`\`\`bash
# 終端 1: 啟動後端
cd api
npm run dev

# 終端 2: 啟動前端
npm run dev
\`\`\`

前端: http://localhost:5173
後端 API: http://localhost:3000

## 部署到 Zeabur

### 1. 準備 PostgreSQL

在 Zeabur 建立 PostgreSQL 服務，取得連線 URL

### 2. 部署應用

1. 連接 GitHub 倉庫到 Zeabur
2. 新增服務選擇此倉庫
3. Zeabur 會自動偵測並部署

### 3. 設定環境變數

#### 前端服務
\`\`\`
VITE_API_URL=https://your-api-domain.zeabur.app
\`\`\`

#### API 服務
\`\`\`
DATABASE_URL=<從 PostgreSQL 服務複製>
SESSION_SECRET=<隨機生成的長字串>
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.zeabur.app
DEPARTMENTS=<部門設定 JSON>
\`\`\`

### 4. 初始化資料庫

連線到 PostgreSQL 執行:
\`\`\`bash
psql $DATABASE_URL < database/schema.sql
\`\`\`

## 預設帳號

開發環境預設帳號 (請在生產環境更改):

| 部門 | 帳號 | 密碼 |
|------|------|------|
| 人資部 | hr_admin | hr123456 |
| 資訊部 | it_admin | it123456 |

## 使用說明

### 登入系統
使用部門管理員帳號登入

### 新增補休記錄
1. 點擊「新增記錄」
2. 輸入員工號碼
3. 選擇操作類型（增加/減少）
4. 輸入時數和生效日期
5. 填寫原因（選填）
6. 提交

### 查詢員工
1. 點擊「查詢員工」
2. 輸入員工號碼
3. 查看統計和詳細記錄

### 首頁總覽
- 即將到期警報（30天內）
- 已過期清單
- 全員概況

## 核心業務邏輯

### FIFO 扣除規則
減少補休時，系統自動按「生效日期由舊到新」的順序扣除：
1. 優先扣除最早且未過期的補休時數
2. 自動跳過已過期的記錄
3. 記錄扣除來源供追溯

### 到期機制
- 補休從生效日期起算 365 天後自動到期
- 到期前 30 天顯示「即將到期」警示
- 已過期時數仍顯示在總累計，但不可使用

### 負數控管
- 嚴格禁止負數餘額
- 扣除前檢查可用餘額
- 不足時顯示詳細錯誤訊息

### 員工號碼管理
- 全公司唯一，不可重複
- 一個員工號碼只能屬於一個部門
- 新增記錄時自動檢查跨部門衝突

## 專案結構

\`\`\`
timerecord/
├── api/                    # 後端 API
│   ├── src/
│   │   └── index.js       # Express 主程式
│   ├── package.json
│   └── .env.example
├── database/              # 資料庫
│   └── schema.sql         # 資料庫結構
├── src/                   # 前端原始碼
│   ├── api/              # API 客戶端
│   ├── components/       # React 組件
│   ├── context/          # Context (Auth)
│   ├── pages/            # 頁面組件
│   ├── utils/            # 工具函數
│   ├── App.jsx           # 主應用
│   └── main.jsx          # 入口點
├── package.json          # 前端依賴
└── README.md             # 本文件
\`\`\`

## 授權

MIT License

## 支援

如有問題請提交 Issue
