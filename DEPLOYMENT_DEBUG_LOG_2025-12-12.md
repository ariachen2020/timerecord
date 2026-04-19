# Zeabur 部署除錯記錄 - Day 2

**日期：** 2025-12-12
**專案：** 補休登錄系統
**部署平台：** Zeabur
**狀態：** ✅ 完全解決

---

## 📋 問題背景

延續昨天（2025-12-11）的調試，主要問題是**跨域 Cookie 被瀏覽器阻止**，導致：
- 登入請求成功（200 OK）
- 但 Session Cookie 無法被瀏覽器保存或發送
- 後續 `/api/auth/me` 等請求返回 401 Unauthorized

**昨天的架構：**
- 前端：`https://timerecord.zeabur.app`
- 後端：`https://api-timerecord.zeabur.app`
- 問題：Chrome 將此視為跨站請求，拒絕 Cookie

---

## 🎯 今天的解決方案

採用**單一服務架構** - 將前端和後端合併到同一個域名，徹底解決跨域 Cookie 問題。

---

## 🐛 問題記錄與解決方案

### 問題 1：本地開發環境登入失敗

**現象：**
- 使用無痕視窗無法登入
- 檢查發現前端向 `http://localhost:3000` 發送請求

**診斷：**
檢查本地配置文件 `/api/.env`：
```env
FRONTEND_URL=http://localhost:5174  # ❌ 端口錯誤
```

實際前端運行在 `localhost:5173`（vite.config.js 中配置）

**解決方案 1：修正 FRONTEND_URL 端口**

**修復：** `api/.env:5`
```env
# 修改前
FRONTEND_URL=http://localhost:5174

# 修改後
FRONTEND_URL=http://localhost:5173
```

**Commit：** 無（本地配置文件，未提交）

**結果：** ✅ 本地開發環境修復

---

### 問題 2：決定採用單一服務架構

**策略：**
根據昨天的調試記錄中提到的「方案 B：使用單一域名」，決定：
1. 將前端和後端合併到一個服務
2. 後端提供前端靜態文件
3. 使用同一個域名，不再有跨域問題

**實施步驟：**
1. 修改後端代碼，添加靜態文件服務
2. 修改前端 API 配置，生產環境使用相對路徑
3. 創建自定義 Dockerfile
4. 修改 zeabur.json，合併為單一服務

---

### 問題 3：後端需要提供前端靜態文件

**修復：** `api/src/index.js`

添加必要的 imports：
```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

在所有 API 路由之後添加靜態文件服務：
```javascript
// 健康檢查
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 提供前端靜態文件（必須在所有 API 路由之後）
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../dist');
  app.use(express.static(frontendPath));

  // SPA fallback - 處理客戶端路由
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}
```

**關鍵：** 中間件順序很重要
1. CORS
2. express.json()
3. Session
4. **API 路由**（優先匹配）
5. 靜態文件服務
6. SPA fallback

**Commit：** `726a7eb` - fix(api): correct middleware order - API routes before static files

---

### 問題 4：前端生產環境 API URL 配置

**修復：** `src/api/client.js`

```javascript
// 修改前
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 修改後
// 生產環境使用相對路徑（同域名），開發環境使用完整 URL
const baseURL = import.meta.env.PROD
  ? ''
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

const client = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Commit：** `dfe6e1d` - feat: merge frontend and backend into single service

---

### 問題 5：創建自定義 Dockerfile

**問題：** Zeabur 自動生成的 Dockerfile 無法正確安裝依賴

**解決方案：** 創建自定義多階段 Dockerfile

**創建：** `Dockerfile`

```dockerfile
# 多阶段构建
FROM node:22 AS builder

WORKDIR /app

# 复制根目录的 package files
COPY package.json package-lock.json ./
COPY api/package.json api/package-lock.json ./api/

# 强制安装所有依赖（包括 devDependencies）
RUN npm install --production=false

# 复制所有源代码
COPY . .

# 构建前端（设置 NODE_ENV=production 让 Vite 正确构建）
RUN NODE_ENV=production npm run build

# 安装后端依赖
WORKDIR /app/api
RUN npm ci --only=production

# 生产阶段
FROM node:22-slim

WORKDIR /app

# 复制后端代码和依赖
COPY --from=builder /app/api ./api
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database ./database

WORKDIR /app/api

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
```

**關鍵點：**
1. **構建階段**：安裝所有依賴（包括 devDependencies）
2. **使用 `--production=false`**：強制安裝 devDependencies
3. **明確設置 `NODE_ENV=production`** 在構建命令中
4. **生產階段**：只複製必要文件，使用輕量級鏡像

**Commit：** `d078b35` - feat(deploy): add custom Dockerfile for reliable builds

---

### 問題 6：修改 zeabur.json 配置

**修復：** `zeabur.json`

```json
// 修改前（兩個服務）
{
  "version": "2",
  "services": [
    {
      "name": "frontend",
      "buildCommand": "npm install && npm run build",
      "outputDirectory": "dist",
      "installCommand": "npm install",
      "startCommand": "npm run preview -- --port $PORT --host 0.0.0.0"
    },
    {
      "name": "api",
      "path": "api",
      "buildCommand": "npm install",
      "startCommand": "npm start",
      "env": {
        "NODE_ENV": "production"
      }
    }
  ]
}

// 修改後（單一服務）
{
  "version": "2",
  "services": [
    {
      "name": "timerecord",
      "dockerfile": "Dockerfile",
      "env": {
        "NODE_ENV": "production"
      }
    }
  ]
}
```

**Commit：** `dfe6e1d` - feat: merge frontend and backend into single service

---

### 問題 7：vite not found 錯誤（多次）

**現象：**
```
sh: 1: vite: not found
exit code: 127
```

構建日誌顯示只安裝了 40 個包，應該有 200+ 個包（包括 devDependencies）。

**嘗試的解決方案：**

#### 嘗試 1：使用 npm ci
```dockerfile
RUN npm ci
```
**結果：** ❌ 失敗，只安裝 40 個包

**Commit：** `f9a8030` - fix(deploy): use npm ci to install all dependencies including devDependencies

---

#### 嘗試 2：設置 NODE_ENV=development
```dockerfile
ENV NODE_ENV=development
RUN npm ci
```
**結果：** ❌ 失敗，導致前端以開發模式構建（API URL 變成 localhost:3000）

**Commit：** `32195d2` - fix(docker): set NODE_ENV=development in build stage

---

#### 嘗試 3：只在構建時設置 NODE_ENV=production
```dockerfile
# 不設置全局 NODE_ENV
RUN npm ci || npm install
RUN NODE_ENV=production npm run build
```
**結果：** ❌ 失敗，還是只安裝 40 個包

**Commit：** `6045ea6` - fix(docker): build frontend in production mode

---

#### 嘗試 4：使用 npm install
```dockerfile
RUN npm install
```
**結果：** ❌ 失敗，還是只安裝 40 個包

**Commit：** `ccef430` - fix(docker): use npm install to ensure devDependencies are installed

---

#### 嘗試 5：明確複製 package-lock.json
```dockerfile
COPY package.json package-lock.json ./
COPY api/package.json api/package-lock.json ./api/
```
**結果：** ❌ 失敗，還是只安裝 40 個包

**Commit：** `4b4f284` - fix(docker): explicitly copy package-lock.json files

---

#### ✅ 最終解決方案：使用 --production=false
```dockerfile
RUN npm install --production=false
```

**原因：** Docker 環境中 npm 默認行為可能受環境變量影響，明確使用 `--production=false` 強制安裝 devDependencies。

**Commit：** `f97fa74` - fix(docker): force install devDependencies with --production=false

**結果：** ✅ 成功！安裝了所有依賴，包括 vite

---

### 問題 8：PostgreSQL SSL 連接錯誤

**現象：**
```
❌ 資料庫初始化失敗: The server does not support SSL connections
```

**原因：** 代碼中設置了 `ssl: { rejectUnauthorized: false }`，但 Zeabur PostgreSQL 不支援 SSL

**解決方案：** `api/src/index.js:27`

```javascript
// 修改前
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// 修改後
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,  // Zeabur PostgreSQL 不支援 SSL
});
```

**Commit：** `71ee6fb` - fix(api): disable PostgreSQL SSL for Zeabur

**結果：** ✅ 資料庫連接成功

**注意：** 這是昨天調試中已經發現的問題（解決方案 #3），今天在合併代碼時又引入了。

---

### 問題 9：前端以開發模式構建

**現象：**
登入請求發送到 `http://localhost:3000` 而不是當前域名

**原因：**
前端以開發模式構建（`import.meta.env.PROD` 為 false），使用了開發環境的 API URL

**診斷：**
檢查 Dockerfile 發現全局設置了 `ENV NODE_ENV=development`，導致 Vite 以開發模式構建。

**解決方案：** 已在「問題 7 - 嘗試 3」中解決

只在構建命令中設置 `NODE_ENV=production`：
```dockerfile
RUN NODE_ENV=production npm run build
```

**Commit：** `6045ea6` - fix(docker): build frontend in production mode

---

### 問題 10：Cookie Domain 導致無法保存 Cookie

**現象：**
- 登入請求返回 200 OK
- Response Headers 有 `Set-Cookie`
- 但後續請求的 Request Headers 中沒有 Cookie
- `/api/auth/me` 返回 401 Unauthorized

**診斷：**
```
Set-Cookie: connect.sid=...; Domain=.zeabur.app; Path=/; HttpOnly; Secure; SameSite=None
```

雖然設置了 Cookie，但瀏覽器沒有保存或發送。

**原因：**
在**同域名**的情況下，設置 `domain: '.zeabur.app'` 反而導致瀏覽器將其視為跨域 Cookie，可能被拒絕。

**解決方案：** `api/src/index.js:50-55`

```javascript
// 修改前
cookie: {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.zeabur.app' : undefined
}

// 修改後
cookie: {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'  // 同域名不需要 'none'，也不需要設置 domain
}
```

**關鍵：**
- **同域名請求**：不設置 `domain`，讓瀏覽器自動使用當前域名
- **sameSite: 'lax'**：同域名不需要 `'none'`
- **不需要 `domain: '.zeabur.app'`**：這是跨子域名才需要的設置

**Commit：** `3dd844f` - fix(api): remove cookie domain for same-origin requests

**結果：** ✅ 完全解決！Cookie 正常保存和發送

---

## 🔧 最終配置

### 環境變數（Zeabur 生產環境）

```env
DATABASE_URL=postgresql://...（從 Zeabur PostgreSQL 服務獲取）
SESSION_SECRET=ec1964a444940e95d55e48dfe0aad9f03a944b907e30146fbae86af7f7877211
NODE_ENV=production
FRONTEND_URL=https://timerecord.zeabur.app
DEPARTMENTS={"BZ":{"name":"企發室","username":"bz","password":"bz123"}}
```

**注意：** 前端不需要設置 `VITE_API_URL` 環境變量（使用相對路徑）

---

### 服務架構

**單一服務：** `https://timerecord.zeabur.app`

- 前端靜態文件：由 Node.js 後端提供
- API 路由：`/api/*`
- 健康檢查：`/health`
- 其他路由：返回 `index.html`（SPA 客戶端路由）

**優點：**
1. ✅ 不再有跨域 Cookie 問題
2. ✅ 簡化部署架構
3. ✅ 減少服務數量和成本
4. ✅ 更好的性能（不需要 CORS 預檢請求）

---

### Cookie 配置

```javascript
cookie: {
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 天
  httpOnly: true,                    // 防止 XSS
  secure: true,                      // HTTPS only
  sameSite: 'lax'                    // CSRF 保護
  // 不設置 domain（讓瀏覽器自動使用當前域名）
}
```

---

### Session 配置

```javascript
app.use(session({
  store: new PgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { /* 見上方 */ }
}));
```

**Session Store：** PostgreSQL（使用 `connect-pg-simple`）

---

### Trust Proxy 配置

```javascript
// 必須在所有中間件之前設置
app.set('trust proxy', 1);
```

**重要：** Zeabur 使用反向代理，必須設置 `trust proxy` 才能正確處理 HTTPS 和獲取真實 IP。

---

### 中間件順序（關鍵）

```javascript
// 1. Trust proxy（最前面）
app.set('trust proxy', 1);

// 2. CORS
app.use(cors({...}));

// 3. JSON parser
app.use(express.json());

// 4. Session
app.use(session({...}));

// 5. API 路由（優先匹配）
app.post('/api/auth/login', ...);
app.get('/api/auth/me', ...);
// ... 其他 API 路由

// 6. 健康檢查
app.get('/health', ...);

// 7. 靜態文件服務（在 API 路由之後）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendPath));
}

// 8. SPA fallback（最後）
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}
```

---

## 📊 Dockerfile 最終版本

```dockerfile
# 多階段構建
FROM node:22 AS builder

WORKDIR /app

# 複製 package files
COPY package.json package-lock.json ./
COPY api/package.json api/package-lock.json ./api/

# 強制安裝所有依賴（包括 devDependencies）
RUN npm install --production=false

# 複製所有源代碼
COPY . .

# 構建前端（設置 NODE_ENV=production 讓 Vite 正確構建）
RUN NODE_ENV=production npm run build

# 安裝後端生產依賴
WORKDIR /app/api
RUN npm ci --only=production

# 生產階段
FROM node:22-slim

WORKDIR /app

# 複製必要文件
COPY --from=builder /app/api ./api
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database ./database

WORKDIR /app/api

# 設置環境變數
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 啟動應用
CMD ["npm", "start"]
```

---

## 📝 Git 提交記錄（按時間順序）

```
3dd844f - fix(api): remove cookie domain for same-origin requests
f97fa74 - fix(docker): force install devDependencies with --production=false
4b4f284 - fix(docker): explicitly copy package-lock.json files
ccef430 - fix(docker): use npm install to ensure devDependencies are installed
6045ea6 - fix(docker): build frontend in production mode
71ee6fb - fix(api): disable PostgreSQL SSL for Zeabur
32195d2 - fix(docker): set NODE_ENV=development in build stage
d078b35 - feat(deploy): add custom Dockerfile for reliable builds
83c73b6 - fix(deploy): explicitly specify nodejs runtime type
726a7eb - fix(api): correct middleware order - API routes before static files
f9a8030 - fix(deploy): use npm ci to install all dependencies including devDependencies
0c4c039 - feat(api): add automatic database initialization on startup
f8f7600 - fix(api): fix session cookie issue in production
dfe6e1d - feat: merge frontend and backend into single service
```

---

## 🚀 部署步驟總結

### 1. 刪除舊服務
在 Zeabur Dashboard 中刪除：
- 舊的 `frontend` 服務
- 舊的 `api-timerecord` 服務

### 2. 創建新服務
- 連接 GitHub 倉庫
- Zeabur 自動檢測 `zeabur.json` 和 `Dockerfile`
- 服務名稱：`timerecord`

### 3. 配置環境變數
在 Zeabur 服務設置中添加：
```env
DATABASE_URL=（從 PostgreSQL 服務獲取）
SESSION_SECRET=（使用 crypto.randomBytes 生成）
NODE_ENV=production
FRONTEND_URL=https://timerecord.zeabur.app
DEPARTMENTS={"BZ":{"name":"企發室","username":"bz","password":"bz123"}}
```

### 4. 等待部署
- 構建過程約 2-3 分鐘
- 檢查 Build Logs 確認成功
- 檢查 Runtime Logs 確認服務啟動

### 5. 測試
1. 訪問 `https://timerecord.zeabur.app`
2. 登入：`bz` / `bz123`
3. 確認能正常跳轉到主頁
4. 測試各項功能

---

## 💡 關鍵經驗教訓

### 1. Docker 中 npm 依賴安裝
**問題：** npm 在 Docker 環境中的行為與本地不同

**解決：**
- 使用 `npm install --production=false` 明確安裝 devDependencies
- 不要依賴 NODE_ENV 環境變量
- 只在需要的命令中設置 NODE_ENV

### 2. 跨域 Cookie 的複雜性
**問題：** 現代瀏覽器對跨站 Cookie 有嚴格限制

**解決：**
- 最佳方案：使用同域名（單一服務架構）
- 次佳方案：使用自訂域名配置反向代理
- 避免：依賴 `SameSite=None` 和跨子域名 Cookie

### 3. Cookie Domain 設置
**關鍵：**
- 同域名請求：**不要設置 domain**
- 跨子域名：設置 `domain: '.example.com'`
- 跨站請求：需要 `sameSite: 'none'` + `secure: true`

### 4. 中間件順序至關重要
**原則：**
1. Trust proxy（最前）
2. CORS、JSON parser、Session
3. API 路由（優先）
4. 靜態文件服務
5. SPA fallback（最後）

### 5. Zeabur PostgreSQL 特性
**重要：**
- 不支援 SSL 連接
- 必須設置 `ssl: false`
- 使用 PostgreSQL session store 時需要先創建 `session` 表

### 6. Vite 生產構建
**關鍵：**
- 必須在構建命令中設置 `NODE_ENV=production`
- `import.meta.env.PROD` 依賴此環境變量
- 不能全局設置 `NODE_ENV=development`（會導致開發模式構建）

---

## 🎯 最終結果

### ✅ 所有問題已解決

1. ✅ 登入功能正常
2. ✅ Session 持久化
3. ✅ Cookie 正確保存和發送
4. ✅ 跨頁面導航正常
5. ✅ 所有 API 請求正常
6. ✅ 資料庫連接穩定
7. ✅ 前端和後端完美整合

### 🚀 性能優勢

- **更快的請求速度**（不需要 CORS 預檢）
- **更少的網路往返**（同域名）
- **更簡單的架構**（單一服務）
- **更低的成本**（減少一個服務）

### 🔒 安全性

- ✅ HttpOnly Cookie（防止 XSS）
- ✅ Secure Cookie（HTTPS only）
- ✅ SameSite=lax（CSRF 保護）
- ✅ Session 儲存在 PostgreSQL
- ✅ Trust proxy 正確配置

---

## 📞 參考資源

- **Zeabur 文件：** https://zeabur.com/docs
- **Express Session：** https://github.com/expressjs/session
- **Vite 生產構建：** https://vitejs.dev/guide/build.html
- **Docker 多階段構建：** https://docs.docker.com/build/building/multi-stage/
- **Chrome Cookie 政策：** https://developer.chrome.com/docs/privacy-security/samesite-cookies

---

## 🎉 總結

經過一整天的調試，成功將前後端分離架構改造為**單一服務架構**，徹底解決了跨域 Cookie 問題。

**關鍵成功因素：**
1. 正確的 Dockerfile 配置
2. 合理的中間件順序
3. 適當的 Cookie 設置
4. 仔細的問題診斷

**調試時間：** 約 3 小時
**提交次數：** 15 次
**最終狀態：** ✅ 完全成功

---

**最後更新：** 2025-12-12
**狀態：** ✅ 問題已完全解決，系統正常運行
