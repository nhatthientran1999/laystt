import { createFileRoute, Link, useLoaderData, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Clock, Headphones,
  History, Home, LogOut, Menu, Phone, RotateCw, Search, Settings, SkipForward, User, UserCircle2, Users,
} from "lucide-react";
import { Logo } from "@/components/qms/Logo";
import { Input } from "@/components/ui/input";
import { getQueue, getHistory, callNextTicket, skipTicket } from "@/lib/server-functions";

export const Route = createFileRoute("/quay")({
  head: () => ({
    meta: [
      { title: "Bảng điều khiển nhân viên — QMS" },
      { name: "description", content: "Bảng điều khiển quầy phục vụ cho nhân viên." },
    ],
  }),
  loader: async () => {
    const [queue, history] = await Promise.all([getQueue(), getHistory()]);
    return { queue, history };
  },
  component: QuayPage,
});

function QuayPage() {
  const navigate = useNavigate();
  const { queue: initialQueue, history: initialHistory } = useLoaderData({ from: "/quay" }) as any;
  const [activeTab, setActiveTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Tách dữ liệu: người đang phục vụ và người đang chờ
  const servingItem = initialQueue.find((i: any) => i.status === 'serving');
  const waitingItems = initialQueue.filter((i: any) => i.status === 'waiting');

  const callNext = async () => {
    setLoading(true);
    try {
      await callNextTicket({ data: { counterId: 1 } });
      window.location.reload();
    } catch (err) {
      alert("Lỗi khi gọi số: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const skipCurrent = async () => {
    if (!servingItem) return;
    setLoading(true);
    try {
      await skipTicket({ data: { ticketId: servingItem.id } });
      await callNextTicket({ data: { counterId: 1 } });
      window.location.reload();
    } catch (err) {
      alert("Lỗi khi bỏ qua: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formattedQueue = waitingItems.map((item: any) => ({
    id: item.id,
    num: item.display_number,
    name: item.customer_name,
    phone: item.phone_number,
    time: new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    service: item.service_type
  }));

  const current = servingItem ? {
    id: servingItem.id,
    num: servingItem.display_number,
    name: servingItem.customer_name,
    phone: servingItem.phone_number,
    service: servingItem.service_type
  } : null;

  const filteredQueue = formattedQueue.filter(
    (q: any) => q.num.includes(search) || q.name.toLowerCase().includes(search.toLowerCase()) || q.phone.includes(search),
  );

  const formattedHistory = initialHistory.map((h: any) => ({
    num: h.display_number,
    name: h.customer_name,
    phone: h.phone_number,
    status: h.status,
    completedAt: new Date(h.updated_at || h.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }));

  return (
    <div className="flex min-h-screen bg-secondary/40 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-x-hidden pb-10">
        <TopBar />
        <div className="space-y-6 p-6">
          {activeTab === "dashboard" ? (
            <>
              <ServingCard 
                current={current} 
                onNext={callNext} 
                onSkip={skipCurrent} 
                loading={loading}
                servingItem={servingItem}
              />
              <QueueList items={filteredQueue} search={search} setSearch={setSearch} total={formattedQueue.length} />
            </>
          ) : (
            <HistoryTable history={formattedHistory} />
          )}
        </div>
      </main>
    </div>
  );
}

function Sidebar({ activeTab, setActiveTab }: any) {
  const items = [
    { id: "dashboard", icon: Home, label: "Bảng điều khiển" },
    { id: "history", icon: History, label: "Lịch sử" },
  ];
  return (
    <aside className="bg-slate-900 text-white hidden w-64 flex-shrink-0 flex-col p-5 md:flex">
      <Link to="/" className="mb-10 px-2">
        <Logo className="brightness-200" />
      </Link>
      <nav className="flex-1 space-y-1">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setActiveTab(it.id)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${
              activeTab === it.id
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <it.icon className={`h-5 w-5 ${activeTab === it.id ? 'animate-pulse' : ''}`} />
            {it.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function TopBar() {
  return (
    <div className="bg-white flex h-20 items-center gap-4 border-b border-slate-100 px-8">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 shadow-inner">
        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        Đang trực: <span className="text-slate-900 ml-1">Quầy số 01</span>
      </div>
      <div className="ml-auto flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-black text-slate-800">Công an xã Hoà Tiến</div>
            <div className="text-[10px] font-bold text-primary uppercase tracking-tighter">Hệ thống QMS Smart</div>
          </div>
          <div className="bg-slate-100 h-10 w-10 rounded-2xl grid place-items-center border border-slate-200">
            <User className="h-5 w-5 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ServingCard({ current, onNext, onSkip, loading, servingItem }: any) {
  return (
    <div className="bg-white shadow-elegant grid grid-cols-1 gap-8 rounded-[2.5rem] border border-slate-100 p-10 lg:grid-cols-[1fr_auto_auto]">
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-4">
           <span className="px-3 py-1 rounded-lg bg-red-50 text-[10px] font-black text-red-600 uppercase tracking-widest border border-red-100">Đang phục vụ</span>
           <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        </div>
        
        <div className="flex items-baseline gap-6">
          <div className="bg-gradient-primary bg-clip-text text-9xl font-black leading-none tracking-tighter text-transparent">
            {current?.num || "---"}
          </div>
          <div className="flex flex-col">
             <div className="text-3xl font-black text-slate-800 uppercase tracking-tight leading-tight">
               {current?.name || "Hàng chờ trống"}
             </div>
             <div className="text-lg font-bold text-slate-300 mt-1 tabular-nums">
                {current?.phone || "SĐT: ---"}
             </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center gap-4">
          <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-widest italic">
             {current?.service || "Dịch vụ chuẩn"}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center">
        <ActionButton
          onClick={onNext}
          className="bg-slate-900 text-white hover:bg-primary hover:shadow-primary/20"
          label="GỌI TIẾP"
          sub="Chuyển sang số kế tiếp"
          icon={<ChevronRight className="h-10 w-10" />}
          disabled={loading}
        />
      </div>

      <div className="flex flex-col items-center justify-center">
        <ActionButton
          onClick={onSkip}
          className="bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100"
          label="BỎ QUA"
          sub="Khách vắng mặt"
          icon={<SkipForward className="h-10 w-10" />}
          disabled={loading || !servingItem}
        />
      </div>
    </div>
  );
}

function ActionButton({ onClick, className, label, sub, icon, disabled }: any) {
  return (
    <div className="flex flex-col items-center text-center">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`group h-36 w-36 md:h-44 md:w-44 grid place-items-center rounded-[2.5rem] shadow-elegant transition-all hover:-translate-y-2 active:scale-95 ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${className}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-3xl bg-white/10 group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div className="font-black uppercase tracking-widest text-xs md:text-sm">{label}</div>
        </div>
      </button>
      <p className="mt-4 max-w-[9rem] text-[10px] font-bold text-slate-400 uppercase tracking-tighter opacity-60 leading-tight">{sub}</p>
    </div>
  );
}

function QueueList({ items, search, setSearch, total }: any) {
  return (
    <div className="bg-white shadow-elegant rounded-[2.5rem] border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex flex-wrap items-center justify-between gap-6 bg-slate-50/30">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-primary/10 rounded-2xl">
              <Users className="h-6 w-6 text-primary" />
           </div>
           <div>
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Hàng chờ hiện tại</h2>
             <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Tổng cộng {total} người</p>
           </div>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo STT, tên hoặc SĐT..."
            className="h-12 rounded-2xl pl-12 bg-white border-slate-200 focus:ring-primary shadow-inner text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
              <th className="px-6 py-5 text-center">STT</th>
              <th className="px-6 py-5">Họ và tên</th>
              <th className="px-6 py-5">Liên hệ</th>
              <th className="px-6 py-5">Giờ lấy</th>
              <th className="px-6 py-5 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((q: any) => (
              <tr key={q.id} className="hover:bg-slate-50/50 transition-all group">
                <td className="px-6 py-6 text-center">
                  <span className="text-2xl font-black text-slate-200 group-hover:text-primary transition-colors tabular-nums">
                    {q.num}
                  </span>
                </td>
                <td className="px-6 py-6">
                  <div className="text-sm font-black text-slate-700 uppercase">{q.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">{q.service}</div>
                </td>
                <td className="px-6 py-6 font-bold text-slate-500 tabular-nums text-xs">{q.phone}</td>
                <td className="px-6 py-6">
                   <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                      <Clock className="h-3.5 w-3.5" /> {q.time}
                   </div>
                </td>
                <td className="px-6 py-6 text-right">
                  <button className="h-10 px-6 rounded-xl bg-slate-900 text-[10px] font-black text-white hover:bg-primary transition-all uppercase tracking-widest shadow-md">
                    GỌI
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <Users className="h-12 w-12" />
                    <p className="text-xs font-black uppercase tracking-widest">Không có ai trong hàng chờ</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistoryTable({ history }: any) {
  return (
    <div className="bg-white shadow-elegant rounded-[2.5rem] border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-4">
        <div className="p-3 bg-slate-900 rounded-2xl">
          <History className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Lịch sử hôm nay</h2>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
              <th className="px-6 py-5">STT</th>
              <th className="px-6 py-5">Khách hàng</th>
              <th className="px-6 py-5">Trạng thái</th>
              <th className="px-6 py-5">Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {history.map((h: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-5 font-black text-slate-800 text-lg tabular-nums">{h.num}</td>
                <td className="px-6 py-5 uppercase font-bold text-sm text-slate-700">{h.name}</td>
                <td className="px-6 py-5">
                   {h.status === 'served' ? (
                     <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[9px] font-black text-emerald-600 uppercase">Đã phục vụ</span>
                   ) : (
                     <span className="px-2.5 py-1 rounded-lg bg-red-50 text-[9px] font-black text-red-600 uppercase">Bỏ qua</span>
                   )}
                </td>
                <td className="px-6 py-5 text-[10px] font-black text-slate-400 tabular-nums">{h.completedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
