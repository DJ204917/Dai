import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { equipment, services, timeSlots } from "../data/mock";

export default function Booking() {
  const [serviceId, setServiceId] = useState("lane");
  const [people, setPeople] = useState(2);
  const [hours, setHours] = useState(1);
  const [slot, setSlot] = useState(timeSlots[0]);
  const [rentals, setRentals] = useState<string[]>(["goggles"]);

  const service = services.find((item) => item.id === serviceId) ?? services[0];
  const rentalTotal = equipment.filter((item) => rentals.includes(item.id)).reduce((sum, item) => sum + item.price, 0);
  const bookingTotal = useMemo(() => service.price * (service.id === "lane" ? hours : people), [hours, people, service]);
  const total = bookingTotal + rentalTotal;

  const toggleRental = (id: string) => {
    setRentals((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <div className="page compact-page">
      <section className="section-heading">
        <p className="eyebrow">网上预约</p>
        <h1>选择服务、日期时间和人数</h1>
      </section>

      <div className="booking-layout">
        <section className="panel">
          <h2>服务类型</h2>
          <div className="segmented">
            {services.map((item) => (
              <button className={serviceId === item.id ? "selected" : ""} key={item.id} onClick={() => setServiceId(item.id)}>
                {item.name}
              </button>
            ))}
          </div>

          <div className="form-grid">
            <label>
              日期
              <input type="date" defaultValue="2026-05-10" />
            </label>
            <label>
              时间段
              <select value={slot} onChange={(event) => setSlot(event.target.value)}>
                {timeSlots.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              人数
              <input min={1} type="number" value={people} onChange={(event) => setPeople(Number(event.target.value))} />
            </label>
            <label>
              时长
              <input min={1} type="number" value={hours} onChange={(event) => setHours(Number(event.target.value))} />
            </label>
          </div>
        </section>

        <section className="panel">
          <h2>是否租赁装备</h2>
          <div className="rental-picker">
            {equipment.map((item) => (
              <button className={rentals.includes(item.id) ? "rental selected" : "rental"} key={item.id} onClick={() => toggleRental(item.id)}>
                <span>{item.name}</span>
                <small>¥{item.price}/次 · 库存 {item.stock}</small>
              </button>
            ))}
          </div>
        </section>

        <aside className="summary-panel">
          <h2>预约确认</h2>
          <p><CheckCircle2 size={18} /> {service.name} · {slot}</p>
          <div className="price-line"><span>服务费用</span><strong>¥{bookingTotal}</strong></div>
          <div className="price-line"><span>装备租赁</span><strong>¥{rentalTotal}</strong></div>
          <div className="price-line total"><span>合计</span><strong>¥{total}</strong></div>
          <button className="primary-button full">提交预约并支付</button>
          <small>提交后可通过短信和站内信发送预约编号、地点和注意事项。</small>
        </aside>
      </div>
    </div>
  );
}
