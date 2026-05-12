import { useEffect, useState } from "react";
import { Ban, CreditCard, FileText, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";

interface Order {
  id: string;
  bookingId: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface Booking {
  id: string;
  serviceId: string;
  date: string;
  slot: string;
}

interface OrderRow {
  order: Order;
  booking?: Booking;
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

export default function Orders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionStatus, setActionStatus] = useState<"success" | "error">("success");

  const loadOrders = async () => {
    try {
      const response = await fetch("/api/orders");
      if (!response.ok) {
        throw new Error("订单接口请求失败");
      }
      const result = await response.json();
      const rows = await Promise.all(
        (result.data ?? []).map(async (order: Order) => {
          const detailResponse = await fetch(`/api/orders/${order.id}`);
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
  }, []);

  const updateOrder = async (orderId: string, action: "cancel" | "refund-requests") => {
    try {
      setActionMessage("");
      setActionStatus("success");
      const response = await fetch(`/api/orders/${orderId}/${action}`, { method: "POST" });
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
                  <span>¥{order.amount}</span>
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
