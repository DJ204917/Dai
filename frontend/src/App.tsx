import { CalendarDays, LayoutDashboard, LifeBuoy, MapPin, Phone, ReceiptText, Waves } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import Admin from "./pages/Admin";
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
  { to: "/contact", label: "联系", icon: MapPin },
  { to: "/admin", label: "后台", icon: LayoutDashboard }
];

export default function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to="/" className="brand" aria-label="返回首页">
          <span className="brand-mark"><Waves size={22} /></span>
          <span>澄蓝泳馆</span>
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
      </header>

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
        </Routes>
      </main>

      <footer className="site-footer">
        <span>营业时间：周一至周日 08:00 - 22:00</span>
        <span>地址：上海市浦东新区蓝湾路 88 号</span>
        <span>客服微信：ChenglanSwim</span>
      </footer>
    </div>
  );
}
