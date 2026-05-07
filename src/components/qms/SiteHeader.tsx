import { useNavigate, Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const navigate = useNavigate();
  const links = [
    { to: "/lay-so", label: "Lấy số" },
  ] as const;

  const handleAdminAccess = (e: React.MouseEvent) => {
    e.preventDefault();
    const pw = prompt("Nhập mật khẩu quản trị:");
    if (pw === "cax123") {
      navigate({ to: "/quay" });
    } else if (pw !== null) {
      alert("Sai mật khẩu!");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-5">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={32} />
        </Link>
        
        <div className="flex items-center gap-2 md:gap-4">
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "text-primary bg-accent" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <Button asChild size="sm" className="bg-gradient-primary shadow-soft rounded-full px-4 md:px-6">
            <Link to="/lay-so" className="text-xs md:text-sm font-bold">Lấy số</Link>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-primary"
            onClick={handleAdminAccess}
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
