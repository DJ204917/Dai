import { PackageCheck } from "lucide-react";
import { equipment } from "../data/mock";

export default function Rental() {
  return (
    <div className="page compact-page">
      <section className="section-heading">
        <p className="eyebrow">装备租赁</p>
        <h1>泳镜、泳帽、泳圈与防水用品</h1>
      </section>
      <div className="card-grid">
        {equipment.map((item) => (
          <article className="card equipment-card" key={item.id}>
            <div className="icon-tile"><PackageCheck size={28} /></div>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <div className="price-line"><span>租金</span><strong>¥{item.price}/次</strong></div>
            <div className="price-line"><span>押金</span><strong>¥{item.deposit}</strong></div>
            <div className="stock">当前库存：{item.stock}</div>
          </article>
        ))}
      </div>
      <section className="panel info-panel">
        <h2>押金处理方案</h2>
        <p>当前框架预留线上预授权和线下押金两种模式。上线初期建议使用线下押金，技术链路更短；后续可接入支付预授权，由店员后台确认归还后解冻。</p>
      </section>
    </div>
  );
}
