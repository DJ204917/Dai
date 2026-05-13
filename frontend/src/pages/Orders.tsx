import { useEffect, useState } from "react";
import { Ban, CreditCard, FileText, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface Order {
  id: string;
  bookingId: string;
  amount: number;
  status: string;
  createdAt: string;
  feeItems?: Array<{ label: string; amount: number }>;
}

interface Booking {
  id: string;
  serviceId: string;
  courseId?: string;
  date: string;
  slot: string;
  people: number;
  hours: number;
  rentalIds: string[];
}

interface OrderRow {
  order: Order;
  booking?: Booking;
}

interface Member {
  id: string;
  account: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface Equipment {
  id: string;
  name: string;
  price: number;
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

const statusPriority: Record<string, number> = {
  pending_payment: 0,
  paid: 1,
  refund_reviewing: 2,
  refunded: 3,
  cancelled: 4
};

function formatBeijingDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function calculateLaneAmount(hours: number, people: number) {
  const billableHours = Math.max(hours, 2);
  return (40 + Math.max(billableHours - 2, 0) * 10) * people;
}

function formatCurrency(value: number) {
  const normalized = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return `¥${normalized}`;
}

export default function Orders() {
  const [member] = useState<Member | null>(() => JSON.parse(localStorage.getItem("member") || "null"));
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionStatus, setActionStatus] = useState<"success" | "error">("success");

  const loadOrders = async () => {
    if (!member) {
      setOrders([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const accountQuery = `memberAccount=${encodeURIComponent(member.account)}`;
      const [ordersResponse, equipmentResponse] = await Promise.all([
        apiFetch(`/api/orders?${accountQuery}`),
        apiFetch("/api/equipment")
      ]);
      if (!ordersResponse.ok) {
        throw new Error("订单接口请求失败");
      }
      const [result, equipmentResult] = await Promise.all([
        ordersResponse.json(),
        equipmentResponse.ok ? equipmentResponse.json() : Promise.resolve({ data: [] })
      ]);
      setEquipment(equipmentResult.data ?? []);
      const rows = await Promise.all(
        (result.data ?? []).map(async (order: Order) => {
          const detailResponse = await apiFetch(`/api/orders/${order.id}?${accountQuery}`);
          if (!detailResponse.ok) {
            return { order };
          }
          const detailResult = await detailResponse.json();
          return {
            order: detailResult.data.order,
            booking: detailResult.data.booking
          };
        })
      );
      setOrders(rows.sort((left, right) => {
        const leftPriority = statusPriority[left.order.status] ?? 99;
        const rightPriority = statusPriority[right.order.status] ?? 99;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        return new Date(right.order.createdAt).getTime() - new Date(left.order.createdAt).getTime();
      }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载订单失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [member]);

  const getDisplayAmount = (order: Order, booking?: Booking) => {
    if (!booking) {
      return order.amount;
    }

    const rentalTotal = booking.rentalIds.reduce((sum, rentalId) => (
      sum + (equipment.find((item) => item.id === rentalId)?.price ?? 0)
    ), 0);

    if (booking.serviceId === "lane") {
      return calculateLaneAmount(booking.hours, booking.people) + rentalTotal;
    }

    if (booking.serviceId === "rental") {
      return rentalTotal;
    }

    return order.amount;
  };

  const updateOrder = async (orderId: string, action: "cancel" | "refund-requests") => {
    try {
      setActionMessage("");
      setActionStatus("success");
      if (!member) {
        throw new Error("请先登录会员账号");
      }
      const response = await apiFetch(`/api/orders/${orderId}/${action}?memberAccount=${encodeURIComponent(member.account)}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "操作失败");
      }
      setActionMessage(action === "refund-requests" ? "订单退款已申请，等待处理" : "订单已取消，商品余量已返还");
      setOrders((current) => current.map((row) => (
        row.order.id === orderId
          ? {
            ...row,
            order: {
              ...row.order,
              status: action === "refund-requests" ? "refund_reviewing" : "cancelled"
            }
          }
          : row
      )));
      await loadOrders();
    } catch (err) {
      setActionStatus("error");
      setActionMessage(err instanceof Error ? err.message : "操作失败");
    }
  };

  return (
    <div className="page compact-page">
      <section className="section-heading">
        <p className="eyebrow">订单管理</p>
        <h1>历史订单、待支付和发票申请</h1>
      </section>
      <section className="panel">
        {actionMessage && <div className={actionStatus === "success" ? "payment-result success" : "payment-result error"}>{actionMessage}</div>}
        {loading ? (
          <p>订单加载中...</p>
        ) : error ? (
          <p className="error">加载失败: {error}</p>
        ) : !member ? (
          <div className="empty-state">
            <p>请先登录会员账号查看自己的订单。</p>
            <Link className="primary-button" to="/auth">会员登录</Link>
          </div>
        ) : orders.length === 0 ? (
          <p>当前账号暂无订单。</p>
        ) : (
          <div className="table">
            <div className="table-head">
              <span>订单号</span><span>类型</span><span>下单时间</span><span>金额</span><span>状态</span><span>操作</span>
            </div>
            {orders.map(({ order, booking }) => {
              const isPending = order.status === "pending_payment";
              const statusLabel = statusLabels[order.status] ?? order.status;
              const typeLabel = booking ? typeLabels[booking.serviceId] ?? booking.serviceId : "-";
              return (
                <div className="table-row" key={order.id}>
                  <span>{order.id}</span>
                  <span>{typeLabel}</span>
                  <span>{formatBeijingDateTime(order.createdAt)}</span>
                  <span>{formatCurrency(getDisplayAmount(order, booking))}</span>
                  <span className="status">{statusLabel}</span>
                  {isPending ? (
                    <div className="table-actions">
                      <Link className="table-action primary" to={`/payment?orderId=${order.id}`}>
                        <CreditCard size={16} /> 去支付
                      </Link>
                      <button onClick={() => updateOrder(order.id, "cancel")} type="button">
                        <Ban size={16} /> 取消
                      </button>
                    </div>
                  ) : order.status === "paid" ? (
                    <button onClick={() => updateOrder(order.id, "refund-requests")} type="button">
                      <RotateCcw size={16} /> 申请退款
                    </button>
                  ) : order.status === "cancelled" ? (
                    <span className="status">订单已取消</span>
                  ) : order.status === "refund_reviewing" ? (
                    <span className="status">订单退款已申请，等待处理</span>
                  ) : order.status === "refunded" ? (
                    <span className="status">退款成功</span>
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
