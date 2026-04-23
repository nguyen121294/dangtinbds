-- Migration: Fix doublePrecision → integer cho các trường tiền VNĐ
-- ✅ FIX BUG #7: Ngăn lỗi làm tròn tích lũy (floating-point drift)
-- VNĐ không có đơn vị xu nên integer là chính xác 100%
--
-- ⚠️ Chạy migration này trong Supabase SQL Editor TRƯỚC khi deploy code mới

-- 1. Chuyển commission_balance sang INTEGER
ALTER TABLE profiles 
  ALTER COLUMN commission_balance TYPE INTEGER USING ROUND(commission_balance)::INTEGER;

-- 2. Chuyển amount trong referral_commissions sang INTEGER
ALTER TABLE referral_commissions 
  ALTER COLUMN amount TYPE INTEGER USING ROUND(amount)::INTEGER;

-- 3. Chuyển amount trong withdrawal_requests sang INTEGER
ALTER TABLE withdrawal_requests 
  ALTER COLUMN amount TYPE INTEGER USING ROUND(amount)::INTEGER;

-- 4. (Tùy chọn) Thêm unique index ngăn duplicate commission per payment+tier
-- Đây là tuyến phòng thủ cấp DB cho Bug #1
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_commission_per_payment_tier 
  ON referral_commissions(payment_id, tier);
