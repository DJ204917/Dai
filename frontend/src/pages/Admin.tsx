import { Boxes, CalendarClock, ChartNoAxesCombined, Receipt, Users } from "lucide-react";

const stats = [
  { label: "今日预约", value: 28, icon: CalendarClock },
  { label: "今日营业额", value: "¥6,820", icon: ChartNoAxesCombined },
  { label: "待退款", value: 3, icon: Receipt },
  { label: "装备库存预警", value: 5, icon: Boxes }
];

export default function Admin() {
  return (
    <div className="page compact-page">
      <section className="section-heading">
        <p className="eyebrow">后台管理</p>
        <h1>运营仪表盘</h1>
      </section>
      <div className="stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="stat-card" key={stat.label}>
              <Icon size={24} />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          );
        })}
      </div>
      <section className="admin-modules">
        {["预约管理", "订单与财务", "装备管理", "内容管理", "用户管理"].map((item, index) => (
          <button key={item}>
            {index === 4 ? <Users size={18} /> : <CalendarClock size={18} />}
            {item}
          </button>
        ))}
      </section>
    </div>
  );
}
