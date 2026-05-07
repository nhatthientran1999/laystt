import { createServerFn } from "@tanstack/react-start";
import { supabase } from "./supabase";

/**
 * Hàm lấy số thứ tự mới
 */
export const createTicket = createServerFn({ method: "POST" })
  .validator((data: { name: string; phone: string; service: string }) => data)
  .handler(async ({ data }) => {
    const { count } = await supabase
      .from("queues")
      .select("*", { count: "exact", head: true });

    const nextNumber = (count || 0) + 101;
    const displayNumber = `A${nextNumber}`;

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

    if (error) throw new Error(error.message);
    return ticket;
  });

/**
 * Hàm gọi số tiếp theo
 */
export const callNextTicket = createServerFn({ method: "POST" })
  .validator((data: { counterId: number }) => data)
  .handler(async ({ data }) => {
    const { data: nextTicket, error: fetchError } = await supabase
      .from("queues")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError || !nextTicket) return null;

    await supabase
      .from("queues")
      .update({ status: "serving", counter_number: data.counterId })
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
