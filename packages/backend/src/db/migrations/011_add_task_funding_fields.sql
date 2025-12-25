-- 添加任務的經費來源和金額欄位
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(255),
ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2);

-- 添加註解
COMMENT ON COLUMN tasks.funding_source IS '經費來源';
COMMENT ON COLUMN tasks.amount IS '金額';

