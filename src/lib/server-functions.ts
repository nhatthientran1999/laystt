import { createServerFn } from "@tanstack/react-start";
import { supabase } from "./supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const GRACE_PERIOD_MINUTES = 30;
const AVG_SERVICE_MINS = 15;

/**
 * Tính ETA động cho toàn bộ hàng đợi.
 * Công thức: ETA[N] = MAX(scheduled_time[N], ETA[N-1] + avg_service_mins)
 */
async function recalculateAllETAs() {
  const { data: queue } = await supabase
    .from("queues")
    .select("id, scheduled_time, avg_service_mins, status, started_at, created_at")
    .in("status", ["in_progress", "checked_in"])
    .order("status", { ascending: false }) // in_progress trước
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (!queue || queue.length === 0) return;

  let prevEndTime: Date | null = null;

  const updates: { id: number; eta: string }[] = [];

  for (const person of queue) {
    const svcMs = (person.avg_service_mins || AVG_SERVICE_MINS) * 60 * 1000;
    let startTime: Date;

    if (person.status === "in_progress" && person.started_at) {
      startTime = new Date(person.started_at);
    } else {
      const scheduledMs = person.scheduled_time
        ? new Date(person.scheduled_time).getTime()
        : new Date(person.created_at).getTime();
      startTime = prevEndTime
        ? new Date(Math.max(scheduledMs, prevEndTime.getTime()))
        : new Date(scheduledMs);
    }

    prevEndTime = new Date(startTime.getTime() + svcMs);
    updates.push({ id: person.id, eta: startTime.toISOString() });
  }

  // Batch update ETA
  await Promise.all(
    updates.map(({ id, eta }) =>
      supabase.from("queues").update({ eta, updated_at: new Date().toISOString() }).eq("id", id)
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API 1: Lấy số thứ tự mới (khách tự lấy)
// ─────────────────────────────────────────────────────────────────────────────
export const createTicket = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { name: string; phone: string; service: string } }) => {
    // Đếm số phiếu hôm nay để sinh display_number
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Kiểm tra xem số điện thoại đã có phiếu chưa (trong ngày hôm nay và chưa hoàn tất/hủy)
    const { data: existingTicket } = await supabase
      .from("queues")
      .select("id, display_number")
      .eq("phone_number", data.phone)
      .gte("created_at", today.toISOString())
      .in("status", ["checked_in", "in_progress", "waiting", "skipped"])
      .maybeSingle();

    if (existingTicket) {
      throw new Error(`Số điện thoại này đã đăng ký số ${existingTicket.display_number}. Mỗi số điện thoại chỉ được đăng ký 1 lần trong ngày.`);
    }

    const { count } = await supabase
      .from("queues")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    const nextNumber = (count || 0) + 101;
    const displayNumber = `A${nextNumber}`;

    const { data: ticket, error } = await supabase
      .from("queues")
      .insert({
        display_number: displayNumber,
        customer_name: data.name,
        phone_number: data.phone,
        service_type: data.service,
        status: "checked_in",
        checkin_time: new Date().toISOString(),
        scheduled_time: new Date().toISOString(),
        avg_service_mins: AVG_SERVICE_MINS,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Tính lại ETA sau khi thêm mới
    await recalculateAllETAs();

    return ticket;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// API 2: Check-in (khách đặt lịch trước, đến nơi bấm xác nhận)
// Dùng RPC để có Row Locking trong PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────
export const checkInByPhone = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { phone: string } }) => {
    const { data: result, error } = await supabase.rpc("checkin_ticket", {
      p_phone: data.phone,
    });

    if (error) throw new Error(error.message);

    if (result?.success) {
      await recalculateAllETAs();
    }

    return result;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// API 3: Admin gọi số tiếp theo — dùng RPC với FOR UPDATE SKIP LOCKED
// Chống race condition: nhiều quầy bấm đồng thời không bị gọi trùng người
// ─────────────────────────────────────────────────────────────────────────────
export const callNextTicket = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { counterId: number } }) => {
    const { data: result, error } = await supabase.rpc("call_next_ticket", {
      p_counter_id: data.counterId,
    });

    if (error) throw new Error(error.message);

    // Tính lại ETA cho toàn hàng sau khi trạng thái thay đổi
    await recalculateAllETAs();

    return result;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// API 4: Admin hoàn tất phiên làm việc
// ─────────────────────────────────────────────────────────────────────────────
export const completeTicket = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { ticketId: number; counterId: number } }) => {
    const { data: result, error } = await supabase.rpc("complete_ticket", {
      p_ticket_id: data.ticketId,
      p_counter_id: data.counterId,
    });

    if (error) throw new Error(error.message);

    await recalculateAllETAs();
    return result;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// API 5: Admin bỏ qua (khách vắng mặt) — SKIPPED, chưa CANCEL ngay
// ─────────────────────────────────────────────────────────────────────────────
export const skipTicket = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { ticketId: number } }) => {
    const { data: result, error } = await supabase.rpc("skip_current_ticket", {
      p_ticket_id: data.ticketId,
    });

    if (error) throw new Error(error.message);

    await recalculateAllETAs();
    return result;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// API 6: Tra cứu số thứ tự bằng SĐT (kèm ETA)
// ─────────────────────────────────────────────────────────────────────────────
export const findTicketByPhone = createServerFn({ method: "GET" }).handler(
  async ({ data: phone }: { data: string }) => {
    const { data, error } = await supabase
      .from("queues")
      .select("*")
      .eq("phone_number", phone)
      .in("status", ["checked_in", "in_progress", "waiting", "skipped"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// API 7: Lấy hàng đợi hiển thị màn hình chờ
// Trả về: [đang phục vụ, mời chuẩn bị, ...hàng chờ]
// ─────────────────────────────────────────────────────────────────────────────
export const getQueue = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase
    .from("queues")
    .select("*")
    .in("status", ["in_progress", "checked_in"])
    .order("status", { ascending: false })   // in_progress trước
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  // Map status cũ → mới cho màn hình hiển thị
  return (data || []).map((item: any) => ({
    ...item,
    // Tương thích ngược với code hiển thị cũ dùng "serving"/"waiting"
    status: item.status === "in_progress" ? "serving" : "waiting",
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// API 8: Lấy lịch sử hôm nay (completed + skipped + canceled)
// ─────────────────────────────────────────────────────────────────────────────
export const getHistory = createServerFn({ method: "GET" }).handler(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("queues")
    .select("*")
    .in("status", ["completed", "skipped", "canceled"])
    .gte("created_at", today.toISOString())
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data || []).map((item: any) => ({
    ...item,
    // Map status mới → hiển thị cũ tương thích
    status: item.status === "completed" ? "served" : item.status,
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// API 9: Trigger thủ công cleanup SKIPPED → CANCELED (thay cronjob)
// Gọi mỗi khi tải trang hoặc theo interval ở client
// ─────────────────────────────────────────────────────────────────────────────
export const runGracePeriodCleanup = createServerFn({ method: "POST" }).handler(async () => {
  const { data, error } = await supabase.rpc("auto_delete_expired_skipped");
  if (error) throw new Error(error.message);
  return { deletedCount: data };
});
// ─────────────────────────────────────────────────────────────────────────────
// API 10: Gọi lại số vắng mặt (Recall)
// ─────────────────────────────────────────────────────────────────────────────
export const recallTicket = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { ticketId: string; counterId: number } }) => {
    const { data: result, error } = await supabase.rpc("recall_skipped_ticket", {
      p_ticket_id: data.ticketId,
      p_counter_id: data.counterId,
    });

    if (error) throw new Error(error.message);

    await recalculateAllETAs();
    return result;
  }
);
// ─────────────────────────────────────────────────────────────────────────────
// API 11: Lấy giờ hệ thống online từ DB
// ─────────────────────────────────────────────────────────────────────────────
export const getServerTime = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase.rpc("get_server_time");
  if (error) throw new Error(error.message);
  return data;
});
