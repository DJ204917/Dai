import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface Service {
  id: string;
  name: string;
  price: number;
  unit: string;
  capacityPerSlot: number;
  description: string;
}

interface Equipment {
  id: string;
  name: string;
  price: number;
  deposit: number;
  stock: number;
}

function calculateLaneAmount(hours: number, people: number) {
  const billableHours = Math.max(hours, 2);
  return (40 + Math.max(billableHours - 2, 0) * 10) * people;
}

function calculateLaneAmountPerPerson(hours: number) {
  const billableHours = Math.max(hours, 2);
  return 40 + Math.max(billableHours - 2, 0) * 10;
}

function getLocalDateValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

const halfHourTimeOptions = Array.from({ length: 29 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
});

function normalizeHalfHourTime(value: string, fallback: string) {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return fallback;
  }

  const minMinutes = 8 * 60;
  const maxMinutes = 22 * 60;
  const roundedMinutes = Math.ceil((hour * 60 + minute) / 30) * 30;
  const boundedMinutes = Math.min(Math.max(roundedMinutes, minMinutes), maxMinutes);
  const normalizedHour = String(Math.floor(boundedMinutes / 60)).padStart(2, "0");
  const normalizedMinute = String(boundedMinutes % 60).padStart(2, "0");
  return `${normalizedHour}:${normalizedMinute}`;
}

function getTimeHours(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const minutes = end - start;
  return minutes > 0 ? Math.ceil(minutes / 30) / 2 : 0;
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function Booking() {
  const today = getLocalDateValue();
  const [services, setServices] = useState<Service[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [serviceId, setServiceId] = useState("lane");
  const [people, setPeople] = useState(2);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [date, setDate] = useState(today);
  const [rentalQuantities, setRentalQuantities] = useState<Record<string, number>>({ goggles: 1 });

  useEffect(() => {
    const loadCatalog = async () => {
      const [servicesResponse, equipmentResponse] = await Promise.all([
        apiFetch("/api/services"),
        apiFetch("/api/equipment")
      ]);
      const [servicesResult, equipmentResult] = await Promise.all([
        servicesResponse.json(),
        equipmentResponse.json()
      ]);
      setServices(servicesResult.data ?? []);
      setEquipment(equipmentResult.data ?? []);
    };

    loadCatalog().catch((error) => {
      console.error("Failed to load booking catalog", error);
    });
  }, []);

  useEffect(() => {
    const normalizedStart = normalizeHalfHourTime(startTime, "09:00");
    const normalizedEnd = normalizeHalfHourTime(endTime, "10:00");
    if (normalizedStart !== startTime) {
      setStartTime(normalizedStart);
    }
    if (normalizedEnd !== endTime) {
      setEndTime(normalizedEnd);
    }
  }, [startTime, endTime]);

  const service = services.find((item) => item.id === serviceId) ?? services[0] ?? { id: "lane", name: "泳道预约", price: 0, unit: "hour", capacityPerSlot: 0, description: "" };
  const slot = `${startTime}-${endTime}`;
  const hours = useMemo(() => getTimeHours(startTime, endTime), [startTime, endTime]);
  const hasValidTimeRange = hours > 0;
  const laneAmountPerPerson = calculateLaneAmountPerPerson(hours);
  const shouldChargeRentals = service.id !== "private";
  const rentalTotal = shouldChargeRentals ? equipment.reduce((sum, item) => sum + item.price * (rentalQuantities[item.id] ?? 0), 0) : 0;
  const bookingTotal = useMemo(() => {
    if (service.id === "lane") {
      return calculateLaneAmount(hours, people);
    }
    if (service.id === "private") {
      return service.price;
    }
    return service.price * people;
  }, [hours, people, service]);
  const total = bookingTotal + rentalTotal;
  const rentalParam = equipment
    .filter((item) => (rentalQuantities[item.id] ?? 0) > 0)
    .map((item) => `${item.id}:${rentalQuantities[item.id]}`)
    .join(",");

  const updateRentalQuantity = (item: Equipment, quantity: number) => {
    const nextQuantity = Math.min(Math.max(quantity, 0), item.stock);
    setRentalQuantities((current) => ({
      ...current,
      [item.id]: nextQuantity
    }));
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
              <input min={today} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label>
              开始时间
              <select value={startTime} onChange={(event) => setStartTime(event.target.value)}>
                {halfHourTimeOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              结束时间
              <select value={endTime} onChange={(event) => setEndTime(event.target.value)}>
                {halfHourTimeOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              人数
              <input min={1} type="number" value={people} onChange={(event) => setPeople(Number(event.target.value))} />
            </label>
            <div className={hasValidTimeRange ? "time-duration-note" : "time-duration-note invalid"}>
              <span>预约时长</span>
              <strong>{hasValidTimeRange ? `共 ${formatHours(hours)} 小时` : "结束时间需晚于开始时间"}</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>是否租赁装备</h2>
          <div className="rental-picker">
            {equipment.map((item) => (
              <div className={(rentalQuantities[item.id] ?? 0) > 0 ? "rental selected rental-with-quantity" : "rental rental-with-quantity"} key={item.id}>
                <div>
                  <span>{item.name}</span>
                  <small>¥{item.price}/次 · 库存 {item.stock}</small>
                </div>
                <div className="rental-quantity">
                  <button type="button" onClick={() => updateRentalQuantity(item, (rentalQuantities[item.id] ?? 0) - 1)}>-</button>
                  <input
                    min={0}
                    max={item.stock}
                    type="number"
                    value={rentalQuantities[item.id] ?? 0}
                    onChange={(event) => updateRentalQuantity(item, Number(event.target.value))}
                  />
                  <button type="button" onClick={() => updateRentalQuantity(item, (rentalQuantities[item.id] ?? 0) + 1)}>+</button>
                  <strong>¥{shouldChargeRentals ? item.price * (rentalQuantities[item.id] ?? 0) : 0}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="summary-panel">
          <h2>预约确认</h2>
          <p><CheckCircle2 size={18} /> {service.name} · {slot}</p>
          <div className="price-line"><span>预约时长</span><strong>{hasValidTimeRange ? `${formatHours(hours)}小时` : "-"}</strong></div>
          {service.id === "lane" && (
            <>
              <div className="price-line"><span>计费规则</span><strong>前2小时¥40/人，之后每小时+¥10/人</strong></div>
              <small>每人本次泳道费用 ¥{laneAmountPerPerson}，未满 2 小时按前 2 小时计费。</small>
            </>
          )}
          <div className="price-line"><span>服务费用</span><strong>¥{bookingTotal}</strong></div>
          <div className="price-line"><span>装备租赁</span><strong>¥{rentalTotal}</strong></div>
          <div className="price-line total"><span>合计</span><strong>¥{total}</strong></div>
          {hasValidTimeRange ? (
            <Link className="primary-button full" to={`/payment?service=${serviceId}&date=${date}&slot=${encodeURIComponent(slot)}&people=${people}&hours=${hours}&rentals=${rentalParam}`}>
              提交预约并支付
            </Link>
          ) : (
            <button className="primary-button full" disabled type="button">请选择有效时间</button>
          )}
          <small>提交后可通过短信和站内信发送预约编号、地点和注意事项。</small>
        </aside>
      </div>
    </div>
  );
}
