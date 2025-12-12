import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3000;
const PgSession = connectPgSimple(session);

// 信任代理（必須在所有中介層之前設置）
app.set('trust proxy', 1);

// 資料庫連線
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => console.error('資料庫錯誤:', err));

// 載入部門設定
const departments = JSON.parse(process.env.DEPARTMENTS || '{"HR":{"name":"人資部","username":"hr","password":"hr123"}}');

// 中介層
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));
app.use(express.json());

app.use(session({
  store: new PgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.zeabur.app' : undefined
  }
}));

// === 工具函數 ===
const toMinutes = (h, m) => h * 60 + m;
const fromMinutes = (total) => ({ hours: Math.floor(total / 60), minutes: total % 60 });
const formatTime = (h, m) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
const calcExpiryDate = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() + 365);
  return d.toISOString().split('T')[0];
};
const isExpired = (expiry) => expiry && new Date(expiry) < new Date();
const daysUntil = (expiry) => expiry ? Math.ceil((new Date(expiry) - new Date()) / 86400000) : null;
const getStatus = (expiry) => {
  if (!expiry) return 'normal';
  const days = daysUntil(expiry);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'normal';
};

// === API 路由 ===

// 登入
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const dept = Object.entries(departments).find(([code, d]) => d.username === username && d.password === password);
  if (!dept) return res.status(401).json({ success: false, error: '帳號或密碼錯誤' });
  req.session.user = { username, departmentCode: dept[0], departmentName: dept[1].name };
  res.json({ success: true, user: req.session.user });
});

// 登出
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// 取得當前使用者
app.get('/api/auth/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ success: false, error: '未登入' });
  res.json({ success: true, user: req.session.user });
});

// 認證中介層
const auth = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ success: false, error: '未登入' });
  req.user = req.session.user;
  next();
};

// 新增記錄
app.post('/api/records', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { employeeId, operationType, hours, minutes, effectiveDate, reason } = req.body;
    const { departmentCode, username } = req.user;

    if (!employeeId || !operationType || !effectiveDate) {
      throw new Error('缺少必填欄位');
    }

    if (hours < 0 || minutes < 0 || (hours === 0 && minutes === 0)) {
      throw new Error('時數格式錯誤');
    }

    await client.query('BEGIN');

    // 檢查員工
    const check = await client.query('SELECT department_code FROM employees WHERE employee_id = $1', [employeeId]);
    if (check.rows.length > 0 && check.rows[0].department_code !== departmentCode) {
      throw new Error(`員工 ${employeeId} 已被 ${check.rows[0].department_code} 使用`);
    }

    // 確保員工存在
    await client.query(
      'INSERT INTO employees (employee_id, department_code) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [employeeId, departmentCode]
    );

    // 檢查餘額 (減少操作)
    if (operationType === '減少') {
      const adds = await client.query(
        `SELECT id, hours, minutes FROM records
         WHERE employee_id = $1 AND operation_type = '增加'
         AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
         ORDER BY effective_date, created_at`,
        [employeeId]
      );

      const deducted = await client.query(
        `SELECT source_record_id, SUM(deducted_hours) AS h, SUM(deducted_minutes) AS m
         FROM deduction_mappings dm
         JOIN records r ON dm.deduction_record_id = r.id
         WHERE r.employee_id = $1
         GROUP BY source_record_id`,
        [employeeId]
      );

      const deductMap = new Map(deducted.rows.map(r => [r.source_record_id, toMinutes(parseInt(r.h) || 0, parseInt(r.m) || 0)]));
      let available = 0;
      adds.rows.forEach(r => {
        const orig = toMinutes(r.hours, r.minutes);
        const ded = deductMap.get(r.id) || 0;
        available += orig - ded;
      });

      const requested = toMinutes(hours, minutes);
      if (requested > available) {
        const avail = fromMinutes(available);
        throw new Error(`餘額不足！可用: ${formatTime(avail.hours, avail.minutes)}, 欲扣除: ${formatTime(hours, minutes)}`);
      }
    }

    // 插入記錄
    const expiry = operationType === '增加' ? calcExpiryDate(effectiveDate) : null;
    const result = await client.query(
      `INSERT INTO records (department_code, employee_id, operation_type, hours, minutes, effective_date, expiry_date, reason, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [departmentCode, employeeId, operationType, hours, minutes, effectiveDate, expiry, reason || '', username]
    );

    // FIFO 扣除
    if (operationType === '減少') {
      const adds = await client.query(
        `SELECT id, hours, minutes FROM records
         WHERE employee_id = $1 AND operation_type = '增加'
         AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
         ORDER BY effective_date, created_at`,
        [employeeId]
      );

      const deducted = await client.query(
        `SELECT source_record_id, SUM(deducted_hours) AS h, SUM(deducted_minutes) AS m
         FROM deduction_mappings dm JOIN records r ON dm.deduction_record_id = r.id
         WHERE r.employee_id = $1 GROUP BY source_record_id`,
        [employeeId]
      );

      const deductMap = new Map(deducted.rows.map(r => [r.source_record_id, toMinutes(parseInt(r.h) || 0, parseInt(r.m) || 0)]));
      let remaining = toMinutes(hours, minutes);

      for (const add of adds.rows) {
        if (remaining <= 0) break;
        const orig = toMinutes(add.hours, add.minutes);
        const ded = deductMap.get(add.id) || 0;
        const avail = orig - ded;
        if (avail > 0) {
          const toDeduct = Math.min(avail, remaining);
          const { hours: dh, minutes: dm } = fromMinutes(toDeduct);
          await client.query(
            'INSERT INTO deduction_mappings (deduction_record_id, source_record_id, deducted_hours, deducted_minutes) VALUES ($1, $2, $3, $4)',
            [result.rows[0].id, add.id, dh, dm]
          );
          remaining -= toDeduct;
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0], message: `${operationType}成功` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// 查詢員工
app.get('/api/records/employee/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const records = await pool.query(
      'SELECT * FROM records WHERE employee_id = $1 AND department_code = $2 ORDER BY effective_date DESC, created_at DESC',
      [employeeId, req.user.departmentCode]
    );

    if (records.rows.length === 0) {
      return res.status(404).json({ success: false, error: `找不到員工 ${employeeId}` });
    }

    // 計算餘額
    const adds = await pool.query(
      `SELECT id, hours, minutes FROM records
       WHERE employee_id = $1 AND operation_type = '增加'
       AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)`,
      [employeeId]
    );

    const deducted = await pool.query(
      `SELECT source_record_id, SUM(deducted_hours) AS h, SUM(deducted_minutes) AS m
       FROM deduction_mappings dm JOIN records r ON dm.deduction_record_id = r.id
       WHERE r.employee_id = $1 GROUP BY source_record_id`,
      [employeeId]
    );

    const deductMap = new Map(deducted.rows.map(r => [r.source_record_id, toMinutes(parseInt(r.h) || 0, parseInt(r.m) || 0)]));
    let availableMinutes = 0;
    adds.rows.forEach(r => {
      const orig = toMinutes(r.hours, r.minutes);
      const ded = deductMap.get(r.id) || 0;
      availableMinutes += orig - ded;
    });

    // 計算統計
    let totalMinutes = 0, expiringMinutes = 0, expiredMinutes = 0;
    const recordsWithStatus = records.rows.map(r => {
      if (r.operation_type === '增加') {
        const mins = toMinutes(r.hours, r.minutes);
        totalMinutes += mins;
        const status = getStatus(r.expiry_date);
        if (status === 'expired') expiredMinutes += mins;
        else if (status === 'expiring_soon') expiringMinutes += mins;
      }
      return {
        ...r,
        expiryStatus: getStatus(r.expiry_date),
        daysUntilExpiry: daysUntil(r.expiry_date)
      };
    });

    res.json({
      success: true,
      data: {
        employeeId,
        records: recordsWithStatus,
        summary: {
          totalAccumulated: fromMinutes(totalMinutes),
          availableBalance: fromMinutes(availableMinutes),
          expiringSoon: fromMinutes(expiringMinutes),
          expired: fromMinutes(expiredMinutes)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 獲取所有員工列表
app.get('/api/employees', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT employee_id, department_code, created_at FROM employees WHERE department_code = $1 ORDER BY employee_id',
      [req.user.departmentCode]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 刪除員工（會一併刪除相關記錄）
app.delete('/api/employees/:employeeId', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { employeeId } = req.params;

    // 檢查員工是否存在且屬於該部門
    const check = await client.query(
      'SELECT department_code FROM employees WHERE employee_id = $1',
      [employeeId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: `找不到員工 ${employeeId}` });
    }

    if (check.rows[0].department_code !== req.user.departmentCode) {
      return res.status(403).json({ success: false, error: '無權刪除其他部門的員工' });
    }

    await client.query('BEGIN');

    // 刪除扣除映射記錄
    await client.query(
      `DELETE FROM deduction_mappings WHERE deduction_record_id IN
       (SELECT id FROM records WHERE employee_id = $1)`,
      [employeeId]
    );

    await client.query(
      `DELETE FROM deduction_mappings WHERE source_record_id IN
       (SELECT id FROM records WHERE employee_id = $1)`,
      [employeeId]
    );

    // 刪除補休記錄
    await client.query(
      'DELETE FROM records WHERE employee_id = $1',
      [employeeId]
    );

    // 刪除員工
    await client.query(
      'DELETE FROM employees WHERE employee_id = $1',
      [employeeId]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: `員工 ${employeeId} 已刪除` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// 部門總覽
app.get('/api/records/overview', auth, async (req, res) => {
  try {
    const emps = await pool.query(
      'SELECT DISTINCT employee_id FROM employees WHERE department_code = $1 ORDER BY employee_id',
      [req.user.departmentCode]
    );

    const data = { expiringSoon: [], expired: [], allEmployees: [] };

    for (const emp of emps.rows) {
      const records = await pool.query(
        'SELECT * FROM records WHERE employee_id = $1 AND department_code = $2',
        [emp.employee_id, req.user.departmentCode]
      );

      let expiringMinutes = 0, expiredMinutes = 0;
      let earliestExpiry = null;

      for (const r of records.rows) {
        if (r.operation_type === '增加') {
          const mins = toMinutes(r.hours, r.minutes);
          const status = getStatus(r.expiry_date);
          if (status === 'expired') expiredMinutes += mins;
          else if (status === 'expiring_soon') {
            expiringMinutes += mins;
            if (!earliestExpiry || r.expiry_date < earliestExpiry) {
              earliestExpiry = r.expiry_date;
            }
          }
        }
      }

      if (expiringMinutes > 0) {
        data.expiringSoon.push({
          employeeId: emp.employee_id,
          amount: fromMinutes(expiringMinutes),
          earliestExpiryDate: earliestExpiry
        });
      }

      if (expiredMinutes > 0) {
        data.expired.push({
          employeeId: emp.employee_id,
          amount: fromMinutes(expiredMinutes)
        });
      }

      data.allEmployees.push({ employeeId: emp.employee_id });
    }

    res.json({
      success: true,
      data: {
        departmentCode: req.user.departmentCode,
        totalEmployees: emps.rows.length,
        ...data
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 健康檢查
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   補休登錄系統 - API 伺服器           ║
╚════════════════════════════════════════╝

🚀 伺服器啟動成功！
📡 端口: ${PORT}
🌍 環境: ${process.env.NODE_ENV || 'development'}

可用端點:
  - POST /api/auth/login
  - POST /api/auth/logout
  - GET  /api/auth/me
  - POST /api/records
  - GET  /api/records/employee/:id
  - GET  /api/records/overview
  - GET  /api/employees
  - DELETE /api/employees/:id
  `);
});
