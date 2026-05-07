import { createServerFn } from "@tanstack/react-start";
import { supabase } from "./supabase";

/**
 * Hàm lấy số thứ tự mới
 */
export const createTicket = createServerFn({ method: "POST" })
  .validator((data: { name: string; phone: string; service: string }) => data)
  .handler(async ({ data }) => {
    // 1. Lấy số lượng phiếu hiện có để tính số tiếp theo (Đơn giản cho bản demo)
    const { count } = await supabase
      .from("queues")
      .select("*", { count: "exact", head: true });

    const nextNumber = (count || 0) + 101;
    const displayNumber = `A${nextNumber}`;

    // 2. Chèn vào bảng queues
    const { data: ticket, error } = await supabase
      .from("queues")
      .insert({
        display_number: displayNumber,
        customer_name: data.name,
        phone_number: data.phone,
        service_type: data.service,
        status: "waiting",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating ticket:", error);
      throw new Error(error.message);
    }

    return ticket;
  });

/**
 * Hàm gọi số tiếp theo
 */
export const callNextTicket = createServerFn({ method: "POST" })
  .handler(async () => {
    // 1. Tìm số đang chờ tiếp theo
    const { data: nextTicket, error: fetchError } = await supabase
      .from("queues")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError || !nextTicket) return null;

    // 2. Cập nhật trạng thái số đó thành 'serving'
    await supabase
      .from("queues")
      .update({ status: "serving" })
      .eq("id", nextTicket.id);

    return nextTicket;
  });

/**
 * Hàm bỏ qua số hiện tại
 */
export const skipTicket = createServerFn({ method: "POST" })
  .validator((data: { ticketId: string }) => data)
  .handler(async ({ data }) => {
    await supabase
      .from("queues")
      .update({ status: "skipped" })
      .eq("id", data.ticketId);

    return { success: true };
  });

/**
 * Hàm lấy danh sách hàng chờ
 */
export const getQueue = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase
    .from("queues")
    .select("*")
    .in("status", ["waiting", "serving"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
});
