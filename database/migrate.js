import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 載入環境變數
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 開始執行資料庫遷移...');
    console.log(`📊 資料庫: ${process.env.DATABASE_URL?.split('@')[1] || '未設定'}`);

    // 讀取 schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // 執行 schema
    await pool.query(schemaSql);

    console.log('✅ 資料庫遷移完成！');
    console.log('\n建立的資料表:');
    console.log('  - employees (員工表)');
    console.log('  - records (補休記錄表)');
    console.log('  - deduction_mappings (FIFO 扣除對應表)');
    console.log('  - session (Session 表)');

    // 檢查資料表
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n目前資料表清單:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ 資料庫遷移失敗:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
