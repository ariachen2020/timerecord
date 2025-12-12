import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase(pool) {
  try {
    console.log('🔍 檢查資料庫表...');

    // 讀取 schema.sql
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // 執行 schema
    await pool.query(schema);

    console.log('✅ 資料庫表初始化完成');
  } catch (error) {
    console.error('❌ 資料庫初始化失敗:', error.message);
    throw error;
  }
}
