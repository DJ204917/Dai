import { CalendarDays, LayoutDashboard, LifeBuoy, LogIn, MapPin, Phone, ReceiptText, UserRound, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Booking from "./pages/Booking";
import Contact from "./pages/Contact";
import Detail from "./pages/Detail";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Payment from "./pages/Payment";
import Rental from "./pages/Rental";

const navItems = [
  { to: "/", label: "首页", icon: Waves },
  { to: "/booking", label: "预约", icon: CalendarDays },
  { to: "/rental", label: "租赁", icon: LifeBuoy },
  { to: "/orders", label: "订单", icon: ReceiptText },
  { to: "/contact", label: "联系", icon: MapPin }
];

interface Member {
  id: string;
  account: string;
  createdAt: string;
  lastLoginAt?: string;
}

export default function App() {
  const location = useLocation();
  const [member, setMember] = useState<Member | null>(null);
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    const savedMember = localStorage.getItem("member");
    if (savedMember) {
      setMember(JSON.parse(savedMember));
    }
  }, []);

  const handleLogin = (nextMember: Member) => {
    setMember(nextMember);
    localStorage.setItem("member", JSON.stringify(nextMember));
  };

  const handleLogout = () => {
    setMember(null);
    localStorage.removeItem("member");
  };

  return (
    <div className={isAdminRoute ? "app-shell admin-shell" : "app-shell"}>
      {isAdminRoute ? (
        <header className="admin-header">
          <div className="admin-brand">
            <span className="brand-mark"><LayoutDashboard size={22} /></span>
            <div>
              <strong>后台管理系统</strong>
              <span>运营数据与门店管理</span>
            </div>
          </div>
          <Link className="member-chip" to="/">
            <Waves size={18} />
            <span>打开用户端</span>
          </Link>
        </header>
      ) : (
        <header className="site-header">
          <NavLink to="/" className="brand" aria-label="返回首页">
            <span className="brand-mark"><Waves size={22} /></span>
            <span>迪爱泳馆</span>
          </NavLink>
          <nav className="main-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <a className="hotline" href="tel:400-800-6688">
            <Phone size={18} />
            <span>400-800-6688</span>
          </a>
          {member ? (
            <button className="member-chip" onClick={handleLogout} type="button" title="点击退出登录">
              <UserRound size={18} />
              <span>{member.account}</span>
            </button>
          ) : (
            <NavLink className="member-chip" to="/auth">
              <LogIn size={18} />
              <span>会员登录</span>
            </NavLink>
          )}
        </header>
      )}

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/rental" element={<Rental />} />
          <Route path="/details/:type/:id" element={<Detail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/auth" element={<Auth onLogin={handleLogin} />} />
        </Routes>
      </main>

      {!isAdminRoute && (
        <footer className="site-footer">
          <span>营业时间：周一至周日 08:00 - 22:00</span>
          <span>地址：上海市浦东新区蓝湾路 88 号</span>
          <span>客服微信：DaiaiSwim</span>
        </footer>
      )}
    </div>
  );
}
