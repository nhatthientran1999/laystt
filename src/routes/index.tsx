import { useNavigate, createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/qms/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Clock, Calendar, UserCheck, Users, ShieldCheck, Hourglass, Search, Key } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "App xếp hàng — Smart Queue" },
      { name: "description", content: "ANCS Dương Sơn Thân Tặng App" },
    ],
  }),
  component: QueueDisplayPage,
});

// Helper: Mask Phone Number
const maskPhone = (p: string) => {
  if (!p) return "";
  const cleaned = p.replace(/\s/g, "");
  return cleaned.slice(0, 4) + "****" + cleaned.slice(-3);
};

// Helper: Calculate Estimated Time (15 mins per person, sequential)
const calculateEstimatedTime = (index: number) => {
  const baseHour = 10;
  const baseMinute = 0;
  const totalMinutes = baseHour * 60 + baseMinute + index * 15;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

function QueueDisplayPage() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

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

  const rawQueue = [
    { num: "A102", name: "PHAN ANH QUỐC", phone: "0905 123 789", service: "Thủ tục Căn cước" },
    { num: "A103", name: "LÊ THỊ LAN", phone: "0912 456 789", service: "Định danh điện tử cấp 2" },
    { num: "A104", name: "NGUYỄN ĐỨC HƯNG", phone: "0987 321 654" },
    { num: "A105", name: "LÊ THỊ MAI", phone: "0905 789 123" },
    { num: "A106", name: "TRẦN VĂN TÂM", phone: "0934 111 222" },
    { num: "A107", name: "VŨ THỊ HỒNG", phone: "0911 333 444" },
  ];

  const queue = rawQueue.map((item, index) => ({
    ...item,
    maskedPhone: maskPhone(item.phone),
    estimatedTime: calculateEstimatedTime(index),
  }));

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex flex-col font-sans selection:bg-primary/20 overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />

      {/* Header Bar */}
      <header className="relative z-20 flex flex-col md:flex-row items-center justify-between px-6 md:px-10 py-4 md:py-5 bg-white border-b border-slate-200 shadow-sm gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-6">
          <div className="flex items-center gap-4 md:gap-6">
            <Logo size={35} className="md:w-[45px]" />
            <div className="flex flex-col">
              <h1 className="text-sm md:text-lg font-black tracking-tight uppercase text-primary leading-none">App xếp hàng</h1>
              <p className="text-[7px] md:text-[8px] font-bold text-slate-400 tracking-[0.4em] uppercase mt-1">Smart Queue</p>
            </div>
          </div>
          
          <div className="flex md:hidden items-center gap-2">
             <div className="flex flex-col items-end">
                <div className="text-xl font-black tabular-nums text-slate-800 leading-none">{time.slice(0, 5)}</div>
                <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">TODAY</div>
             </div>
          </div>
        </div>

        {/* Center Search Form - Hidden on small mobile or redesigned */}
        <div className="w-full md:flex-1 md:max-w-lg md:mx-12">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input 
              type="tel"
              placeholder="Nhập số điện thoại kiểm tra..." 
              className="pl-11 h-10 md:h-11 bg-slate-50 border-slate-200 rounded-xl focus:ring-primary focus:border-primary text-sm md:text-base shadow-inner w-full"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex flex-col items-end mr-4">
            <div className="text-2xl font-black tabular-nums text-slate-800 leading-none">{time.slice(0, 5)}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{date}</div>
          </div>
          
          <Button asChild className="rounded-xl h-11 px-6 text-sm font-black bg-gradient-primary shadow-soft">
            <Link to="/lay-so">Lấy số ngay</Link>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-11 w-11 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5"
            onClick={handleAdminAccess}
          >
            <Key className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Floating Action Button or Bottom Nav could be better, but let's adjust header for now */}
      </header>

      {/* Unified Dashboard Frame */}
      <main className="flex-1 p-4 md:p-8 relative z-10">
        <div className="h-full w-full bg-white rounded-3xl md:rounded-[3rem] shadow-[0_30px_80px_-20px_rgba(37,99,235,0.12)] border border-slate-200 overflow-hidden flex flex-col lg:flex-row">
          {/* Left: Detailed Cards Section */}
          <div className="flex-1 p-4 md:p-8 grid grid-cols-1 md:grid-rows-2 gap-4 md:gap-6 border-b lg:border-b-0 lg:border-r border-slate-100 min-h-0">
             <BigCard 
                data={queue[0]} 
                label="ĐANG PHỤC VỤ" 
                badgeColor="bg-red-600 text-white" 
                borderColor="border-red-500"
                glowColor="bg-red-50/50"
              />
              <BigCard 
                data={queue[1]} 
                label="TIẾP THEO" 
                badgeColor="bg-emerald-600 text-white" 
                borderColor="border-emerald-500"
                glowColor="bg-emerald-50/50"
              />
          </div>

          {/* Right: Sidebar Waiting List Section */}
          <div className="w-full lg:w-[420px] flex flex-col bg-slate-50/30 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white/50">
              <h3 className="text-sm md:text-base font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                <Users className="h-4 w-4" /> Hàng chờ
              </h3>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-[9px] font-black text-primary uppercase">{queue.length - 2} người</span>
            </div>
            
            <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4 md:p-6 space-y-3 md:space-y-4 max-h-[400px] lg:max-h-none">
              {queue.slice(2).map((it) => (
                <div key={it.num} className="p-4 md:p-5 rounded-2xl md:rounded-[2rem] bg-white border border-slate-100 flex items-center justify-between transition-all hover:border-primary/30 hover:shadow-sm group">
                  <div className="flex flex-col gap-0.5 md:gap-1">
                    <div className="text-base md:text-lg font-black text-slate-800 leading-none group-hover:text-primary transition-colors">{it.name}</div>
                    <div className="flex items-center gap-2 md:gap-3 mt-1">
                      <div className="text-[10px] md:text-xs font-bold text-slate-400 tabular-nums">{it.maskedPhone}</div>
                      <div className="h-1 w-1 rounded-full bg-slate-200" />
                      <div className="text-[9px] md:text-[10px] font-bold text-primary flex items-center gap-1">
                         <Hourglass className="h-3 w-3" /> {it.estimatedTime}
                      </div>
                    </div>
                  </div>
                  <div className="text-xl md:text-2xl font-black text-slate-100 tabular-nums">{it.num}</div>
                </div>
              ))}
            </div>

            <div className="p-6 md:p-8 bg-white/50 border-t border-slate-100">
              <div className="flex items-center justify-center gap-2 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4 text-primary/50" /> Bảo mật thông tin
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

function BigCard({ data, label, badgeColor, borderColor, glowColor }: any) {
  return (
    <div className={`bg-white rounded-3xl md:rounded-[2.5rem] border-[4px] ${borderColor} ${glowColor} p-6 md:p-8 relative overflow-hidden flex flex-col justify-center items-center text-center transition-all min-h-0 shadow-lg`}>
      <div className={`absolute top-0 left-6 md:left-10 px-4 md:px-6 py-1.5 md:py-2 rounded-b-xl md:rounded-b-2xl ${badgeColor} text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-md`}>
        {label}
      </div>
      
      <div className="flex flex-col items-center w-full">
        {/* Name - Scaled for dashboard fit */}
        <h2 className={`text-3xl md:text-5xl lg:text-6xl leading-tight md:leading-none font-black tracking-tighter text-slate-900 uppercase break-words w-full`}>
          {data.name}
        </h2>

        {/* Phone & Time */}
        <div className="mt-3 md:mt-4 flex flex-col md:flex-row items-center gap-2 md:gap-4">
           <div className="text-2xl md:text-4xl font-black text-slate-300 tracking-tight tabular-nums">
              {data.maskedPhone}
           </div>
           <div className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-slate-50 border border-slate-100 text-primary text-lg md:text-xl font-black tabular-nums flex items-center gap-2`}>
              <Hourglass className="h-4 w-4 md:h-5 md:h-5" /> {data.estimatedTime}
           </div>
        </div>

        {/* Ticket */}
        <div className={`mt-4 md:mt-6 flex items-center gap-3 md:gap-4 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-white border-2 border-slate-100 shadow-inner`}>
          <span className="text-xs md:text-base font-bold text-slate-400 uppercase tracking-widest leading-none">Số:</span>
          <span className={`text-2xl md:text-3xl font-black text-slate-800 leading-none`}>{data.num}</span>
        </div>
      </div>

      {/* Service line */}
      <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-slate-50 w-full max-w-lg">
        <div className="text-[8px] md:text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1 md:mb-2">Dịch vụ</div>
        <div className="text-lg md:text-xl font-black text-slate-500 italic tracking-tight">
          {data.service || "DỊCH VỤ CÔNG CHUẨN"}
        </div>
      </div>
    </div>
  );
}

