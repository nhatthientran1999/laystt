import { createFileRoute, Link, useLoaderData, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  CheckCircle, ChevronRight, Clock, History, Home, Search, SkipForward, User, UserCheck, Users,
} from "lucide-react";
import { Logo } from "@/components/qms/Logo";
import { Input } from "@/components/ui/input";
import { getQueue, getHistory, callNextTicket, skipTicket, completeTicket, runGracePeriodCleanup, recallTicket } from "@/lib/server-functions";

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

  // Trigger cleanup SKIPPED → CANCELED mỗi khi load trang
  useEffect(() => {
    runGracePeriodCleanup({ data: undefined }).catch(console.error);
  }, []);

  // Người đang IN_PROGRESS (serving)
  const servingItem = initialQueue.find((i: any) => i.status === 'serving');
  // Người CHECKED_IN tiếp theo (mời chuẩn bị)
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

  const completeCurrent = async () => {
    if (!servingItem) return;
    setLoading(true);
    try {
      await completeTicket({ data: { ticketId: servingItem.id, counterId: 1 } });
      window.location.reload();
    } catch (err) {
      alert("Lỗi khi hoàn tất: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const skipCurrent = async () => {
    if (!servingItem) return;
    setLoading(true);
    try {
      // Bỏ qua người hiện tại (SKIPPED, chưa hủy ngay)
      await skipTicket({ data: { ticketId: servingItem.id } });
      // Gọi người tiếp theo trong hàng
      await callNextTicket({ data: { counterId: 1 } });
      window.location.reload();
    } catch (err) {
      alert("Lỗi khi bỏ qua: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecall = async (ticketId: string) => {
    setLoading(true);
    try {
      await recallTicket({ data: { ticketId, counterId: 1 } });
      window.location.reload();
    } catch (err) {
      alert("Lỗi khi gọi lại: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formattedQueue = waitingItems.map((item: any) => ({
    id: item.id,
    num: item.display_number,
    name: item.customer_name,
    phone: item.phone_number,
    time: new Date(item.checkin_time || item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    service: item.service_type,
    eta: item.eta ? new Date(item.eta).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
    status: item.status,
  }));

  const current = servingItem ? {
    id: servingItem.id,
    num: servingItem.display_number,
    name: servingItem.customer_name,
    phone: servingItem.phone_number,
    service: servingItem.service_type,
    startedAt: servingItem.started_at
      ? new Date(servingItem.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : null,
  } : null;

  const filteredQueue = formattedQueue.filter(
    (q: any) => q.num.includes(search) || q.name.toLowerCase().includes(search.toLowerCase()) || q.phone.includes(search),
  );

  const formattedHistory = initialHistory.map((h: any) => ({
    id: h.id,
    num: h.display_number,
    name: h.customer_name,
    phone: h.phone_number,
    status: h.status,
    completedAt: new Date(h.updated_at || h.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }));

  return (
    <div className="flex min-h-screen lg:h-screen overflow-x-hidden lg:overflow-hidden bg-secondary/40 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-x-hidden pb-10">
        <TopBar />
        <div className="space-y-4 md:space-y-6 p-3 md:p-6">
          {activeTab === "dashboard" ? (
            <>
              <ServingCard 
                current={current} 
                onNext={callNext}
                onComplete={completeCurrent}
                onSkip={skipCurrent} 
                loading={loading}
                servingItem={servingItem}
              />
              <QueueList items={filteredQueue} search={search} setSearch={setSearch} total={formattedQueue.length} />
            </>
          ) : (
            <HistoryTable history={formattedHistory} onRecall={handleRecall} loading={loading} />
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
    <div className="bg-white flex h-16 md:h-20 items-center gap-2 md:gap-4 border-b border-slate-100 px-4 md:px-8 shrink-0">
      <div className="flex items-center gap-2 md:gap-3 rounded-xl md:rounded-2xl border border-slate-100 bg-slate-50 px-3 md:px-5 py-1.5 md:py-2.5 text-[9px] md:text-xs font-black uppercase tracking-widest text-slate-500 shadow-inner">
        <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="hidden xs:inline">Đang trực:</span> <span className="text-slate-900 ml-0.5 md:ml-1">Quầy 01</span>
      </div>
      <div className="ml-auto flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-black text-slate-800 leading-tight">Công an xã Hoà Tiến</div>
            <div className="text-[10px] font-bold text-primary uppercase tracking-tighter">Hệ thống QMS Smart</div>
          </div>
          <div className="bg-slate-100 h-8 w-8 md:h-10 md:w-10 rounded-xl md:rounded-2xl grid place-items-center border border-slate-200">
            <User className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ServingCard({ current, onNext, onComplete, onSkip, loading, servingItem }: any) {
  return (
    <div className="bg-white shadow-elegant flex flex-col rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 p-5 md:p-10 lg:grid lg:grid-cols-[1fr_auto_auto_auto] gap-6 md:gap-8">
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-2 md:mb-4">
           <span className="px-2 md:px-3 py-1 rounded-lg bg-red-50 text-[9px] md:text-[10px] font-black text-red-600 uppercase tracking-widest border border-red-100">
             {servingItem ? 'Đang phục vụ' : 'Hàng chờ trống'}
           </span>
           {servingItem && <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
           {current?.startedAt && (
             <span className="text-[9px] md:text-[10px] font-bold text-slate-400 flex items-center gap-1">
               <Clock className="h-3 w-3" /> {current.startedAt}
             </span>
           )}
        </div>
        
        <div className="flex items-baseline gap-4 md:gap-6">
          <div className="bg-gradient-primary bg-clip-text text-6xl md:text-8xl lg:text-9xl font-black leading-none tracking-tighter text-transparent tabular-nums">
            {current?.num || "---"}
          </div>
          <div className="flex flex-col min-w-0">
             <div className="text-xl md:text-3xl font-black text-slate-800 uppercase tracking-tight leading-tight truncate">
               {current?.name || "Hàng chờ trống"}
             </div>
             <div className="text-sm md:text-lg font-bold text-slate-300 mt-1 tabular-nums">
                {current?.phone || "SĐT: ---"}
             </div>
          </div>
        </div>

        <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t border-slate-50 flex items-center gap-4">
          <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest italic truncate">
             {current?.service || "Dịch vụ chuẩn"}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 lg:flex lg:flex-col gap-3 md:gap-4 mt-2 lg:mt-0">
        {/* Hoàn tất */}
        <div className="flex flex-col items-center justify-center">
          <ActionButton
            onClick={onComplete}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            label="XONG"
            sub="Hoàn tất"
            icon={<CheckCircle className="h-6 w-6 md:h-10 md:w-10" />}
            disabled={loading || !servingItem}
          />
        </div>

        {/* Gọi tiếp */}
        <div className="flex flex-col items-center justify-center">
          <ActionButton
            onClick={onNext}
            className="bg-slate-900 text-white hover:bg-primary"
            label="GỌI TIẾP"
            sub="Kế tiếp"
            icon={<ChevronRight className="h-6 w-6 md:h-10 md:w-10" />}
            disabled={loading}
          />
        </div>

        {/* Bỏ qua */}
        <div className="flex flex-col items-center justify-center">
          <ActionButton
            onClick={onSkip}
            className="bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100"
            label="BỎ QUA"
            sub="Vắng mặt"
            icon={<SkipForward className="h-6 w-6 md:h-10 md:w-10" />}
            disabled={loading || !servingItem}
          />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ onClick, className, label, sub, icon, disabled }: any) {
  return (
    <div className="flex flex-col items-center text-center w-full">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`group h-20 w-20 xs:h-24 xs:w-24 md:h-44 md:w-44 grid place-items-center rounded-2xl md:rounded-[2.5rem] shadow-elegant transition-all hover:-translate-y-1 active:scale-95 ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${className}`}
      >
        <div className="flex flex-col items-center gap-1.5 md:gap-4">
          <div className="p-1.5 md:p-4 rounded-xl md:rounded-3xl bg-white/10 group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div className="font-black uppercase tracking-widest text-[9px] md:text-sm">{label}</div>
        </div>
      </button>
      <p className="mt-2 md:mt-4 max-w-[9rem] text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter opacity-60 leading-tight hidden xs:block">{sub}</p>
    </div>
  );
}

function QueueList({ items, search, setSearch, total, onCall, loading }: any) {
  return (
    <div className="bg-white shadow-elegant rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 overflow-hidden">
      <div className="p-5 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-slate-50/30">
        <div className="flex items-center gap-4">
           <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl md:rounded-2xl">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
           </div>
           <div>
             <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-700">Hàng chờ hiện tại</h2>
             <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mt-0.5">Tổng cộng {total} người</p>
           </div>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 md:h-5 md:w-5 -translate-y-1/2 text-slate-300" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="h-10 md:h-12 rounded-xl md:rounded-2xl pl-10 md:pl-12 bg-white border-slate-200 focus:ring-primary shadow-inner text-xs md:text-sm"
          />
        </div>
      </div>

      <div className="p-2 md:p-4">
        {/* Table View (Desktop) */}
        <div className="hidden md:block overflow-x-auto">
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
                     <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                         <Clock className="h-3.5 w-3.5" /> Check-in: {q.time}
                       </div>
                       {q.eta && (
                         <div className="flex items-center gap-2 text-[10px] font-black text-primary">
                           <UserCheck className="h-3.5 w-3.5" /> ETA: {q.eta}
                         </div>
                       )}
                     </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <button className="h-10 px-6 rounded-xl bg-slate-900 text-[10px] font-black text-white hover:bg-primary transition-all uppercase tracking-widest shadow-md">
                      GỌI
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card View (Mobile) */}
        <div className="md:hidden space-y-3 p-1">
          {items.map((q: any) => (
            <div key={q.id} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="text-2xl font-black text-primary tabular-nums shrink-0">{q.num}</div>
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-slate-700 uppercase truncate">{q.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-bold text-slate-400">{q.time}</span>
                    {q.eta && <span className="text-[9px] font-black text-primary italic">ETA: {q.eta}</span>}
                  </div>
                </div>
              </div>
              <button className="h-8 px-4 rounded-lg bg-slate-900 text-[9px] font-black text-white uppercase tracking-widest shrink-0">
                GỌI
              </button>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="py-20 text-center">
            <div className="flex flex-col items-center gap-3 opacity-20">
              <Users className="h-12 w-12" />
              <p className="text-xs font-black uppercase tracking-widest">Không có ai</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryTable({ history, onRecall, loading }: any) {
  return (
    <div className="bg-white shadow-elegant rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 overflow-hidden">
      <div className="p-5 md:p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="p-2.5 md:p-3 bg-slate-900 rounded-xl md:rounded-2xl">
            <History className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-700">Lịch sử hôm nay</h2>
        </div>
        <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tight">Vắng mặt được giữ trong 30 phút</p>
      </div>

      <div className="p-2 md:p-4">
        {/* Table View (Desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                <th className="px-6 py-5">STT</th>
                <th className="px-6 py-5">Khách hàng</th>
                <th className="px-6 py-5">Trạng thái</th>
                <th className="px-6 py-5">Thời gian</th>
                <th className="px-6 py-5 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.map((h: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5 font-black text-slate-800 text-lg tabular-nums">{h.num}</td>
                  <td className="px-6 py-5 uppercase font-bold text-sm text-slate-700">{h.name}</td>
                  <td className="px-6 py-5">
                     {h.status === 'served' ? (
                       <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[9px] font-black text-emerald-600 uppercase">Đã hoàn tất</span>
                     ) : h.status === 'skipped' ? (
                       <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-[9px] font-black text-amber-600 uppercase">Vắng mặt (đang chờ)</span>
                     ) : (
                       <span className="px-2.5 py-1 rounded-lg bg-red-50 text-[9px] font-black text-red-600 uppercase">Đã hủy</span>
                     )}
                  </td>
                  <td className="px-6 py-5 text-[10px] font-black text-slate-400 tabular-nums">{h.completedAt}</td>
                  <td className="px-6 py-5 text-right">
                    {h.status === 'skipped' && (
                      <button
                        onClick={() => onRecall(h.id)}
                        disabled={loading}
                        className="h-9 px-4 rounded-xl bg-primary text-[9px] font-black text-white hover:bg-primary/90 transition-all uppercase tracking-widest shadow-md disabled:opacity-50"
                      >
                        GỌI LẠI
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card View (Mobile) */}
        <div className="md:hidden space-y-3 p-1">
          {history.map((h: any, i: number) => (
            <div key={i} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-slate-800 tabular-nums">{h.num}</span>
                  <span className="text-[10px] font-bold text-slate-700 uppercase truncate">{h.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {h.status === 'served' ? (
                    <span className="text-[8px] font-black text-emerald-600 uppercase">Xong</span>
                  ) : h.status === 'skipped' ? (
                    <span className="text-[8px] font-black text-amber-600 uppercase">Vắng</span>
                  ) : (
                    <span className="text-[8px] font-black text-red-600 uppercase">Hủy</span>
                  )}
                  <span className="text-[8px] font-bold text-slate-400">{h.completedAt}</span>
                </div>
              </div>
              {h.status === 'skipped' && (
                <button
                  onClick={() => onRecall(h.id)}
                  disabled={loading}
                  className="h-8 px-4 rounded-lg bg-primary text-[9px] font-black text-white uppercase tracking-widest shrink-0 shadow-sm"
                >
                  GỌI LẠI
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
