-- 開講枠(曜日×コマ)ごとの受付人数の上限を設定できるようにする。
-- NULLは「上限なし」を意味する。
ALTER TABLE period_availability ADD COLUMN IF NOT EXISTS capacity INTEGER;
