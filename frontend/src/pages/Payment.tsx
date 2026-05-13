import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, QrCode, Smartphone, WalletCards } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

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
  createdAt?: string;
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

const EQUIPMENT_DEPOSIT = 20;
const halfHourTimeOptions = Array.from({ length: 29 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
});

function buildDateOptions(selectedDate: string) {
  const start = new Date(`${getLocalDateValue()}T00:00:00`);
  const dates = Array.from({ length: 30 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next.toISOString().slice(0, 10);
  });
  return dates.includes(selectedDate) ? dates : dates;
}

function getLocalDateValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function normalizeBookableDate(value: string | null) {
  const today = getLocalDateValue();
  return value && value >= today ? value : today;
}

function calculateLaneAmount(hours: number, people: number) {
  const billableHours = Math.max(hours, 2);
  return (40 + Math.max(billableHours - 2, 0) * 10) * people;
}

function calculateLaneAmountPerPerson(hours: number) {
  const billableHours = Math.max(hours, 2);
  return 40 + Math.max(billableHours - 2, 0) * 10;
}

function parseSlot(value: string) {
  const match = value.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  return {
    startTime: normalizeHalfHourTime(match?.[1], "09:00"),
    endTime: normalizeHalfHourTime(match?.[2], "10:00")
  };
}

function normalizeHalfHourTime(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

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

const timeValidationPattern = /时间|整点|半点|30 分钟|结束时间/;

export default function Payment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialServiceId = searchParams.get("service") ?? searchParams.get("serviceId") ?? "lane";
  const itemType = searchParams.get("type");
  const itemId = searchParams.get("item");
  const existingOrderId = searchParams.get("orderId");
  const initialSlot = searchParams.get("slot") ?? "09:00-10:00";
  const parsedInitialSlot = parseSlot(initialSlot);
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
  const isPrivateService = service.id === "private";

  const [contactName, setContactName] = useState("张三");
  const [phone, setPhone] = useState("13800138000");
  const [date, setDate] = useState(normalizeBookableDate(searchParams.get("date")));
  const [startTime, setStartTime] = useState(parsedInitialSlot.startTime);
  const [endTime, setEndTime] = useState(parsedInitialSlot.endTime);
  const [people, setPeople] = useState(Number(searchParams.get("people") ?? 1));
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
  const memberAccount = JSON.parse(localStorage.getItem("member") || "null")?.account as string | undefined;
  const memberAccountQuery = memberAccount ? `?memberAccount=${encodeURIComponent(memberAccount)}` : "";
  const slot = `${startTime}-${endTime}`;
  const hours = useMemo(() => getTimeHours(startTime, endTime), [startTime, endTime]);
  const hasValidTimeRange = service.id === "rental" || hours > 0;
  const displayOrderId = existingOrderId ?? createdOrderId;
  const laneAmountPerPerson = calculateLaneAmountPerPerson(hours);
  const laneServiceAmount = calculateLaneAmount(hours, people);
  const redirectToAuth = () => {
    navigate(`/auth?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`);
  };

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

    fetch(`/api/orders/${existingOrderId}${memberAccountQuery}`)
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
          const parsedSlot = parseSlot(booking.slot);
          setStartTime(parsedSlot.startTime);
          setEndTime(parsedSlot.endTime);
          setPeople(booking.people);
        }
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "订单加载失败");
      });
  }, [existingOrderId, loading]);

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

  useEffect(() => {
    if (hasValidTimeRange && status === "error" && timeValidationPattern.test(message)) {
      setStatus("idle");
      setMessage("");
    }
  }, [date, startTime, endTime, hasValidTimeRange, status, message]);

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
      const rentalTotal = isPrivateService ? 0 : Object.entries(rentalQuantities).reduce((sum, [id, qty]) => {
        const item = equipment.find(e => e.id === id);
        return sum + (item?.price ?? 0) * qty;
      }, 0);
      if (service.id === "lane") {
        return calculateLaneAmount(hours, people) + rentalTotal;
      }
      if (service.id === "private") {
        return service.price;
      }
      if (service.id === "rental") {
        return rentalTotal;
      }
      return service.price * people + rentalTotal;
    }
    const rentalTotal = queryRentalItems.reduce((sum, item) => sum + item.price, 0);
    if (service.id === "lane") {
      return calculateLaneAmount(hours, people) + rentalTotal;
    }
    if (service.id === "private") {
      return service.price;
    }
    return service.price * people;
  }, [existingBooking, existingOrder, hours, people, quantity, queryRentalItems, selectedCourse, selectedEquipment, service, isPrivateService]);

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
      date: service.id === "rental" ? getLocalDateValue() : date,
      slot: service.id === "rental" ? "09:00-10:00" : slot,
      people: service.id === "rental" ? 1 : people,
      hours: service.id === "rental" ? 1 : hours,
      rentalIds,
      memberAccount
    };
  };

  const createPendingOrder = async () => {
    if (!memberAccount) {
      redirectToAuth();
      throw new Error("请先登录会员账号");
    }

    if (!hasValidTimeRange) {
      throw new Error("结束时间需晚于开始时间");
    }

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBookingPayload())
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message ?? "创建订单失败");
    }
    const order = result.data.order as ExistingOrder;
    const booking = result.data.booking as ExistingBooking;
    const orderId = order.id;
    setCreatedOrderId(orderId);
    setExistingOrder(order);
    setExistingBooking(booking);
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
    if (rawMessage.includes("包场")) {
      setStatus("error");
      setMessage(rawMessage);
      return;
    }
    const isInventoryError = /不足|库存|余量|名额|容量/.test(rawMessage);
    setStatus("error");
    setMessage(isInventoryError ? "订单中有余量不足商品请重新选择商品" : rawMessage || "创建订单失败，请重新选择商品");
  };

  const payOrder = async (orderId: string) => {
    if (!memberAccount) {
      redirectToAuth();
      throw new Error("请先登录会员账号");
    }

    const response = await fetch(`/api/orders/${orderId}/payments${memberAccountQuery}`, {
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
    if (!memberAccount) {
      redirectToAuth();
      return;
    }

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
    if (!memberAccount) {
      redirectToAuth();
      return;
    }

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
    if (!memberAccount) {
      redirectToAuth();
      return;
    }

    if (existingOrderId || createdOrderId) {
      navigate("/orders");
      return;
    }

    setStatus("paying");
    setMessage("");

    try {
      const orderId = await createPendingOrder();
      setStatus("success");
      setMessage(`已生成待支付订单：${orderId}，可在订单页继续支付。`);
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
                {service.id === "course" && selectedCourse ? (
                  <div className="course-plan-note">
                    <span>课程安排</span>
                    <strong>{coursePlanLabel}</strong>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>

        <aside className="summary-panel">
          <h2>支付确认</h2>
          <div className="price-line"><span>业务类型</span><strong>{existingBooking ? serviceLabels[existingBooking.serviceId] ?? existingBooking.serviceId : businessLabel}</strong></div>
          {displayOrderId && <div className="price-line"><span>订单号</span><strong>{displayOrderId}</strong></div>}
          {existingOrder && <div className="price-line"><span>订单状态</span><strong>{orderStatusLabels[existingOrder.status] ?? existingOrder.status}</strong></div>}
          {!existingOrderId && (selectedCourse || selectedEquipment) && <div className="price-line"><span>项目名称</span><strong>{displayTitle}</strong></div>}
          {!existingOrderId && service.id !== "lane" && <div className="price-line"><span>单价</span><strong>¥{unitPrice}</strong></div>}
          {(existingBooking?.serviceId === "lane" || (!existingBooking && service.id === "lane")) && (
            <div className="deposit-info">
              <div className="price-line"><span>计费规则</span><strong>前2小时¥40/人，之后每小时+¥10/人</strong></div>
              <div className="price-line"><span>预约时长</span><strong>{formatHours(hours)}小时</strong></div>
              <div className="price-line"><span>预约人数</span><strong>{people}人</strong></div>
              <div className="price-line"><span>泳道费用</span><strong>¥{laneServiceAmount}</strong></div>
              <p className="deposit-note">每人本次泳道费用 ¥{laneAmountPerPerson}，未满 2 小时按前 2 小时计费。</p>
            </div>
          )}
          {selectedEquipment && (
            <>
              <div className="price-line"><span>数量</span><strong>{quantity}</strong></div>
              <div className="price-line"><span>租金总价</span><strong>¥{selectedEquipment.price * quantity}</strong></div>
              <div className="deposit-info">
                <div className="price-line"><span>押金（线下支付）</span><strong>¥{EQUIPMENT_DEPOSIT * quantity}</strong></div>
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
                  return item ? <li key={id}>{item.name} x {qty} = 租金 ¥{isPrivateService ? 0 : item.price * qty}</li> : null;
                })}
              </ul>
              {!isPrivateService && (
                <div className="deposit-info">
                  <div className="price-line"><span>押金（线下支付）</span><strong>¥{Object.values(rentalQuantities).reduce((sum, qty) => sum + EQUIPMENT_DEPOSIT * qty, 0)}</strong></div>
                  <p className="deposit-note">⚠️ 押金需要线下支付</p>
                </div>
              )}
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
          {isExistingOrderPayable && (
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
