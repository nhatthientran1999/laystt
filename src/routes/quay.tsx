import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Clock, Headphones,
  History, Home, LogOut, Menu, Phone, RotateCw, Search, Settings, SkipForward, User, UserCircle2, Users,
} from "lucide-react";
import { Logo } from "@/components/qms/Logo";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/quay")({
  head: () => ({
    meta: [
      { title: "Bảng điều khiển nhân viên — QMS" },
      { name: "description", content: "Bảng điều khiển quầy phục vụ cho nhân viên." },
    ],
  }),
  component: QuayPage,
});

const initialQueue = [
  { num: "102", name: "Nguyễn Thị Lan", phone: "0905123456", time: "09:15:24", service: "Thủ tục cấp Căn cước" },
  { num: "103", name: "Lê Văn Hùng", phone: "0912456789", time: "09:16:02", service: "Thủ tục cấp định danh điện tử mức độ 2" },
  { num: "104", name: "Phạm Minh Tuấn", phone: "0938789012", time: "09:17:11", service: "Thủ tục cấp Căn cước" },
  { num: "105", name: "Trần Thị Mai", phone: "0707321654", time: "09:17:45", service: "Thủ tục cấp định danh điện tử mức độ 2" },
  { num: "106", name: "Hoàng Quốc Bảo", phone: "0789654321", time: "09:18:30", service: "Thủ tục cấp Căn cước" },
];

function QuayPage() {
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, history
  const [current, setCurrent] = useState<any>({ num: "101", name: "Trần Văn An", phone: "0909000111", service: "Thủ tục cấp Căn cước" });
  const [queue, setQueue] = useState(initialQueue);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const callNext = () => {
    if (queue.length === 0) return;
    const next = queue[0];
    
    // Add current to history as served before moving to next
    if (current) {
      setHistory([{ ...current, status: "served", completedAt: new Date().toLocaleTimeString() }, ...history]);
    }

    setCurrent(next);
    setQueue(queue.slice(1));
  };

  const skipCurrent = () => {
    if (!current) return;
    setHistory([{ ...current, status: "skipped", completedAt: new Date().toLocaleTimeString() }, ...history]);
    
    if (queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(queue.slice(1));
    } else {
      setCurrent(null);
    }
  };

  const recallTicket = (ticket: any) => {
    // If recalling from history, we can either set as current or add back to queue
    // For this UI, let's just set it as the current active serving
    setCurrent({ ...ticket });
  };

  const filteredQueue = queue.filter(
    (q) => q.num.includes(search) || q.name.toLowerCase().includes(search.toLowerCase()) || q.phone.includes(search),
  );

  return (
    <div className="flex min-h-screen bg-secondary/40">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-x-hidden pb-10">
        <TopBar />
        <div className="space-y-6 p-6">
          {activeTab === "dashboard" ? (
            <>
              <ServingCard current={current} onNext={callNext} onSkip={skipCurrent} />
              <QueueList items={filteredQueue} search={search} setSearch={setSearch} total={queue.length} />
            </>
          ) : (
            <HistoryView history={history} onRecall={recallTicket} />
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
    <aside className="bg-sidebar text-sidebar-foreground hidden w-64 flex-shrink-0 flex-col p-5 md:flex">
      <Link to="/" className="mb-10">
        <Logo />
      </Link>
      <nav className="flex-1 space-y-1.5">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setActiveTab(it.id)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === it.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                : "hover:bg-sidebar-border/40"
            }`}
          >
            <it.icon className="h-5 w-5" />
            {it.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function TopBar() {
  return (
    <div className="bg-background flex h-16 items-center gap-4 border-b border-border px-6">
      <button className="rounded-md p-1.5 hover:bg-accent md:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-soft">
        <span className="h-2 w-2 rounded-full bg-primary" />
        Trạng thái: <span className="font-bold text-success">Đang hoạt động</span>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <span className="hidden items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success md:inline-flex">
          ● Hệ thống hoạt động
        </span>
        <button className="relative rounded-full p-2 hover:bg-accent">
          <Bell className="h-5 w-5" />
          <span className="bg-destructive text-destructive-foreground absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold">
            3
          </span>
        </button>
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-primary text-primary-foreground grid h-9 w-9 place-items-center rounded-full">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <div className="hidden text-sm leading-tight md:block">
            <div className="font-bold text-slate-800">Công an xã Hoà Tiến</div>
            <div className="text-[10px] font-black uppercase text-primary tracking-widest">Nhân viên điều phối</div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function ServingCard({ current, onNext, onSkip }: { current: any; onNext: () => void; onSkip: () => void }) {
  return (
    <div className="bg-card shadow-soft grid grid-cols-1 gap-6 rounded-2xl border border-border p-8 lg:grid-cols-[1fr_auto_auto_auto]">
      <div className="flex flex-col justify-center">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-primary/70">Đang phục vụ</div>
        <div className="flex items-baseline gap-4 mt-2">
          <div className="bg-gradient-primary bg-clip-text text-8xl font-black leading-none tracking-tighter text-transparent md:text-9xl">
            {current?.num || "---"}
          </div>
          <div className="flex flex-col">
             <div className="text-2xl font-black text-slate-800 uppercase tracking-tight">{current?.name || "Hết lượt chờ"}</div>
             <div className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                <Phone className="h-3 w-3" /> {current?.phone || "---"}
             </div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-accent text-[10px] font-black text-primary uppercase tracking-widest border border-primary/5">
             {current?.service || "Chưa xác định"}
          </span>
          <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thời gian thực</span>
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-2">
        <ActionButton
          onClick={onNext}
          className="bg-gradient-primary text-white"
          label="GỌI SỐ TIẾP THEO"
          sub="Tự động gọi số ưu tiên"
          icon={<ChevronRight className="h-8 w-8" />}
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <ActionButton
          className="bg-white border-2 border-slate-100 text-slate-600 hover:border-primary/20 hover:text-primary"
          label="GỌI LẠI"
          sub="Gọi lại số này lần nữa"
          icon={<RotateCw className="h-7 w-7" />}
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <ActionButton
          onClick={onSkip}
          className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
          label="BỎ QUA"
          sub="Chuyển vào lịch sử bỏ qua"
          icon={<SkipForward className="h-7 w-7" />}
        />
      </div>
    </div>
  );
}

function ActionButton({
  onClick, className, label, sub, icon,
}: { onClick?: () => void; className: string; label: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <button
        onClick={onClick}
        className={`shadow-soft group h-32 w-32 md:h-40 md:w-40 grid place-items-center rounded-[2rem] text-sm md:text-base font-black transition-all hover:-translate-y-1 active:scale-95 ${className}`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white/20 p-3 rounded-2xl group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div className="px-2 leading-tight uppercase tracking-widest text-[10px] md:text-xs">{label}</div>
        </div>
      </button>
      <p className="mt-3 max-w-[8rem] text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter opacity-60 leading-tight">{sub}</p>
    </div>
  );
}

function QueueList({
  items, search, setSearch, total,
}: { items: any[]; search: string; setSearch: (s: string) => void; total: number }) {
  return (
    <div className="bg-card shadow-soft rounded-3xl border border-border overflow-hidden">
      <div className="p-6 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4 bg-slate-50/30">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-primary/10 rounded-xl">
              <Users className="h-5 w-5 text-primary" />
           </div>
           <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-600">Danh sách chờ phục vụ</h2>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo số, tên khách hoặc số điện thoại..."
            className="h-11 rounded-2xl pl-11 bg-white border-slate-200 focus:ring-primary/20 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50">
              <th className="px-6 py-4">STT</th>
              <th className="px-6 py-4">Khách hàng</th>
              <th className="px-6 py-4">Liên hệ</th>
              <th className="px-6 py-4">Dịch vụ</th>
              <th className="px-6 py-4">Thời gian</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((q) => (
              <tr key={q.num} className="hover:bg-primary/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <span className="text-xl font-black text-slate-300 tabular-nums group-hover:text-primary transition-colors">
                    {q.num}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-black text-slate-800">{q.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-bold text-slate-500 tabular-nums">{q.phone}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    {q.service}
                  </span>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <Clock className="h-3 w-3" /> {q.time}
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-[10px] font-black text-slate-600 hover:bg-primary hover:text-white transition-all uppercase tracking-widest shadow-sm">
                    GỌI <ChevronRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                     <Users className="h-10 w-10" />
                     <p className="text-xs font-black uppercase tracking-widest">Trống danh sách</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng cộng: {total} người đang chờ</div>
         <div className="flex gap-2">
            <Pager active>1</Pager>
            <Pager>2</Pager>
         </div>
      </div>
    </div>
  );
}

function HistoryView({ history, onRecall }: { history: any[]; onRecall: (ticket: any) => void }) {
  const [filter, setFilter] = useState("all"); // all, served, skipped

  const filteredHistory = history.filter(h => filter === "all" || h.status === filter);

  return (
    <div className="bg-card shadow-soft rounded-3xl border border-border overflow-hidden">
      <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-slate-800 rounded-xl">
              <History className="h-5 w-5 text-white" />
           </div>
           <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-600">Lịch sử phục vụ</h2>
        </div>
        <div className="flex p-1 bg-white border border-slate-100 rounded-2xl shadow-sm">
           <TabButton active={filter === "all"} onClick={() => setFilter("all")}>Tất cả</TabButton>
           <TabButton active={filter === "served"} onClick={() => setFilter("served")}>Đã xong</TabButton>
           <TabButton active={filter === "skipped"} onClick={() => setFilter("skipped")}>Bỏ qua</TabButton>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50">
              <th className="px-6 py-4">Số</th>
              <th className="px-6 py-4">Khách hàng</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4">Hoàn thành</th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredHistory.map((h, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-black text-slate-800">{h.num}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-slate-700">{h.name}</div>
                  <div className="text-[10px] font-medium text-slate-400">{h.phone}</div>
                </td>
                <td className="px-6 py-4">
                  {h.status === "served" ? (
                    <span className="px-2 py-1 rounded-lg bg-success/10 text-[9px] font-black text-success uppercase">Hoàn thành</span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-destructive/10 text-[9px] font-black text-destructive uppercase">Bỏ qua</span>
                  )}
                </td>
                <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tabular-nums">
                   {h.completedAt}
                </td>
                <td className="px-6 py-4 text-right">
                   <button 
                    onClick={() => onRecall(h)}
                    className="p-2 rounded-xl border border-slate-100 hover:border-primary/30 hover:text-primary transition-all shadow-sm"
                   >
                      <RotateCw className="h-4 w-4" />
                   </button>
                </td>
              </tr>
            ))}
            {filteredHistory.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center opacity-30 text-xs font-black uppercase tracking-widest">
                  Chưa có dữ liệu lịch sử
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {children}
    </button>
  );
}

function Pager({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm font-medium ${
        active ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
