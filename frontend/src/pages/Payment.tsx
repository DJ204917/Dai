import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, QrCode, Smartphone, WalletCards } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { timeSlots } from "../data/mock";

type PaymentMethod = "wechat" | "alipay";

interface Service {
  id: string;
  name: string;
  price: number;
  unit: string;
  capacityPerSlot: number;
  description: string;
}

interface Course {
  id: string;
  title: string;
  coach: string;
  time: string;
  seats: number;
  enrolled: number;
  price: number;
  image?: string;
  intro?: string;
  highlights?: string[];
  remainingSeats: number;
}

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

interface ExistingOrder {
  id: string;
  amount: number;
  status: string;
}

interface ExistingBooking {
  id: string;
  serviceId: string;
  courseId?: string;
  contactName: string;
  phone: string;
  date: string;
  slot: string;
  people: number;
  hours: number;
  rentalIds: string[];
}

const paymentLabels: Record<PaymentMethod, string> = {
  wechat: "微信支付",
  alipay: "支付宝"
};

const serviceLabels: Record<string, string> = {
  lane: "泳道预约",
  course: "课程预约",
  private: "包场咨询",
  rental: "装备租赁"
};

const orderStatusLabels: Record<string, string> = {
  pending_payment: "待支付",
  paid: "已支付",
  refund_reviewing: "退款审核中",
  refunded: "已退款",
  cancelled: "已取消"
};

const coursePlanLabels: Record<string, string> = {
  "adult-basic": "一个月 10 节课，一天 3h",
  "kids-summer": "一个月 20 节课，一天 2h",
  advanced: "一个月 10 节课，一节课 4h"
};

function buildDateOptions(selectedDate: string) {
  const start = new Date("2026-05-09T00:00:00");
  const dates = Array.from({ length: 30 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next.toISOString().slice(0, 10);
  });
  return dates.includes(selectedDate) ? dates : [selectedDate, ...dates];
}

function calculateLaneAmount(hours: number, people: number) {
  const billableHours = Math.max(hours, 2);
  return (40 + Math.max(billableHours - 2, 0) * 10) * people;
}

export default function Payment() {
  const [searchParams] = useSearchParams();
  const initialServiceId = searchParams.get("service") ?? searchParams.get("serviceId") ?? "lane";
  const itemType = searchParams.get("type");
  const itemId = searchParams.get("item");
  const existingOrderId = searchParams.get("orderId");
  const rentalIdsParam = searchParams.get("rentalIds") ?? searchParams.get("rentals");
  const rentalQuantities: Record<string, number> = {};
  const rentalIds: string[] = [];
  if (rentalIdsParam) {
    rentalIdsParam.split(',').filter(Boolean).forEach(pair => {
      const [id, qty] = pair.split(':');
      if (qty === undefined) {
        rentalIds.push(id);
      } else {
        rentalQuantities[id] = parseInt(qty) || 0;
      }
    });
  }

  const [services, setServices] = useState<Service[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  const rentalService = { id: "rental", name: "装备租赁", price: 0, unit: "次" };
  const service = initialServiceId === "rental" ? rentalService : services.find((item) => item.id === initialServiceId) ?? rentalService;
  const selectedCourse = itemType === "course" ? courses.find((item) => item.id === itemId) : undefined;
  const selectedEquipment = itemType === "equipment" ? equipment.find((item) => item.id === itemId) : undefined;
  const queryRentalItems = rentalIds.map(id => equipment.find(item => item.id === id)).filter(Boolean) as Equipment[];
  const displayTitle = selectedCourse?.title ?? selectedEquipment?.name ?? service.name;
  const businessLabel = selectedEquipment ? "装备租赁" : service.name;
  const unitPrice = selectedCourse?.price ?? selectedEquipment?.price ?? service.price;
  const coursePlanLabel = selectedCourse ? coursePlanLabels[selectedCourse.id] : "";
  const isMobileClient = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const [contactName, setContactName] = useState("张三");
  const [phone, setPhone] = useState("13800138000");
  const [date, setDate] = useState(searchParams.get("date") ?? "2026-05-12");
  const [slot, setSlot] = useState(searchParams.get("slot") ?? timeSlots[0]);
  const [people, setPeople] = useState(Number(searchParams.get("people") ?? 1));
  const [hours, setHours] = useState(Math.max(Number(searchParams.get("hours") ?? 2), 2));
  const [quantity, setQuantity] = useState(Number(searchParams.get("quantity") ?? 1));
  const [method, setMethod] = useState<PaymentMethod>("wechat");
  const [status, setStatus] = useState<"idle" | "paying" | "success" | "error" | "info">("idle");
  const [message, setMessage] = useState("");
  const [existingOrder, setExistingOrder] = useState<ExistingOrder | null>(null);
  const [existingBooking, setExistingBooking] = useState<ExistingBooking | null>(null);
  const [showWechatReceiptCode, setShowWechatReceiptCode] = useState(false);
  const [receiptCodeVersion, setReceiptCodeVersion] = useState(Date.now());
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const isExistingOrderPayable = !existingOrder || existingOrder.status === "pending_payment";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesResponse, coursesResponse, equipmentResponse] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/courses"),
          fetch("/api/equipment")
        ]);
        const [servicesResult, coursesResult, equipmentResult] = await Promise.all([
          servicesResponse.json(),
          coursesResponse.json(),
          equipmentResponse.json()
        ]);
        setServices(servicesResult.data ?? []);
        setCourses(coursesResult.data ?? []);
        setEquipment(equipmentResult.data ?? []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!existingOrderId || loading) {
      return;
    }

    fetch(`/api/orders/${existingOrderId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("订单不存在");
        }
        return response.json();
      })
      .then((result) => {
        const order = result.data.order;
        const booking = result.data.booking;
        setExistingOrder(order);
        setExistingBooking(booking);
        if (order.status !== "pending_payment") {
          setMessage(`订单当前为${orderStatusLabels[order.status] ?? order.status}，无需重复支付。`);
        }
        if (booking) {
          setContactName(booking.contactName);
          setPhone(booking.phone);
          setDate(booking.date);
          setSlot(booking.slot);
          setPeople(booking.people);
          setHours(booking.hours);
        }
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "订单加载失败");
      });
  }, [existingOrderId, loading]);

  const dateOptions = useMemo(() => buildDateOptions(date), [date]);

  const total = useMemo(() => {
    if (existingBooking) {
      const existingRentalTotal = existingBooking.rentalIds.reduce((sum, rentalId) => {
        return sum + (equipment.find((item) => item.id === rentalId)?.price ?? 0);
      }, 0);
      if (existingBooking.serviceId === "lane") {
        return calculateLaneAmount(hours, people) + existingRentalTotal;
      }
      if (existingBooking.serviceId === "course") {
        const course = courses.find((item) => item.id === existingBooking.courseId) ?? courses[0];
        return course.price * people;
      }
      if (existingBooking.serviceId === "private") {
        return 1200;
      }
      if (existingBooking.serviceId === "rental") {
        const rentalTotal = existingBooking.rentalIds.reduce((sum, rentalId) => {
          const item = equipment.find(e => e.id === rentalId);
          return sum + (item?.price ?? 0);
        }, 0);
        return rentalTotal;
      }
      return existingOrder?.amount ?? 0;
    }
    if (selectedCourse) {
      return selectedCourse.price * people;
    }
    if (selectedEquipment) {
      return selectedEquipment.price * quantity;
    }
    if (Object.keys(rentalQuantities).length > 0) {
      return Object.entries(rentalQuantities).reduce((sum, [id, qty]) => {
        const item = equipment.find(e => e.id === id);
        return sum + (item?.price ?? 0) * qty;
      }, 0);
    }
    const rentalTotal = queryRentalItems.reduce((sum, item) => sum + item.price, 0);
    if (service.id === "lane") {
      return calculateLaneAmount(hours, people) + rentalTotal;
    }
    if (service.id === "private") {
      return service.price;
    }
    return service.price * people;
  }, [existingBooking, existingOrder, hours, people, quantity, queryRentalItems, selectedCourse, selectedEquipment, service]);

  const buildBookingPayload = () => {
    const rentalIds: string[] = [];
    if (selectedEquipment) {
      for (let i = 0; i < quantity; i++) {
        rentalIds.push(selectedEquipment.id);
      }
    } else if (Object.keys(rentalQuantities).length > 0) {
      Object.entries(rentalQuantities).forEach(([id, qty]) => {
        for (let i = 0; i < qty; i++) {
          rentalIds.push(id);
        }
      });
    } else {
      rentalIds.push(...queryRentalItems.map(item => item.id));
    }

    return {
      serviceId: service.id,
      courseId: service.id === "course" ? selectedCourse?.id ?? "adult-basic" : undefined,
      contactName,
      phone,
      date: service.id === "rental" ? new Date().toISOString().slice(0, 10) : date,
      slot: service.id === "rental" ? "09:00-10:00" : slot,
      people: service.id === "rental" ? 1 : people,
      hours: service.id === "rental" ? 1 : Math.max(hours, service.id === "lane" ? 2 : 1),
      rentalIds
    };
  };

  const createPendingOrder = async () => {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBookingPayload())
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message ?? "创建订单失败");
    }
    const orderId = result.data.order.id as string;
    setCreatedOrderId(orderId);
    return orderId;
  };

  const syncExistingOrder = async () => {
    if (!existingOrderId || !existingBooking) {
      return existingOrderId;
    }

    return existingOrderId;
  };

  const getPayableOrderId = async () => {
    if (existingOrderId) {
      return syncExistingOrder();
    }
    if (createdOrderId) {
      return createdOrderId;
    }
    return createPendingOrder();
  };

  const showInsufficientInventoryMessage = (error: unknown) => {
    const rawMessage = error instanceof Error ? error.message : "";
    const isInventoryError = /不足|库存|余量|名额|容量/.test(rawMessage);
    setStatus("error");
    setMessage(isInventoryError ? "订单中有余量不足商品请重新选择商品" : rawMessage || "创建订单失败，请重新选择商品");
  };

  const payOrder = async (orderId: string) => {
    const response = await fetch(`/api/orders/${orderId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message ?? "支付失败，请稍后重试");
    }
    return result.data.order.id as string;
  };

  const handlePay = async () => {
    if (existingOrder && existingOrder.status !== "pending_payment") {
      setStatus("error");
      setMessage(`订单当前为${orderStatusLabels[existingOrder.status] ?? existingOrder.status}，不可重复支付。`);
      return;
    }

    if (method === "wechat") {
      try {
        const orderId = await getPayableOrderId();
        if (!orderId) {
          throw new Error("订单号缺失");
        }
        setShowWechatReceiptCode(true);
        setReceiptCodeVersion(Date.now());
        setStatus("info");
        setMessage(showWechatReceiptCode ? "收款码已刷新，请使用微信扫描支付。" : "请使用微信扫描收款码完成支付。");
      } catch (error) {
        setShowWechatReceiptCode(false);
        showInsufficientInventoryMessage(error);
      }
      return;
    }

    setStatus("paying");
    setMessage(isMobileClient ? `正在请求${paymentLabels[method]}应用支付权限...` : `已生成${paymentLabels[method]}二维码，请扫码支付...`);

    try {
      const orderId = await getPayableOrderId();
      if (!orderId) {
        throw new Error("订单号缺失");
      }
      await payOrder(orderId);
      setStatus("success");
      setMessage(`支付成功，订单号：${orderId}`);
    } catch (error) {
      showInsufficientInventoryMessage(error);
    }
  };

  const handleWechatPaymentComplete = async () => {
    setStatus("paying");
    setMessage("正在确认支付结果...");

    try {
      const orderId = await getPayableOrderId();
      if (!orderId) {
        throw new Error("订单号缺失");
      }
      await payOrder(orderId);
      setExistingOrder((current) => current ? { ...current, status: "paid" } : current);
      setStatus("success");
      setMessage(`支付成功，订单号：${orderId}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "支付确认失败，请稍后重试");
    }
  };

  const handlePayLater = async () => {
    setStatus("paying");
    setMessage("");

    try {
      const orderId = await createPendingOrder();
      setStatus("success");
      setMessage(`已生成待支付订单：${orderId}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "创建待支付订单失败");
    }
  };

  return (
    <div className="page compact-page">
      <section className="section-heading">
        <p className="eyebrow">在线支付</p>
        <h1>{existingOrderId && !isExistingOrderPayable ? "订单详情" : existingOrderId ? "继续支付订单" : displayTitle}</h1>
      </section>

      <div className="payment-layout">
        <section className="panel">
          <h2>预约信息</h2>
          <div className="form-grid">
            <label>
              联系人
              <input value={contactName} onChange={(event) => setContactName(event.target.value)} />
            </label>
            <label>
              手机号
              <input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            {selectedEquipment && (
              <label>
                数量
                <input min={1} type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
              </label>
            )}
            {service.id !== "rental" && (
              <>
                <label>
                  日期
                  <select value={date} onChange={(event) => setDate(event.target.value)}>
                    {dateOptions.map((item) => <option key={item}>{item}</option>)}
                  </select>
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
                {service.id === "course" && selectedCourse ? (
                  <div className="course-plan-note">
                    <span>课程安排</span>
                    <strong>{coursePlanLabel}</strong>
                  </div>
                ) : (
                  <label>
                    时长
                    <input min={service.id === "lane" ? 2 : 1} type="number" value={hours} onChange={(event) => setHours(Math.max(Number(event.target.value), service.id === "lane" ? 2 : 1))} />
                  </label>
                )}
              </>
            )}
          </div>
        </section>

        <aside className="summary-panel">
          <h2>支付确认</h2>
          <div className="price-line"><span>业务类型</span><strong>{existingBooking ? serviceLabels[existingBooking.serviceId] ?? existingBooking.serviceId : businessLabel}</strong></div>
          {existingOrderId && <div className="price-line"><span>订单号</span><strong>{existingOrderId}</strong></div>}
          {existingOrder && <div className="price-line"><span>订单状态</span><strong>{orderStatusLabels[existingOrder.status] ?? existingOrder.status}</strong></div>}
          {!existingOrderId && (selectedCourse || selectedEquipment) && <div className="price-line"><span>项目名称</span><strong>{displayTitle}</strong></div>}
          {!existingOrderId && <div className="price-line"><span>单价</span><strong>¥{unitPrice}</strong></div>}
          {selectedEquipment && (
            <>
              <div className="price-line"><span>数量</span><strong>{quantity}</strong></div>
              <div className="price-line"><span>租金总价</span><strong>¥{selectedEquipment.price * quantity}</strong></div>
              <div className="deposit-info">
                <div className="price-line"><span>押金（线下支付）</span><strong>¥{selectedEquipment.deposit * quantity}</strong></div>
                <p className="deposit-note">⚠️ 押金需要线下支付</p>
              </div>
            </>
          )}
          {!existingOrderId && queryRentalItems.length > 0 && Object.keys(rentalQuantities).length === 0 && (
            <div className="price-line"><span>装备租赁</span><strong>¥{queryRentalItems.reduce((sum, item) => sum + item.price, 0)}</strong></div>
          )}
          {Object.keys(rentalQuantities).length > 0 && (
            <div>
              <span>租赁清单</span>
              <ul>
                {Object.entries(rentalQuantities).map(([id, qty]) => {
                  const item = equipment.find(e => e.id === id);
                  return item ? <li key={id}>{item.name} x {qty} = 租金 ¥{item.price * qty}</li> : null;
                })}
              </ul>
              <div className="deposit-info">
                <div className="price-line"><span>押金（线下支付）</span><strong>¥{Object.entries(rentalQuantities).reduce((sum, [id, qty]) => {
                  const item = equipment.find(e => e.id === id);
                  return sum + (item?.deposit ?? 0) * qty;
                }, 0)}</strong></div>
                <p className="deposit-note">⚠️ 押金需要线下支付</p>
              </div>
            </div>
          )}
          <div className="price-line"><span>支付金额</span><strong>¥{total}</strong></div>
          <div className="payment-methods" aria-label="选择支付方式">
            {(["wechat", "alipay"] as PaymentMethod[]).map((item) => (
              <button className={method === item ? "payment-method selected" : "payment-method"} key={item} onClick={() => {
                setMethod(item);
                setShowWechatReceiptCode(false);
                setMessage("");
                setStatus("idle");
              }}>
                {item === "wechat" ? <WalletCards size={20} /> : <CreditCard size={20} />}
                <span>{paymentLabels[item]}</span>
              </button>
            ))}
          </div>
          <div className={showWechatReceiptCode && method === "wechat" ? "payment-channel receipt-code-channel" : "payment-channel"}>
            {showWechatReceiptCode && method === "wechat" ? (
              <>
                <img className="wechat-receipt-code" src={`/payments/wechat-receipt.jpg?v=${receiptCodeVersion}`} alt="微信收款码" />
                <div>
                  <strong>微信收款码支付</strong>
                  <span>请打开微信扫一扫，付款后可到订单页查看状态。</span>
                </div>
              </>
            ) : isMobileClient ? (
              <>
                <Smartphone size={24} />
                <div>
                  <strong>{paymentLabels[method]} App 支付</strong>
                  <span>移动端会尝试唤起手机应用授权支付。</span>
                </div>
              </>
            ) : (
              <>
                <div className="mock-qr" aria-hidden="true">
                  <QrCode size={42} />
                </div>
                <div>
                  <strong>{paymentLabels[method]}扫码支付</strong>
                  <span>当前为浏览器客户端，请使用手机扫码完成支付。</span>
                </div>
              </>
            )}
          </div>
          <button className="primary-button full" disabled={status === "paying" || !isExistingOrderPayable} onClick={handlePay}>
            {!isExistingOrderPayable ? "已完成支付" : status === "paying" ? "支付处理中..." : method === "wechat" && showWechatReceiptCode ? "刷新收款码" : isMobileClient ? `唤起${paymentLabels[method]}` : `生成${paymentLabels[method]}二维码`}
          </button>
          {showWechatReceiptCode && method === "wechat" && isExistingOrderPayable && (
            <button className="secondary-pay-button" disabled={status === "paying"} onClick={handleWechatPaymentComplete}>
              我已完成支付
            </button>
          )}
          {!existingOrderId && (
            <button className="secondary-pay-button" disabled={status === "paying"} onClick={handlePayLater}>
              稍后支付
            </button>
          )}
          {message && (
            <div className={status === "success" || status === "info" ? "payment-result success" : "payment-result error"}>
              {status === "success" && <CheckCircle2 size={18} />}
              <span>{message}</span>
            </div>
          )}
          <Link className="secondary-link" to="/orders">查看订单</Link>
        </aside>
      </div>
    </div>
  );
}
