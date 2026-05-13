import { Boxes, CalendarClock, ChartNoAxesCombined, Eye, Plus, Receipt, XCircle, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

interface Summary {
  todayBookings: number;
  revenue: number;
  revenueDate?: string;
  pendingRefunds: number;
  lowStockCount: number;
}

interface AdminBooking {
  id: string;
  serviceId: string;
  contactName: string;
  phone: string;
  date: string;
  slot: string;
  people: number;
  hours: number;
  amount: number;
  status: string;
  memberAccount?: string;
  createdAt: string;
  rentals: string[];
  order?: { id: string; status: string; amount: number; createdAt?: string };
}

interface RefundRow {
  order: { id: string; amount: number; refundRequestedAt?: string };
  booking?: AdminBooking;
}

interface Equipment {
  id: string;
  name: string;
  stock: number;
  totalStock: number;
  price: number;
  deposit: number;
  description?: string;
  depositMode?: "offline" | "online_hold";
}

const typeLabels: Record<string, string> = {
  lane: "泳道预约",
  course: "课程预约",
  private: "包场咨询",
  rental: "装备租赁"
};

const orderStatusLabels: Record<string, string> = {
  pending_payment: "待支付",
  paid: "已支付",
  refund_reviewing: "退款处理中",
  refunded: "已退款",
  cancelled: "已取消"
};

interface EquipmentForm {
  name: string;
  price: number;
  deposit: number;
  stock: number;
  totalStock: number;
  description: string;
  depositMode: "offline" | "online_hold";
}

const initialEquipmentForm: EquipmentForm = {
  name: "",
  price: 0,
  deposit: 20,
  stock: 1,
  totalStock: 1,
  description: "",
  depositMode: "offline"
};

function formatRentalNames(rentals: string[]) {
  if (rentals.length === 0) {
    return "无";
  }

  const counts = rentals.reduce<Record<string, number>>((acc, name) => {
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, count]) => `${name} * ${count}`)
    .join("、");
}

function getLocalDateValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getOrderTimeValue(booking: AdminBooking) {
  return booking.order?.createdAt ?? booking.createdAt;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export default function Admin() {
  const [summary, setSummary] = useState<Summary>({ todayBookings: 0, revenue: 0, revenueDate: "", pendingRefunds: 0, lowStockCount: 0 });
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [view, setView] = useState<"todayBookings" | "bookingManage" | "refunds" | "equipment" | "equipmentManage" | null>(null);
  const [equipmentForm, setEquipmentForm] = useState(initialEquipmentForm);
  const [message, setMessage] = useState("");

  const loadAdminData = async () => {
    const [summaryResponse, bookingsResponse, refundsResponse, equipmentResponse] = await Promise.all([
      fetch("/api/admin/summary"),
      fetch("/api/admin/bookings"),
      fetch("/api/admin/refunds"),
      fetch("/api/equipment")
    ]);
    const [summaryResult, bookingsResult, refundsResult, equipmentResult] = await Promise.all([
      summaryResponse.json(),
      bookingsResponse.json(),
      refundsResponse.json(),
      equipmentResponse.json()
    ]);
    setSummary(summaryResult.data);
    setBookings(bookingsResult.data ?? []);
    setRefunds(refundsResult.data ?? []);
    setEquipment(equipmentResult.data ?? []);
  };

  useEffect(() => {
    loadAdminData().catch(() => setMessage("后台数据加载失败"));
  }, []);

  const approveRefund = async (orderId: string) => {
    const response = await fetch(`/api/orders/${orderId}/refund-approve`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.message ?? "退款处理失败");
      return;
    }
    setMessage("退款已处理，用户订单页将显示退款成功");
    await loadAdminData();
  };

  const cancelBooking = async (bookingId: string) => {
    const response = await fetch(`/api/admin/bookings/${bookingId}/cancel`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.message ?? "取消预约失败");
      return;
    }
    setMessage("预约订单已取消，库存已同步返回");
    await loadAdminData();
  };

  const createEquipment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/admin/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(equipmentForm)
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.message ?? "新增装备失败");
      return;
    }
    setMessage("装备已新增，用户租赁界面已同步");
    setEquipmentForm(initialEquipmentForm);
    await loadAdminData();
  };

  const stats = [
    { label: "今日预约", value: summary.todayBookings, icon: CalendarClock, action: () => setView("todayBookings") },
    { label: summary.revenueDate ? `${summary.revenueDate} 营业额` : "最新订单日营业额", value: `¥${summary.revenue}`, icon: ChartNoAxesCombined },
    { label: "待退款", value: summary.pendingRefunds, icon: Receipt, action: () => setView("refunds") },
    { label: "装备库存预警", value: summary.lowStockCount, icon: Boxes, action: () => setView("equipment"), danger: summary.lowStockCount > 0 }
  ];
  const today = getLocalDateValue();
  const todayBookings = bookings
    .filter((booking) => getOrderTimeValue(booking) && getLocalDateValue(new Date(getOrderTimeValue(booking))) === today)
    .slice()
    .sort((a, b) => getOrderTimeValue(b).localeCompare(getOrderTimeValue(a)));
  const sortedBookings = bookings
    .slice()
    .sort((a, b) => getOrderTimeValue(b).localeCompare(getOrderTimeValue(a)));
  const displayBookings = view === "todayBookings" ? todayBookings : sortedBookings;

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
            <article className={stat.danger ? "stat-card danger" : "stat-card"} key={stat.label}>
              <Icon size={24} />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              {stat.action && (
                <button className="table-action" onClick={stat.action} type="button">
                  <Eye size={16} /> 查看
                </button>
              )}
            </article>
          );
        })}
      </div>
      <section className="admin-modules">
        {[
          { label: "预约管理", action: () => setView("bookingManage") },
          { label: "订单与财务", action: () => setView("refunds") },
          { label: "装备管理", action: () => setView("equipmentManage") },
          { label: "内容管理", action: undefined },
          { label: "用户管理", action: undefined }
        ].map((item, index) => (
          <button key={item.label} onClick={item.action} type="button">
            {index === 4 ? <Users size={18} /> : <CalendarClock size={18} />}
            {item.label}
          </button>
        ))}
      </section>

      {message && <div className="payment-result success">{message}</div>}

      {(view === "todayBookings" || view === "bookingManage") && (
        <section className="panel admin-detail-panel">
          <h2>{view === "todayBookings" ? "今日预约明细" : "用户预约明细"}</h2>
          <div className="admin-list">
            {displayBookings.map((booking) => (
              <article className="admin-list-row" key={booking.id}>
                <strong>{typeLabels[booking.serviceId] ?? booking.serviceId} · {booking.date} {booking.slot}</strong>
                <span>下单时间：{formatDateTime(getOrderTimeValue(booking))}</span>
                <span>账号：{booking.memberAccount ?? "未绑定"} · 联系人：{booking.contactName} · 手机：{booking.phone}</span>
                <span>人数：{booking.people} · 时长：{booking.hours} · 金额：¥{booking.amount}</span>
                <span>装备：{formatRentalNames(booking.rentals)}</span>
                <span>订单状态：{booking.order ? orderStatusLabels[booking.order.status] ?? booking.order.status : "无订单"}</span>
                {booking.order && !["cancelled", "refunded"].includes(booking.order.status) && booking.status !== "cancelled" && (
                  <div className="table-actions">
                    <button className="table-action" onClick={() => cancelBooking(booking.id)} type="button">
                      <XCircle size={16} /> 取消预约
                    </button>
                  </div>
                )}
              </article>
            ))}
            {displayBookings.length === 0 && <p>{view === "todayBookings" ? "今天暂无预约" : "暂无预约"}</p>}
          </div>
        </section>
      )}

      {view === "refunds" && (
        <section className="panel admin-detail-panel">
          <h2>退款申请</h2>
          <div className="admin-list">
            {refunds.length === 0 ? <p>暂无待退款订单</p> : refunds.map(({ order, booking }) => (
              <article className="admin-list-row" key={order.id}>
                <strong>{order.id} · ¥{order.amount}</strong>
                <span>账号：{booking?.memberAccount ?? "未绑定"} · 联系人：{booking?.contactName ?? "-"}</span>
                <span>业务：{booking ? typeLabels[booking.serviceId] ?? booking.serviceId : "-"} · {booking?.date ?? "-"} {booking?.slot ?? ""}</span>
                <button className="primary-button" onClick={() => approveRefund(order.id)} type="button">
                  处理退款
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {view === "equipment" && (
        <section className="panel admin-detail-panel">
          <h2>装备库存</h2>
          <div className="admin-list">
            {equipment.map((item) => (
              <article className={item.stock <= 3 ? "admin-list-row danger" : "admin-list-row"} key={item.id}>
                <strong>{item.name}</strong>
                <span>当前库存：{item.stock} / 总库存：{item.totalStock}</span>
                <span>租金：¥{item.price} · 押金：¥{item.deposit}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {view === "equipmentManage" && (
        <section className="panel admin-detail-panel">
          <h2>装备管理</h2>
          <form className="form-grid" onSubmit={createEquipment}>
            <label>
              装备名称
              <input
                required
                value={equipmentForm.name}
                onChange={(event) => setEquipmentForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              租金
              <input
                min="0"
                required
                type="number"
                value={equipmentForm.price}
                onChange={(event) => setEquipmentForm((current) => ({ ...current, price: Number(event.target.value) }))}
              />
            </label>
            <label>
              押金
              <input
                min="0"
                required
                type="number"
                value={equipmentForm.deposit}
                onChange={(event) => setEquipmentForm((current) => ({ ...current, deposit: Number(event.target.value) }))}
              />
            </label>
            <label>
              库存数量
              <input
                min="1"
                required
                type="number"
                value={equipmentForm.totalStock}
                onChange={(event) => {
                  const totalStock = Number(event.target.value);
                  setEquipmentForm((current) => ({ ...current, totalStock, stock: totalStock }));
                }}
              />
            </label>
            <label>
              装备说明
              <input
                required
                value={equipmentForm.description}
                onChange={(event) => setEquipmentForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <label>
              押金方式
              <select
                value={equipmentForm.depositMode}
                onChange={(event) => setEquipmentForm((current) => ({ ...current, depositMode: event.target.value as "offline" | "online_hold" }))}
              >
                <option value="offline">线下押金</option>
                <option value="online_hold">线上预授权</option>
              </select>
            </label>
            <button className="primary-button" type="submit">
              <Plus size={16} /> 新增装备
            </button>
          </form>
          <div className="admin-list">
            {equipment.map((item) => (
              <article className={item.stock <= 3 ? "admin-list-row danger" : "admin-list-row"} key={item.id}>
                <strong>{item.name}</strong>
                <span>当前库存：{item.stock} / 总库存：{item.totalStock}</span>
                <span>租金：¥{item.price} · 押金：¥{item.deposit}</span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
