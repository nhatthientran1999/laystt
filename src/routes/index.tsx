import { useNavigate, createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/qms/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Clock, Calendar, UserCheck, Users, ShieldCheck, Hourglass, Search, Key, X } from "lucide-react";
import { getQueue, findTicketByPhone } from "@/lib/server-functions";

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

  const time = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  const handleSearch = async () => {
    if (!searchPhone) return;
    setIsSearching(true);
    try {
      const ticket = await findTicketByPhone({ data: searchPhone });
      if (ticket) {
        setFoundTicket(ticket);
        // Tính toán vị trí trong hàng chờ hiện tại
        const queueData = await getQueue();
        const waitingList = (queueData as any[]).filter(i => i.status === 'waiting');
        const pos = waitingList.findIndex(i => i.id === ticket.id);
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

  // Thuật toán tịnh tiến thông minh: Est[i] = max(CreatedAt[i], Est[i-1] + 15p)
  let lastEst = new Date(0);
  const queue = (rawQueue || []).map((item) => {
    const createdAt = new Date(item.created_at);
    // Thời gian dự kiến là max của (giờ lấy phiếu) và (giờ người trước + 15p)
    const currentEst = new Date(Math.max(createdAt.getTime(), lastEst.getTime() + 15 * 60000));
    lastEst = currentEst;

    return {
      ...item,
      name: item.customer_name,
      num: item.display_number,
      phone: item.phone_number,
      service: item.service_type,
      maskedPhone: maskPhone(item.phone_number),
      estimatedTime: formatTime(currentEst),
    };
  });

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] bg-[#f1f5f9] text-slate-900 flex flex-col font-sans selection:bg-primary/20 overflow-x-hidden lg:overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />

      {/* Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 md:px-10 py-3 md:py-4 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3 md:gap-6">
          <Logo size={35} className="w-[30px] md:w-[45px]" />
          <div className="flex flex-col">
            <h1 className="text-xs md:text-lg font-black tracking-tight uppercase text-primary leading-none">App xếp hàng</h1>
            <p className="text-[6px] md:text-[8px] font-bold text-slate-400 tracking-[0.4em] uppercase mt-1">Smart Queue</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden lg:flex flex-col items-end mr-4">
            <div className="text-2xl font-black tabular-nums text-slate-800 leading-none">{time.slice(0, 5)}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{date}</div>
          </div>
          
          <Button asChild className="rounded-lg md:rounded-xl h-9 md:h-11 px-4 md:px-6 text-xs md:text-sm font-black bg-gradient-primary shadow-soft text-white">
            <Link to="/lay-so">Lấy số ngay</Link>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 md:h-11 md:w-11 rounded-lg md:rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5"
            onClick={handleAdminAccess}
          >
            <Key className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </header>

      {/* Unified Dashboard Frame */}
      <main className="flex-1 p-2 md:p-6 relative z-10 flex flex-col gap-3 md:gap-5 lg:min-h-0 lg:overflow-hidden">
        {/* Compact Serving Section */}
        <div className="w-full shrink-0">
           {queue.length > 0 ? (
             <CompactServingBar data={queue[0]} />
           ) : (
             <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
               Hiện không có khách hàng đang phục vụ
             </div>
           )}
        </div>

        <div className="flex-1 w-full flex flex-col lg:flex-row gap-3 md:gap-5 lg:min-h-0">
          {/* Left: Primary Hero Section */}
          <div className="w-full lg:w-2/3 p-4 md:p-8 border-4 md:border-[8px] border-red-600 rounded-2xl md:rounded-[3rem] bg-white overflow-hidden flex flex-col min-h-[350px] lg:min-h-0 relative shadow-[0_40px_100px_-20px_rgba(220,38,38,0.15)] shrink-0 lg:shrink">
              <div className="mb-4 md:mb-8 flex items-center justify-between relative z-20">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-200">
                     <UserCheck className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs md:text-base font-black text-slate-800 uppercase tracking-tight">Mời chuẩn bị</h3>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Tiếp theo</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-red-100">
                  Sắp đến lượt
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center py-4 md:py-0 relative z-20">
                {queue.length > 1 ? (
                  <HeroCard 
                    data={queue[1]} 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full border-2 border-dashed border-slate-50 rounded-[2rem] md:rounded-[2.5rem] text-slate-300 py-10">
                    <Users className="h-12 w-12 md:h-16 md:w-16 mb-4 opacity-20" />
                    <span className="font-black uppercase tracking-[0.2em] text-[10px] md:text-xs">Chưa có số tiếp theo</span>
                  </div>
                )}
              </div>
          </div>

          {/* Right: Expanded Sidebar Waiting List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-slate-50/40 border-4 md:border-[8px] border-blue-600 rounded-2xl md:rounded-[3rem] overflow-hidden shadow-lg shadow-blue-600/10 min-h-[400px] lg:min-h-0 shrink-0 lg:shrink">
            <div className="p-4 md:p-6 border-b border-blue-100 flex items-center justify-between bg-white/80 backdrop-blur-sm shrink-0">
              <h3 className="text-sm md:text-lg font-black uppercase tracking-[0.15em] text-slate-800 flex items-center gap-3 md:gap-4">
                <div className="h-6 w-6 md:h-8 md:w-8 rounded-md md:rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="h-3 w-3 md:h-4 md:w-4" />
                </div>
                Hàng chờ
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-blue-600 text-[9px] md:text-[11px] font-black text-white uppercase shadow-lg shadow-blue-600/20">
                  {queue.length > 2 ? queue.length - 2 : 0} người
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 max-h-[500px] lg:max-h-none">
              {queue.slice(2).map((it) => (
                <div key={it.num} className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white border-2 border-blue-200 flex items-center justify-between transition-all hover:border-blue-600 hover:shadow-elegant group shadow-sm">
                  <div className="flex flex-col gap-1 md:gap-2">
                    <div className="text-lg md:text-xl font-black text-slate-800 leading-none group-hover:text-blue-600 transition-colors uppercase tracking-tight">{it.name}</div>
                    <div className="flex items-center gap-2 md:gap-3 mt-1">
                      <div className="text-sm md:text-lg font-black text-slate-900 tabular-nums tracking-widest">{it.maskedPhone}</div>
                      <div className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-slate-200" />
                      <div className="text-xs md:text-sm font-black text-blue-600 flex items-center gap-1.5 bg-blue-50 px-2 md:px-3 py-1 rounded-full">
                         <Hourglass className="h-3 w-3 md:h-4 md:w-4" /> {it.estimatedTime}
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-white bg-blue-600 shadow-md shadow-blue-600/30 px-4 py-2 md:px-5 md:py-3 rounded-xl tabular-nums tracking-tighter group-hover:scale-105 transition-transform">{it.num}</div>
                </div>
              ))}
              
              {queue.length <= 2 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                  <Clock className="h-10 w-10 mb-4 opacity-10" />
                  <p className="font-black uppercase tracking-widest text-xs">Trống</p>
                </div>
              )}
            </div>

            {/* Search Form minimal at the bottom */}
            <div className="p-3 md:p-5 bg-white/80 border-t border-blue-100 backdrop-blur-sm shrink-0">
              <div className="relative group flex items-center bg-white rounded-xl border-2 border-slate-100 overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <div className="pl-3 text-slate-400 group-focus-within:text-blue-600">
                  <Search className="h-4 w-4" />
                </div>
                <Input 
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Tra cứu số thứ tự bằng SĐT..." 
                  className="h-10 md:h-12 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs md:text-sm shadow-none"
                />
                <div className="pr-1">
                  <Button 
                    onClick={handleSearch}
                    disabled={isSearching || !searchPhone}
                    className="h-8 md:h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] md:text-xs font-bold text-white transition-colors"
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
    <div className="bg-white border-2 md:border-4 border-green-600 rounded-xl md:rounded-2xl shadow-soft p-4 md:px-8 md:py-5 flex items-center justify-between gap-3 md:gap-8 overflow-hidden relative group">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-green-600" />
      <div className="flex items-center gap-4 md:gap-8 flex-1 w-full">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 md:gap-3">
             <div className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
             <span className="text-[9px] md:text-xs font-black text-green-600 uppercase tracking-[0.2em] md:tracking-[0.3em]">Đang phục vụ</span>
          </div>
          <h2 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tight mt-0.5 leading-none">
            {data.name}
          </h2>
        </div>
        
        <div className="h-8 w-[1px] bg-slate-100 hidden md:block mx-auto" />
        
        <div className="flex flex-col ml-auto text-right">
          <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Số điện thoại</span>
          <div className="text-lg md:text-2xl font-black text-slate-600 tabular-nums leading-none">
            {data.maskedPhone}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroCard({ data }: { data: any }) {
  return (
    <div className="w-full max-w-4xl bg-transparent relative flex flex-col items-center text-center transition-all transform hover:scale-[1.01] p-2 md:p-6">
      <div className="hidden absolute top-0 left-1/2 -translate-x-1/2 px-6 md:px-10 py-2 md:py-3 rounded-b-2xl md:rounded-b-[2rem] bg-red-600 text-[10px] md:text-base font-black text-white uppercase tracking-[0.3em] md:tracking-[0.4em] shadow-xl whitespace-nowrap">
        TIẾP THEO
      </div>

      {/* Decorative Blob */}
      <div className="absolute -top-24 -right-24 w-48 h-48 md:w-64 md:h-64 bg-red-50 rounded-full blur-3xl opacity-60" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 md:w-64 md:h-64 bg-red-50 rounded-full blur-3xl opacity-60" />
      
      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Name - HUGE with responsive scaling */}
        <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-7xl xl:text-8xl leading-none font-black tracking-tighter text-slate-900 uppercase break-words w-full filter drop-shadow-sm px-2">
          {data.name}
        </h2>

        {/* Info Row */}
        <div className="mt-4 md:mt-8 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 w-full">
           <div className="flex flex-col items-center md:items-start order-2 md:order-1">
             <span className="text-[8px] md:text-sm font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1 md:2">Số điện thoại</span>
             <div className="text-2xl md:text-6xl font-black text-slate-900 tracking-tight tabular-nums">
                {data.maskedPhone}
             </div>
           </div>

           <div className="h-8 md:h-16 w-[1px] md:w-[2px] bg-slate-100 hidden md:block order-2" />

           <div className="flex flex-col items-center md:items-start order-1 md:order-3">
             <span className="text-[8px] md:text-sm font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1 md:2">Dự kiến phục vụ</span>
             <div className="px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xl md:text-5xl font-black tabular-nums flex items-center gap-2 md:gap-4 shadow-sm">
                <Clock className="h-5 w-5 md:h-10 md:w-10" /> {data.estimatedTime}
             </div>
           </div>
        </div>

        {/* Ticket - THE BIG NUMBER */}
        <div className="mt-6 md:mt-12 relative w-full flex justify-center">
          <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20" />
          <div className="relative flex items-center justify-center px-8 py-4 md:px-20 md:py-10 rounded-[2rem] md:rounded-[3.5rem] bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_20px_60px_-15px_rgba(220,38,38,0.5)] border-2 md:border-4 border-red-400/30 w-full md:w-auto">
            <span className="text-5xl md:text-[8rem] xl:text-[10rem] font-black leading-none tabular-nums tracking-tighter drop-shadow-md">{data.num}</span>
          </div>
        </div>
      </div>

      {/* Footer line */}
      <div className="mt-6 md:mt-12 pt-4 md:pt-6 border-t border-slate-50 w-full max-w-2xl">
        <div className="text-[8px] md:text-xs font-black text-slate-300 uppercase tracking-[0.3em] md:tracking-[0.4em] mb-2 md:4">Loại dịch vụ</div>
        <div className="text-base md:text-4xl font-black text-slate-400 italic tracking-tight">
          {data.service || "DỊCH VỤ CÔNG CHUẨN"}
        </div>
      </div>
    </div>
  );
}
