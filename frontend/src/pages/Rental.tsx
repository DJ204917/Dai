import { PackageCheck, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface Equipment {
  id: string;
  name: string;
  price: number;
  deposit: number;
  stock: number;
  totalStock: number;
  description: string;
  depositMode: "offline" | "online_hold";
}

export default function Rental() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/equipment")
      .then((response) => response.json())
      .then((result) => {
        setEquipment(result.data);
        // 初始化数量为0
        const initialQuantities: Record<string, number> = {};
        result.data.forEach((item: Equipment) => {
          initialQuantities[item.id] = 0;
        });
        setQuantities(initialQuantities);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 0) return;
    const item = equipment.find(e => e.id === id);
    if (item && quantity > item.stock) return;
    setQuantities(prev => ({ ...prev, [id]: quantity }));
  };

  const selectedItems = equipment.filter(item => quantities[item.id] > 0);
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.price * quantities[item.id], 0);

  if (loading) {
    return <div className="page"><p>装备加载中...</p></div>;
  }

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
            <div className="quantity-selector">
              <button onClick={() => updateQuantity(item.id, quantities[item.id] - 1)}>-</button>
              <input
                type="number"
                min="0"
                max={item.stock}
                value={quantities[item.id]}
                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
              />
              <button onClick={() => updateQuantity(item.id, quantities[item.id] + 1)}>+</button>
            </div>
          </article>
        ))}
      </div>
      {selectedItems.length > 0 && (
        <section className="panel checkout-panel">
          <h2>租赁清单</h2>
          <ul>
            {selectedItems.map(item => (
              <li key={item.id}>
                {item.name} x {quantities[item.id]} = 租金 ¥{item.price * quantities[item.id]}
              </li>
            ))}
          </ul>
          <p><strong>总计：¥{totalAmount}</strong></p>
          <Link
            className="primary-button"
            to={`/payment?serviceId=rental&rentalIds=${selectedItems.map(item => `${item.id}:${quantities[item.id]}`).join(',')}&amount=${totalAmount}`}
          >
            <ShoppingCart size={18} /> 去支付
          </Link>
        </section>
      )}
      <section className="panel info-panel">
        <h2>押金处理方案</h2>
        <p>需要线下支付押金</p>
      </section>
    </div>
  );
}
