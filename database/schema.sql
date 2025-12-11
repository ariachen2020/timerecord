-- 補休登錄系統資料庫結構

-- 員工表（確保員工號碼全域唯一且只屬於一個部門）
CREATE TABLE IF NOT EXISTS employees (
  employee_id VARCHAR(50) PRIMARY KEY,
  department_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_code);

-- 補休記錄表
CREATE TABLE IF NOT EXISTS records (
  id SERIAL PRIMARY KEY,
  department_code VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  operation_type VARCHAR(10) NOT NULL CHECK (operation_type IN ('增加', '減少')),
  hours INT NOT NULL DEFAULT 0,
  minutes INT NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50),
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT check_time_positive CHECK (hours >= 0 AND minutes >= 0),
  CONSTRAINT check_time_not_zero CHECK (hours > 0 OR minutes > 0)
);

CREATE INDEX IF NOT EXISTS idx_records_dept_emp ON records(department_code, employee_id);
CREATE INDEX IF NOT EXISTS idx_records_effective_date ON records(effective_date);
CREATE INDEX IF NOT EXISTS idx_records_expiry_date ON records(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_records_operation_type ON records(operation_type);

-- FIFO 扣除對應表
CREATE TABLE IF NOT EXISTS deduction_mappings (
  id SERIAL PRIMARY KEY,
  deduction_record_id INT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  source_record_id INT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  deducted_hours INT NOT NULL DEFAULT 0,
  deducted_minutes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_deducted_positive CHECK (deducted_hours >= 0 AND deducted_minutes >= 0),
  CONSTRAINT check_deducted_not_zero CHECK (deducted_hours > 0 OR deducted_minutes > 0)
);

CREATE INDEX IF NOT EXISTS idx_deduction_mappings_deduction ON deduction_mappings(deduction_record_id);
CREATE INDEX IF NOT EXISTS idx_deduction_mappings_source ON deduction_mappings(source_record_id);

-- Session 表
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);

-- 註解說明
COMMENT ON TABLE employees IS '員工表，確保員工號碼全域唯一且只屬於一個部門';
COMMENT ON TABLE records IS '補休記錄表，記錄所有增加/減少時數的操作';
COMMENT ON TABLE deduction_mappings IS 'FIFO 扣除對應表，追蹤每次減少時數的來源';
COMMENT ON COLUMN records.expiry_date IS '到期日期 = effective_date + 365天，僅對增加記錄有效';
COMMENT ON COLUMN records.operation_type IS '操作類型：增加 或 減少';
