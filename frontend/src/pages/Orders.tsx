import { useEffect, useMemo, useState } from "react";
import { CreditCard, FileText } from "lucide-react";
import { Link } from "react-router-dom";

interface Order {
  id: string;
  bookingId: string;
  amount: number;
  status: string;
}

interface Booking {
  id: string;
  serviceId: string;
  date: string;
  slot: string;
}

const statusLabels: Record<string, string> = {
  pending_payment: "待支付",
  paid: "已完成",
  refund_reviewing: "退款审核",
  refunded: "已退款",
  cancelled: "已取消"
};

const typeLabels: Record<string, string> = {
  lane: "泳道预约",
  course: "课程预约",
  private: "包场咨询",
  rental: "装备租赁"
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then((response) => {
        if (!response.ok) {
          throw new Error(`获取订单失败: ${response.status}`);
        }
        return response.json();
      }),
      fetch("/api/bookings").then((response) => {
        if (!response.ok) {
          throw new Error(`获取预约失败: ${response.status}`);
        }
        return response.json();
      })
    ])
      .then(([orderResult, bookingResult]) => {
        setOrders(orderResult.data);
        setBookings(bookingResult.data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const bookingMap = useMemo(() => new Map(bookings.map((booking) => [booking.id, booking])), [bookings]);

  return (
    <div className="page compact-page">
      <section className="section-heading">
        <p className="eyebrow">订单管理</p>
        <h1>历史订单、待支付和发票申请</h1>
      </section>
      <section className="panel">
        {loading ? (
          <p>订单加载中...</p>
        ) : error ? (
          <p className="error">加载失败: {error}</p>
        ) : (
          <div className="table">
            <div className="table-head">
              <span>订单号</span><span>类型</span><span>时间</span><span>金额</span><span>状态</span><span>操作</span>
            </div>
            {orders.map((order) => {
              const booking = bookingMap.get(order.bookingId);
              const isPending = order.status === "pending_payment";
              return (
                <div className="table-row" key={order.id}>
                  <span>{order.id}</span>
                  <span>{typeLabels[booking?.serviceId ?? ""] ?? "订单"}</span>
                  <span>{booking ? `${booking.date} ${booking.slot}` : "-"}</span>
                  <span>¥{order.amount}</span>
                  <span className="status">{statusLabels[order.status] ?? order.status}</span>
                  {isPending ? (
                    <Link className="table-action primary" to={`/payment?orderId=${order.id}`}>
                      <CreditCard size={16} /> 去支付
                    </Link>
                  ) : (
                    <button><FileText size={16} /> 发票</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
