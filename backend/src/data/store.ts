export const services = [
  { id: "lane", name: "泳道预约", price: 40, unit: "hour" },
  { id: "course", name: "课程预约", price: 128, unit: "lesson" },
  { id: "private", name: "包场咨询", price: 1200, unit: "session" }
];

export const courses = [
  { id: "adult-basic", title: "成人初级班", coach: "林教练", time: "周二/周四 19:30", seats: 6, price: 128 },
  { id: "kids-summer", title: "儿童暑期班", coach: "周教练", time: "周一/三/五 10:00", seats: 4, price: 168 },
  { id: "advanced", title: "自由泳进阶", coach: "陈教练", time: "周六 15:00", seats: 8, price: 188 }
];

export const equipment = [
  { id: "goggles", name: "防雾泳镜", price: 12, deposit: 50, stock: 18 },
  { id: "cap", name: "硅胶泳帽", price: 6, deposit: 20, stock: 35 },
  { id: "float-ring", name: "儿童泳圈", price: 18, deposit: 80, stock: 12 },
  { id: "dry-bag", name: "防水袋", price: 10, deposit: 40, stock: 20 }
];

export const bookings = [
  { id: "B20260509001", serviceId: "lane", date: "2026-05-10", slot: "19:00-20:00", people: 2, status: "confirmed" }
];

export const orders = [
  { id: "O20260509001", bookingId: "B20260509001", amount: 100, status: "pending_payment", paymentMethod: "wechat" }
];
