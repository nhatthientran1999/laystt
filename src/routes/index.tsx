import { useNavigate, createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/qms/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Clock, Calendar, UserCheck, Users, ShieldCheck, Hourglass, Search, Key, X } from "lucide-react";
import { getQueue, findTicketByPhone } from "@/lib/server-functions";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "App xếp hàng — Smart Queue" },
      { name: "description", content: "ANCS Dương Sơn Thân Tặng App" },
    ],
  }),
  loader: () => getQueue(),
  component: QueueDisplayPage,
});

// Helper: Mask Phone Number
const maskPhone = (p: string) => {
  if (!p) return "";
  const cleaned = p.replace(/\s/g, "");
  return cleaned.slice(0, 4) + "****" + cleaned.slice(-3);
};

// Helper: Format time from Date
const formatTime = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

function QueueDisplayPage() {
  const navigate = useNavigate();
  const rawQueue = useLoaderData({ from: "/" }) as any[];
  const [queueData, setQueueData] = useState(rawQueue);
  const [now, setNow] = useState(new Date());
  const [searchPhone, setSearchPhone] = useState("");
  const [foundTicket, setFoundTicket] = useState<any>(null);
  const [foundPos, setFoundPos] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const handleAdminAccess = (e: React.MouseEvent) => {
    e.preventDefault();
    const pw = prompt("Nhập mật khẩu quản trị:");
    if (pw === "cax123") {
      navigate({ to: "/quay" });
    } else if (pw !== null) {
      alert("Sai mật khẩu!");
    }
  };

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Supabase Realtime: Lắng nghe thay đổi dữ liệu để cập nhật UI ngay lập tức
  useEffect(() => {
    const channel = supabase
      .channel('public:queues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queues' }, async () => {
        const updatedData = await getQueue();
        setQueueData(updatedData as any[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const time = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  const handleSearch = async () => {
    if (!searchPhone) return;
    setIsSearching(true);
    try {
      const ticket = await findTicketByPhone({ data: searchPhone });
      if (ticket) {
        setFoundTicket(ticket);
        // Lọc danh sách: 
        // 1. Loại bỏ người đang phục vụ (đã hiển thị ở serving bar)
        // 2. Chỉ lấy người trạng thái 'waiting' (checked_in)
        const waitingList = queueData.filter((i: any) => i.status === 'waiting');
        const pos = waitingList.findIndex((i: any) => i.id === ticket.id);
        setFoundPos(pos !== -1 ? pos : 0);
      } else {
        alert("Không tìm thấy thông tin số thứ tự cho số điện thoại này.");
      }
    } catch (err) {
      alert("Lỗi khi tra cứu: " + (err as Error).message);
    } finally {
      setIsSearching(false);
    }
  };

  // Dùng ETA từ DB (đã được server tính sau mỗi thay đổi trạng thái)
  const processedQueue = (queueData || []).map((item: any) => {
    // Fallback nếu DB chưa có ETA: dùng checkin_time + 15p
    const etaDate = item.eta
      ? new Date(item.eta)
      : new Date(new Date(item.checkin_time || item.created_at).getTime() + 15 * 60000);

    return {
      ...item,
      name: item.customer_name,
      num: item.display_number,
      phone: item.phone_number,
      service: item.service_type,
      maskedPhone: maskPhone(item.phone_number),
      estimatedTime: formatTime(etaDate),
    };
  });

  return (
    <div className="min-h-screen lg:h-[100dvh] overflow-x-hidden lg:overflow-hidden w-full bg-[#f1f5f9] text-slate-900 flex flex-col font-sans selection:bg-primary/20">
      {/* Background Decorative Elements */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />

      {/* Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-3 md:px-10 py-2.5 md:py-4 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-2.5 md:gap-6">
          <Logo size={28} className="w-[28px] md:w-[45px]" />
          <div className="flex flex-col">
            <h1 className="text-[11px] md:text-lg font-black tracking-tight uppercase text-primary leading-none">App xếp hàng</h1>
            <p className="text-[6px] md:text-[8px] font-bold text-slate-400 tracking-[0.3em] uppercase mt-0.5">Smart Queue</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 md:gap-4">
          <div className="hidden lg:flex flex-col items-end mr-4">
            <div className="text-2xl font-black tabular-nums text-slate-800 leading-none">{time.slice(0, 5)}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{date}</div>
          </div>
          
          <Button asChild className="rounded-lg md:rounded-xl h-8 md:h-11 px-3 md:px-6 text-[11px] md:text-sm font-black bg-gradient-primary shadow-soft text-white">
            <Link to="/lay-so">Lấy số ngay</Link>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 md:h-11 md:w-11 rounded-lg md:rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5"
            onClick={handleAdminAccess}
          >
            <Key className="h-3.5 w-3.5 md:h-5 md:w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-2.5 md:p-6 lg:pb-3 relative z-10 flex flex-col min-h-0 gap-2.5 md:gap-5">
        {/* Compact Serving Section */}
        <div className="w-full shrink-0">
           {processedQueue.length > 0 ? (
             <CompactServingBar data={processedQueue.find((i: any) => i.status === 'serving') || processedQueue[0]} />
           ) : (
             <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-xl p-3 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
               Hiện không có khách hàng đang phục vụ
             </div>
           )}
        </div>

        <div className="flex-1 w-full flex flex-col lg:flex-row gap-2.5 md:gap-5 min-h-0">
          {/* Left: Mời chuẩn bị */}
          <div className="flex-1 lg:flex-[2] p-3.5 md:p-8 border-4 md:border-[8px] border-red-600 rounded-xl md:rounded-[3rem] bg-white flex flex-col min-h-0 relative shadow-[0_20px_60px_-15px_rgba(220,38,38,0.15)] overflow-hidden">
              <div className="shrink-0 mb-2.5 md:mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="h-7 w-7 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-red-600 flex items-center justify-center shadow-md shadow-red-200">
                     <UserCheck className="h-3.5 w-3.5 md:h-5 md:w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[11px] md:text-base font-black text-slate-800 uppercase tracking-tight">Mời chuẩn bị</h3>
                    <p className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Tiếp theo</p>
                  </div>
                </div>
                <div className="px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-red-50 text-red-600 text-[7px] md:text-[10px] font-black uppercase tracking-widest border border-red-100">
                  Sắp đến lượt
                </div>
              </div>

              <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                  {processedQueue.length > 1 ? (
                    <HeroCard data={processedQueue[1]} />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 py-10">
                      <Users className="h-8 w-8 md:h-16 md:w-16 mb-3 opacity-20" />
                      <span className="font-black uppercase tracking-[0.2em] text-[9px] md:text-xs">Chưa có số tiếp theo</span>
                    </div>
                  )}
              </div>
          </div>

          {/* Right: Waiting List */}
          <div className="flex-1 lg:flex-[1] flex flex-col bg-slate-50/40 border-4 md:border-[8px] border-blue-600 rounded-xl md:rounded-[3rem] overflow-hidden shadow-md shadow-blue-600/10 min-h-0">
            <div className="px-3 py-2.5 md:p-6 border-b border-blue-100 flex items-center justify-between bg-white/80 backdrop-blur-sm shrink-0">
              <h3 className="text-[12px] md:text-lg font-black uppercase tracking-[0.15em] text-slate-800 flex items-center gap-2 md:gap-4">
                <div className="h-5 w-5 md:h-8 md:w-8 rounded-md md:rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="h-2.5 w-2.5 md:h-4 md:w-4" />
                </div>
                Hàng chờ
              </h3>
              <span className="px-2.5 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-blue-600 text-[8px] md:text-[11px] font-black text-white uppercase shadow-md shadow-blue-600/20">
                {processedQueue.length > 2 ? processedQueue.length - 2 : 0} người
              </span>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 md:p-6 space-y-2 md:space-y-4">
              {processedQueue.slice(2).map((it) => (
                <div key={it.num} className="p-3 md:p-6 rounded-xl md:rounded-3xl bg-white border-2 border-blue-200 flex items-center justify-between transition-all hover:border-blue-600 group shadow-sm">
                  <div className="flex flex-col gap-0.5 md:gap-2">
                    <div className="text-sm md:text-xl font-black text-slate-800 leading-none group-hover:text-blue-600 transition-colors uppercase tracking-tight">{it.name}</div>
                    <div className="flex items-center gap-1.5 md:gap-3 mt-0.5">
                      <div className="text-xs md:text-lg font-black text-slate-900 tabular-nums tracking-widest">{it.maskedPhone}</div>
                      <div className="h-1 w-1 rounded-full bg-slate-200" />
                      <div className="text-[10px] md:text-sm font-black text-blue-600 flex items-center gap-1 bg-blue-50 px-1.5 md:px-3 py-0.5 md:py-1 rounded-full">
                         <Hourglass className="h-2.5 w-2.5 md:h-4 md:w-4" /> {it.estimatedTime}
                      </div>
                    </div>
                  </div>
                  <div className="text-lg md:text-3xl font-black text-white bg-blue-600 shadow-md shadow-blue-600/30 px-3 py-1.5 md:px-5 md:py-3 rounded-lg md:rounded-xl tabular-nums tracking-tighter group-hover:scale-105 transition-transform shrink-0 ml-2">{it.num}</div>
                </div>
              ))}
              
              {processedQueue.length <= 2 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-8">
                  <Clock className="h-8 w-8 mb-3 opacity-10" />
                  <p className="font-black uppercase tracking-widest text-[10px]">Trống</p>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="p-2.5 md:p-5 bg-blue-50/50 border-t-2 border-blue-200 shrink-0">
              <div className="flex items-center bg-white rounded-lg md:rounded-xl border-2 md:border-[3px] border-blue-500 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
                <div className="pl-2.5 text-blue-500">
                  <Search className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </div>
                <Input 
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Tra cứu số thứ tự bằng SĐT..." 
                  className="h-9 md:h-12 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[11px] md:text-sm shadow-none px-2"
                />
                <div className="pr-1.5">
                  <Button 
                    onClick={handleSearch}
                    disabled={isSearching || !searchPhone}
                    className="h-7 md:h-10 px-3 md:px-4 rounded-md md:rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] md:text-xs font-bold text-white transition-colors"
                  >
                    {isSearching ? "..." : "TÌM"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Marquee */}
      <footer className="relative z-10 bg-[#f1f5f9] py-4 md:py-5 border-t border-slate-200/50">
        <div className="flex items-center gap-4 md:gap-12">
          <div className="pl-4 md:pl-12 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-primary whitespace-nowrap bg-[#f1f5f9] relative z-20">Thông báo</div>
          <div className="relative flex-1 overflow-hidden">
            <div className="animate-marquee whitespace-nowrap text-sm md:text-lg font-bold text-slate-400 tracking-tight">
              Chào mừng Quý khách đến với QMS Smart Queue · Theo dõi màn hình để biết lượt phục vụ · Chúc Quý khách một ngày tốt lành ·
            </div>
          </div>
          <div className="hidden md:block pr-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 whitespace-nowrap bg-[#f1f5f9] relative z-20">
            ANCS Dương Sơn Thân Tặng App
          </div>
        </div>
      </footer>

      {/* Ticket Info Modal */}
      {foundTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-primary p-8 text-white relative">
              <button 
                onClick={() => setFoundTicket(null)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Thông tin tra cứu</div>
              <h2 className="text-2xl font-black mt-1">LỊCH HẸN CỦA BẠN</h2>
            </div>
            <div className="p-8 text-center">
              {/* Estimated Time Section - HIGHLIGHTED */}
              <div className="mb-8">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Giờ phục vụ dự kiến</div>
                <div className="text-7xl font-black text-primary tracking-tighter">
                  {(() => {
                    const matched = queue.find(q => q.id === foundTicket.id);
                    return matched ? matched.estimatedTime : formatTime(new Date(foundTicket.created_at));
                  })()}
                </div>
                <div className="mt-2 text-[11px] font-bold text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full">
                  Vị trí thứ {foundPos + 1} trong hàng chờ
                </div>
              </div>

              <div className="bg-slate-50 rounded-3xl p-6 mb-6 border border-slate-100 flex flex-col items-center">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số thứ tự</div>
                <div className="text-5xl font-black text-slate-800">
                  {foundTicket.display_number}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                  <Clock className="h-3 w-3" /> In lúc {new Date(foundTicket.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              <div className="space-y-3 text-left bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Họ và tên</span>
                  <span className="text-xs font-bold text-slate-700 uppercase">{foundTicket.customer_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Vị trí</span>
                  <span className="text-xs font-bold text-slate-700">Đang chờ {foundPos} người nữa</span>
                </div>
              </div>

              <Button 
                onClick={() => setFoundTicket(null)}
                className="w-full mt-8 h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs tracking-widest uppercase shadow-lg shadow-slate-200"
              >
                ĐÃ HIỂU
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { display: inline-block; animation: marquee 35s linear infinite; }
      `}</style>
    </div>

  );
}

function CompactServingBar({ data }: { data: any }) {
  return (
    <div className="bg-white border-2 md:border-4 border-green-600 rounded-xl md:rounded-2xl p-2.5 md:px-8 md:py-5 flex items-center justify-between gap-2 md:gap-8 overflow-hidden relative group">
      <div className="absolute top-0 left-0 w-1 md:w-1.5 h-full bg-green-600" />
      <div className="flex items-center gap-3 md:gap-8 flex-1 pl-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 md:gap-3">
             <div className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
             <span className="text-[8px] md:text-xs font-black text-green-600 uppercase tracking-[0.15em] md:tracking-[0.3em]">Đang phục vụ</span>
          </div>
          <h2 className="text-base md:text-3xl font-black text-slate-900 uppercase tracking-tight mt-0.5 leading-none">
            {data.name}
          </h2>
        </div>
        
        <div className="h-6 w-[1px] bg-slate-100 hidden md:block mx-auto" />
        
        <div className="flex flex-col ml-auto text-right">
          <span className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">SĐT</span>
          <div className="text-sm md:text-2xl font-black text-slate-600 tabular-nums leading-none">
            {data.maskedPhone}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroCard({ data }: { data: any }) {
  return (
    <div className="w-full bg-transparent relative flex flex-col items-center text-center">
      {/* Decorative Blob */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-red-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center w-full gap-2 lg:gap-2 xl:gap-3">
        {/* Name */}
        <h2 className="text-3xl md:text-6xl lg:text-[clamp(2rem,4vw,4rem)] xl:text-[clamp(2.5rem,5vw,5rem)] leading-none font-black tracking-tighter text-slate-900 uppercase break-words w-full">
          {data.name}
        </h2>

        {/* Info Row - stack vertically on small mobile, row on md+ */}
        <div className="flex flex-row items-center justify-center gap-2 md:gap-8 lg:gap-6 w-full">
           <div className="flex flex-col items-center">
             <span className="text-[7px] md:text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">SĐT</span>
             <div className="text-xl md:text-4xl lg:text-[clamp(1.25rem,2.5vw,2.5rem)] font-black text-slate-900 tracking-tight tabular-nums">
                {data.maskedPhone}
             </div>
           </div>

           <div className="h-8 w-[1px] bg-slate-100" />

           <div className="flex flex-col items-center">
             <span className="text-[7px] md:text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Dự kiến</span>
             <div className="px-2.5 py-1 md:px-5 md:py-2 lg:px-3 lg:py-1.5 rounded-lg md:rounded-xl bg-red-50 border border-red-100 text-red-600 text-lg md:text-3xl lg:text-[clamp(1rem,2vw,2rem)] font-black tabular-nums flex items-center gap-1.5 shadow-sm">
                <Clock className="h-4 w-4 md:h-6 md:w-6 lg:h-[1em] lg:w-[1em]" /> {data.estimatedTime}
             </div>
           </div>
        </div>

        {/* Ticket - THE BIG NUMBER */}
        <div className="relative w-full flex justify-center">
          <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 pointer-events-none" />
          <div className="relative flex items-center justify-center px-4 py-2.5 md:px-12 md:py-6 lg:px-8 lg:py-4 xl:px-12 xl:py-5 rounded-xl md:rounded-[2.5rem] lg:rounded-[1.5rem] bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_15px_40px_-10px_rgba(220,38,38,0.5)] border-2 border-red-400/30 w-full">
            <span className="text-5xl md:text-[7rem] lg:text-[clamp(3rem,8vw,7rem)] font-black leading-none tabular-nums tracking-tighter drop-shadow-md">{data.num}</span>
          </div>
        </div>

        {/* Service */}
        <div className="pt-1.5 border-t border-slate-100 w-full">
          <div className="text-[7px] md:text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-0.5">Loại dịch vụ</div>
          <div className="text-sm md:text-xl lg:text-[clamp(0.8rem,1.5vw,1.25rem)] font-black text-slate-400 italic tracking-tight">
            {data.service || "DỊCH VỤ CÔNG CHUẨN"}
          </div>
        </div>
      </div>
    </div>
  );
}
