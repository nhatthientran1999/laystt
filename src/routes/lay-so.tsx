import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, CheckCircle2, Clock, Phone, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/qms/Logo";
import { createTicket, getQueue } from "@/lib/server-functions";

export const Route = createFileRoute("/lay-so")({
  head: () => ({
    meta: [
      { title: "Lấy số thứ tự — QMS" },
      { name: "description", content: "Lấy số thứ tự trực tuyến nhanh chóng, tiện lợi." },
    ],
  }),
  component: LaySoPage,
});

function LaySoPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [queueDataRaw, setQueueDataRaw] = useState<any[]>([]);
  const [queuePos, setQueuePos] = useState(0);

  const services = [
    "Thủ tục cấp Căn cước",
    "Thủ tục cấp định danh điện tử mức độ 2"
  ];

  const getEstimatedTime = () => {
    if (!ticketData || !queueDataRaw) return "--:--";
    
    // Thuật toán tịnh tiến thông minh: Duyệt qua toàn bộ hàng chờ để tìm giờ dự kiến của số vừa lấy
    let lastEst = new Date(0);
    const targetId = ticketData.id;
    let finalEst = new Date(ticketData.created_at);

    const sortedQueue = [...queueDataRaw].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const item of sortedQueue) {
      const createdAt = new Date(item.created_at);
      const currentEst = new Date(Math.max(createdAt.getTime(), lastEst.getTime() + 15 * 60000));
      lastEst = currentEst;
      
      if (item.id === targetId) {
        finalEst = currentEst;
        break;
      }
    }

    return finalEst.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-gradient-hero min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute -top-24 left-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-72 w-72 rounded-full bg-primary-glow/20 blur-3xl animate-blob" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 md:px-5 py-6 md:py-10">
        <Link to="/" className="mb-6 md:mb-8 self-center">
          <Logo size={40} />
        </Link>

        {!submitted ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                const res = await createTicket({ data: { name, phone, service } });
                setTicketData(res);
                
                // Lấy danh sách hàng chờ hiện tại để tính toán
                const queueData = await getQueue();
                setQueueDataRaw(queueData);
                const pos = queueData ? (queueData as any[]).filter(i => i.status === 'waiting').length : 0;
                setQueuePos(pos);
                
                setSubmitted(true);
              } catch (err) {
                alert("Lỗi khi lấy số: " + (err as Error).message);
              } finally {
                setLoading(false);
              }
            }}
            className="bg-card shadow-elegant rounded-3xl border border-border p-8"
          >
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold leading-tight">
                HỆ THỐNG <br /> XẾP HÀNG THÔNG MINH
              </h1>
              <p className="mt-1 md:mt-2 text-xs md:text-sm text-muted-foreground">
                Nhanh chóng – Tiện lợi – Văn minh
              </p>
            </div>
            
            <div className="mt-8 space-y-5">
              <Field
                label="Họ và tên"
                icon={<User className="h-4 w-4" />}
                value={name}
                onChange={setName}
                placeholder="Nhập họ và tên"
              />
              <Field
                label="Số điện thoại"
                icon={<Phone className="h-4 w-4" />}
                value={phone}
                onChange={setPhone}
                placeholder="Nhập số điện thoại"
                type="tel"
              />
            </div>

            <div className="mt-8">
              <Label className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 block">Chọn dịch vụ</Label>
              <div className="grid gap-3">
                {services.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setService(s)}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      service === s 
                        ? "border-primary bg-primary/[0.03] text-primary shadow-sm" 
                        : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-primary/20"
                    }`}
                  >
                    <div className="relative z-10 font-bold text-sm leading-tight pr-6">{s}</div>
                    {service === s && (
                      <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="bg-gradient-primary shadow-soft mt-6 md:mt-8 h-12 md:h-14 w-full text-sm md:text-base font-black tracking-wider rounded-2xl"
              disabled={!name || !phone || !service || loading}
            >
              {loading ? "ĐANG XỬ LÝ..." : "LẤY SỐ THỨ TỰ"}
            </Button>
          </form>
        ) : (
          <div className="bg-card shadow-elegant rounded-[2.5rem] border border-border p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-primary"></div>
            
            <div className="flex items-center gap-3 border-b border-border pb-4 md:pb-5">
              <Logo size={28} subtitle="Smart Queue" className="md:w-[32px]" />
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-success">
                ● Đang hoạt động
              </span>
            </div>

            <div className="mt-6 text-center">
              <div className="bg-accent shadow-soft mx-auto grid h-16 w-16 md:h-20 md:w-20 place-items-center rounded-full">
                <CheckCircle2 className="h-8 w-8 md:h-10 md:h-10 text-primary" />
              </div>
              <h2 className="mt-4 md:mt-5 text-lg md:text-xl font-bold">Lấy số thành công!</h2>
              <p className="mt-1 text-[10px] md:text-xs text-muted-foreground">Vui lòng chờ gọi số: <span className="font-bold text-primary">{name}</span></p>

              <div className="mt-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Số thứ tự của bạn
                </div>
                <div className="bg-gradient-primary mt-1 bg-clip-text text-5xl md:text-7xl font-extrabold tracking-tight text-transparent">
                  {ticketData?.display_number || "---"}
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                  <Clock className="h-3 w-3" /> {ticketData ? new Date(ticketData.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "--:--"} — {ticketData ? new Date(ticketData.created_at).toLocaleDateString('vi-VN') : "--/--/----"}
                </div>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Thời gian chờ dự kiến</div>
                  <div className="text-xl font-black text-primary mt-1">{getEstimatedTime()}</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Số người đang chờ</div>
                  <div className="text-xl font-black text-slate-700 mt-1">{queuePos > 0 ? queuePos - 1 : 0} người</div>
                </div>
              </div>
            </div>

            <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 py-3 md:py-4 text-[10px] md:text-xs font-black text-primary transition-all hover:bg-primary/10 tracking-widest">
              <Bell className="h-4 w-4" /> NHẬN THÔNG BÁO
            </button>

            <button
              onClick={() => {
                setSubmitted(false);
                setService("");
              }}
              className="mt-6 w-full text-center text-[9px] md:text-[10px] font-bold text-slate-400 hover:text-primary uppercase tracking-widest"
            >
              ← Lấy số mới
            </button>
          </div>
        )}

        <Link to="/" className="mt-6 text-center text-xs text-muted-foreground hover:text-primary">
          ← Về trang chủ
        </Link>
      </div>
    </div>
  );
}

function Field({
  label, icon, value, onChange, placeholder, type = "text",
}: {
  label: string; icon: React.ReactNode; value: string;
  onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <Label className="text-sm font-semibold text-primary">{label}</Label>
      <div className="relative mt-1.5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          className="h-12 rounded-xl pl-10"
        />
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-primary">{icon}</div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-base font-bold text-foreground">{value}</span>
    </div>
  );
}
