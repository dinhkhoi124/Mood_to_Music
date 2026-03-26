import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Music,
  LayoutDashboard,
  Mic,
  Camera,
  History,
  User,
  LogOut,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    api.clearToken();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/voice", icon: Mic, label: "Voice" },
    { path: "/face", icon: Camera, label: "Face" },
    { path: "/history", icon: History, label: "History" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <Music className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
            <Sparkles className="w-4 h-4 text-accent" />

            {/* PHẦN ĐÃ CHỈNH SỬA: Tăng kích thước logo lên h-8 và thêm ml-1 */}
            <div className="flex items-center">
              <span className="font-bold text-xl bg-gradient-emotion bg-clip-text text-transparent mr-2">
                Mood2Music
              </span>
              <img
                src="/logo_fpt.png"
                alt="FPT Logo"
                className="h-9 ml-2 object-contain" // Đã thay đổi h-6 thành h-8 và thêm ml-1
              />
            </div>
            {/* KẾT THÚC PHẦN CHỈNH SỬA */}
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <div className="md:hidden flex gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
