-- ============================================================
-- MIGRATION: State-based Queue System
-- Chạy script này trong Supabase SQL Editor
-- ============================================================

-- 1. Thêm các cột mới vào bảng queues hiện có
ALTER TABLE queues
  ADD COLUMN IF NOT EXISTS scheduled_time  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checkin_time    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS skipped_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eta             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avg_service_mins INTEGER DEFAULT 15;

-- 2. Index tăng tốc query
CREATE INDEX IF NOT EXISTS idx_queues_status       ON queues(status);
CREATE INDEX IF NOT EXISTS idx_queues_status_sched ON queues(status, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_queues_phone        ON queues(phone_number);

-- 3. Bảng log audit
CREATE TABLE IF NOT EXISTS queue_status_logs (
  id             BIGSERIAL PRIMARY KEY,
  queue_id       UUID REFERENCES queues(id) ON DELETE CASCADE,
  from_status    TEXT,
  to_status      TEXT NOT NULL,
  changed_by     TEXT,          -- 'system' | 'admin' | 'customer'
  reason         TEXT,
  changed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RPC 1: call_next_ticket
-- Dùng FOR UPDATE SKIP LOCKED để chống race condition
-- nhiều quầy cùng bấm "Gọi tiếp theo" đồng thời
-- ============================================================
CREATE OR REPLACE FUNCTION call_next_ticket(p_counter_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_next     queues%ROWTYPE;
  v_result   JSONB;
BEGIN
  -- Bước 1: Lock & lấy người CHECKED_IN có scheduled_time (hoặc created_at) sớm nhất
  -- SKIP LOCKED: Quầy khác đang xử lý người này thì bỏ qua, lấy người tiếp theo
  SELECT * INTO v_next
  FROM queues
  WHERE status = 'checked_in'
  ORDER BY COALESCE(scheduled_time, created_at) ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    -- Không có ai checked_in → đánh SKIPPED cho pending đã quá giờ rồi trả về null
    UPDATE queues
    SET status     = 'skipped',
        skipped_at = NOW(),
        updated_at = NOW()
    WHERE status         = 'waiting'
      AND scheduled_time IS NOT NULL
      AND scheduled_time < NOW();

    RETURN NULL;
  END IF;

  -- Bước 2: Chuyển sang in_progress
  UPDATE queues
  SET status         = 'in_progress',
      started_at     = NOW(),
      counter_number = p_counter_id,
      updated_at     = NOW()
  WHERE id = v_next.id;

  -- Bước 3: Đánh SKIPPED cho những người PENDING đã quá giờ hẹn
  UPDATE queues
  SET status     = 'skipped',
      skipped_at = NOW(),
      updated_at = NOW()
  WHERE status         = 'waiting'
    AND scheduled_time IS NOT NULL
    AND scheduled_time < NOW();

  -- Ghi log
  INSERT INTO queue_status_logs (queue_id, from_status, to_status, changed_by, reason)
  VALUES (v_next.id, 'checked_in', 'in_progress', 'admin', 'Gọi số tiếp theo - quầy ' || p_counter_id);

  -- Trả về record vừa được gọi
  SELECT row_to_json(q)::JSONB INTO v_result
  FROM queues q WHERE id = v_next.id;

  RETURN v_result;
END;
$$;

-- ============================================================
-- RPC 2: checkin_ticket
-- Xử lý check-in cho cả waiting và skipped (trong grace period)
-- ============================================================
CREATE OR REPLACE FUNCTION checkin_ticket(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_appt    queues%ROWTYPE;
  v_result  JSONB;
  v_minutes_late NUMERIC;
BEGIN
  -- Lock hàng để tránh 2 thiết bị check-in cùng lúc
  SELECT * INTO v_appt
  FROM queues
  WHERE phone_number = p_phone
    AND status IN ('waiting', 'skipped')
  ORDER BY COALESCE(scheduled_time, created_at) ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy lịch hẹn hợp lệ.');
  END IF;

  -- Nếu đang SKIPPED: kiểm tra grace period 30 phút
  IF v_appt.status = 'skipped' THEN
    v_minutes_late := EXTRACT(EPOCH FROM (NOW() - v_appt.skipped_at)) / 60;
    IF v_minutes_late > 30 THEN
      DELETE FROM queues WHERE id = v_appt.id;
      RETURN jsonb_build_object('success', false, 'message', 'Đã quá thời gian ân hạn 30 phút. Lịch hẹn đã bị xóa khỏi hệ thống.');
    END IF;
  END IF;

  -- Chuyển sang checked_in
  UPDATE queues
  SET status       = 'checked_in',
      checkin_time = NOW(),
      updated_at   = NOW()
  WHERE id = v_appt.id;

  INSERT INTO queue_status_logs (queue_id, from_status, to_status, changed_by, reason)
  VALUES (v_appt.id, v_appt.status, 'checked_in', 'customer', 'Khách tự check-in');

  SELECT row_to_json(q)::JSONB INTO v_result
  FROM queues q WHERE id = v_appt.id;

  RETURN jsonb_build_object('success', true, 'data', v_result);
END;
$$;

-- ============================================================
-- RPC 3: complete_ticket — Admin đánh dấu hoàn tất
-- ============================================================
CREATE OR REPLACE FUNCTION complete_ticket(p_ticket_id UUID, p_counter_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE queues
  SET status       = 'completed',
      completed_at = NOW(),
      updated_at   = NOW()
  WHERE id = p_ticket_id AND status = 'in_progress';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy phiên đang xử lý.');
  END IF;

  INSERT INTO queue_status_logs (queue_id, from_status, to_status, changed_by, reason)
  VALUES (p_ticket_id, 'in_progress', 'completed', 'admin', 'Hoàn tất - quầy ' || p_counter_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- RPC 4: skip_current_ticket — Admin bỏ qua người đang xử lý
-- ============================================================
CREATE OR REPLACE FUNCTION skip_current_ticket(p_ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE queues
  SET status     = 'skipped',
      skipped_at = NOW(),
      updated_at = NOW()
  WHERE id = p_ticket_id AND status IN ('in_progress', 'checked_in');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy phiên hợp lệ.');
  END IF;

  INSERT INTO queue_status_logs (queue_id, from_status, to_status, changed_by, reason)
  VALUES (p_ticket_id, 'in_progress', 'skipped', 'admin', 'Admin bỏ qua - vắng mặt');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- RPC 5: auto_delete_expired_skipped (Cronjob thay thế)
-- Gọi thủ công hoặc qua pg_cron mỗi phút
-- ============================================================
CREATE OR REPLACE FUNCTION auto_delete_expired_skipped()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM queues
  WHERE status = 'skipped'
    AND skipped_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- RPC 6: recall_skipped_ticket — Admin gọi lại khách từ lịch sử
-- ============================================================
CREATE OR REPLACE FUNCTION recall_skipped_ticket(p_ticket_id UUID, p_counter_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  -- Chỉ cho phép gọi lại nếu đang SKIPPED (vắng mặt) hoặc CHECKED_IN (đang chờ)
  UPDATE queues
  SET status         = 'in_progress',
      started_at     = NOW(),
      counter_number = p_counter_id,
      updated_at     = NOW()
  WHERE id = p_ticket_id AND status IN ('skipped', 'checked_in');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Không thể gọi lại số này (có thể đã quá hạn hoặc đang được phục vụ).');
  END IF;

  INSERT INTO queue_status_logs (queue_id, from_status, to_status, changed_by, reason)
  VALUES (p_ticket_id, 'skipped', 'in_progress', 'admin', 'Gọi lại từ lịch sử - quầy ' || p_counter_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- RPC 7: get_server_time — Lấy giờ hệ thống online
-- ============================================================
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS TIMESTAMPTZ
LANGUAGE sql
AS $$
  SELECT NOW();
$$;

-- ============================================================
-- (Tuỳ chọn) Kích hoạt pg_cron nếu Supabase plan hỗ trợ:
-- SELECT cron.schedule('cancel-expired-skipped', '* * * * *',
--   'SELECT auto_cancel_expired_skipped()');
-- ============================================================
