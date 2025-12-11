# Zeabur 部署除錯記錄

**日期：** 2025-12-11
**專案：** 補休登錄系統
**部署平台：** Zeabur

---

## 📋 部署概況

### 服務架構
- **前端：** https://timerecord.zeabur.app (React + Vite)
- **後端：** https://api-timerecord.zeabur.app (Node.js + Express)
- **資料庫：** PostgreSQL (Zeabur 內建服務)

### 部門設定
- 部門代碼：BZ
- 部門名稱：企發室
- 登入帳號：bz
- 登入密碼：bz123

---

## 🐛 問題紀錄與解決方案

### 問題 1：無法登入，登入後立即跳回登入頁

**現象：**
- 點擊登入後，頁面閃一下（跳轉到主頁）
- 立即又跳回登入頁面
- Console 錯誤：`GET /api/auth/me 401 (Unauthorized)`

**診斷過程：**
1. 檢查前端 API 連接 - ✅ 正常
2. 檢查登入 API 響應 - ✅ 返回 200，登入成功
3. 檢查 Response Headers - ❌ 沒有 `set-cookie`
4. 檢查後續 /api/auth/me 請求 - ❌ Request Headers 中沒有 cookie

**根本原因：**
Cookie 沒有被設定或傳遞，導致 session 無法維持。

---

### 解決方案 1：修正 Cookie 安全設定

**問題：** 生產環境使用 HTTPS，但 cookie 設定為 `secure: false`

**修復：** `api/src/index.js:34`
```javascript
// 修改前
cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, secure: false }

// 修改後
cookie: {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
}
```

**Commit：** `afdcbf1` - Fix: 修正生產環境 cookie 設定以支援 HTTPS

**結果：** ❌ 問題依舊

---

### 解決方案 2：改進 CORS 配置

**問題：** CORS 配置不完整，缺少跨域 cookie 所需的 headers

**修復：** `api/src/index.js:27`
```javascript
// 修改前
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

// 修改後
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));
```

**Commit：** `0a33ebd` - Fix: 改進 CORS 配置以支援跨域 Cookie

**結果：** ❌ 問題依舊

---

### 問題 2：PostgreSQL SSL 連接錯誤

**現象：**
Runtime Logs 中出現大量錯誤：
```
Error: The server does not support SSL connections
    at /src/node_modules/pg-pool/index.js:45:11
```

**診斷：**
- Session store 無法連接到 PostgreSQL
- 導致 session 無法保存
- 因此沒有 set-cookie header

**根本原因：**
程式碼中設定 `ssl: { rejectUnauthorized: false }`，但 Zeabur 的 PostgreSQL 不支援 SSL 連接

---

### 解決方案 3：禁用 PostgreSQL SSL

**修復：** `api/src/index.js:18`
```javascript
// 修改前
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// 修改後
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});
```

**Commit：** `1c34bd5` - Fix: 禁用 PostgreSQL SSL 連接以修復 session store 問題

**驗證：**
- 檢查 session 表：`SELECT COUNT(*) FROM session;` → 4 條記錄 ✅
- Runtime Logs 不再有 SSL 錯誤 ✅

**結果：** ⚠️ Session 被保存了，但仍然沒有 set-cookie header

---

### 解決方案 4：添加代理信任和 Cookie Domain

**問題：** 在反向代理環境（Zeabur）下，需要額外配置

**修復：** `api/src/index.js:36-52`
```javascript
// 添加代理信任
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(session({
  store: new PgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  proxy: process.env.NODE_ENV === 'production', // 新增
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.zeabur.app' : undefined // 新增
  }
}));
```

**Commit：** `fcdf83c` - Fix: 添加代理信任和 cookie domain 配置以支援跨域 session

**驗證：**
- 檢查 login API 的 Response Headers - ✅ 現在有 set-cookie！
```
set-cookie: connect.sid=...; Domain=.zeabur.app; Path=/; Expires=...; HttpOnly; Secure; SameSite=None
```

**結果：** ⚠️ 後端發送 cookie 了，但瀏覽器沒有保存

---

### 問題 3：瀏覽器拒絕保存跨域 Cookie

**現象：**
- Response Headers 中有 `set-cookie` ✅
- 但 Application > Cookies 中沒有任何 cookie ❌
- 後續請求的 Request Headers 中沒有 cookie ❌

**可能原因：**
1. Chrome 的第三方 cookie 政策阻止了跨站 cookie
2. `Domain=.zeabur.app` 設定可能導致問題
3. 瀏覽器的 SameSite=None 限制

---

### 解決方案 5：移除 Cookie Domain 設定

**修復：** `api/src/index.js:47-52`
```javascript
// 移除 domain 設定，讓瀏覽器自動處理
cookie: {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
}
```

**Commit：** `6aef88f` - Fix: 移除 cookie domain 設定，讓瀏覽器自動處理

**結果：** ⏳ 待測試

---

## 🔧 目前配置

### 環境變數 (後端 API)

```env
DATABASE_URL=postgresql://root:28hGgvQLPHJEi5p34j1n69MxVakrF07c@hnd1.clusters.zeabur.com:25780/zeabur
SESSION_SECRET=88a28c138d0c6e6d404f023c2098701350d1bde97ead078a60826c564d296506
FRONTEND_URL=https://timerecord.zeabur.app
NODE_ENV=production
DEPARTMENTS={"BZ":{"name":"企發室","username":"bz","password":"bz123"}}
```

### 環境變數 (前端)

```env
VITE_API_URL=https://api-timerecord.zeabur.app
```

---

## 📊 診斷工具與指令

### 檢查 Session 記錄
```bash
PGPASSWORD=28hGgvQLPHJEi5p34j1n69MxVakrF07c psql \
  -h hnd1.clusters.zeabur.com \
  -p 25780 \
  -U root \
  -d zeabur \
  -c "SELECT COUNT(*) FROM session;"
```

### 測試後端健康狀態
```bash
curl https://api-timerecord.zeabur.app/health
```

### 測試登入 API
```bash
curl -v https://api-timerecord.zeabur.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://timerecord.zeabur.app' \
  -d '{"username":"bz","password":"bz123"}'
```

---

## 🎯 已知限制與注意事項

### 1. 跨域 Cookie 限制
- 現代瀏覽器（特別是 Chrome）對第三方 cookie 有嚴格限制
- 即使設定 `SameSite=None` + `Secure=true`，仍可能被阻止
- 用戶的瀏覽器設定（如「封鎖第三方 Cookie」）會影響功能

### 2. Zeabur 環境特性
- PostgreSQL 不支援 SSL 連接，需設定 `ssl: false`
- 應用在反向代理後面，需設定 `trust proxy`
- 前後端使用不同子域名（timerecord.zeabur.app vs api-timerecord.zeabur.app）

### 3. Session Store 配置
- 使用 PostgreSQL 作為 session store
- 需要正確的資料庫連接設定
- Session 表必須存在（通過 schema.sql 創建）

---

## 🚀 測試步驟

### 1. 確認後端狀態
1. 前往 Zeabur 後端服務
2. 檢查 Deployment Logs - 最新部署應為最後一個修復
3. 檢查 Runtime Logs - 不應有錯誤訊息

### 2. 檢查瀏覽器設定
1. 開啟 Chrome 設定：`chrome://settings/cookies`
2. 暫時設定為「允許所有 Cookie」
3. 或添加例外：允許 `[*.]zeabur.app` 的 cookie

### 3. 測試登入
1. 使用無痕視窗
2. 開啟開發者工具 (F12)
3. 訪問 https://timerecord.zeabur.app
4. 登入：bz / bz123
5. 觀察：
   - Network > login 請求的 Response Headers（應有 set-cookie）
   - Application > Cookies（應有 connect.sid）
   - Network > auth/me 請求的 Request Headers（應有 cookie）

---

## 📝 Git 提交記錄

```
fcdf83c - Fix: 添加代理信任和 cookie domain 配置以支援跨域 session
1c34bd5 - Fix: 禁用 PostgreSQL SSL 連接以修復 session store 問題
0a33ebd - Fix: 改進 CORS 配置以支援跨域 Cookie
afdcbf1 - Fix: 修正生產環境 cookie 設定以支援 HTTPS
c2cbc71 - Initial commit - 補休登錄系統
```

---

## 💡 可能的後續方案

### 方案 A：調整瀏覽器設定（臨時）
- 用戶在 Chrome 中允許第三方 cookie
- 或為 zeabur.app 設定例外

### 方案 B：使用單一域名（需要額外配置）
- 使用自訂域名
- 前後端使用相同域名的不同路徑（如 /api）
- 需要配置反向代理

### 方案 C：改用 JWT 認證（需重構）
- 不依賴 cookie 和 session
- 使用 localStorage 或 sessionStorage 儲存 token
- 需要修改前後端認證邏輯

---

## 📞 支援資源

- **Zeabur 文件：** https://zeabur.com/docs
- **Express Session：** https://github.com/expressjs/session
- **CORS：** https://github.com/expressjs/cors
- **Chrome Cookie 政策：** https://developer.chrome.com/docs/privacy-security/samesite-cookies

---

**最後更新：** 2025-12-11
**狀態：** 🔄 除錯進行中 - 等待最終測試結果
