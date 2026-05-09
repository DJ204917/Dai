import { FileText } from "lucide-react";
import { orders } from "../data/mock";

export default function Orders() {
  return (
    <div className="page compact-page">
      <section className="section-heading">
        <p className="eyebrow">订单管理</p>
        <h1>历史订单、待支付和发票申请</h1>
      </section>
      <section className="panel">
        <div className="table">
          <div className="table-head">
            <span>订单号</span><span>类型</span><span>时间</span><span>金额</span><span>状态</span><span>操作</span>
          </div>
          {orders.map((order) => (
            <div className="table-row" key={order.id}>
              <span>{order.id}</span>
              <span>{order.type}</span>
              <span>{order.date}</span>
              <span>¥{order.amount}</span>
              <span className="status">{order.status}</span>
              <button><FileText size={16} /> 发票</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
