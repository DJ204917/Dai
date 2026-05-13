import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export type ServiceId = "lane" | "course" | "private" | "rental";
export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "completed";
export type OrderStatus = "pending_payment" | "paid" | "refund_reviewing" | "refunded" | "cancelled";
export type PaymentMethod = "wechat" | "alipay" | "unionpay";

export interface Service {
  id: ServiceId;
  name: string;
  price: number;
  unit: "hour" | "lesson" | "session";
  capacityPerSlot: number;
  description: string;
}

export interface Course {
  id: string;
  title: string;
  coach: string;
  time: string;
  seats: number;
  enrolled: number;
  price: number;
  description: string;
}

export interface Equipment {
  id: string;
  name: string;
  price: number;
  deposit: number;
  stock: number;
  totalStock: number;
  description: string;
  depositMode: "offline" | "online_hold";
}

export interface FeeItem {
  label: string;
  amount: number;
}

export interface Booking {
  id: string;
  serviceId: ServiceId;
  courseId?: string;
  contactName: string;
  phone: string;
  date: string;
  slot: string;
  people: number;
  hours: number;
  rentalIds: string[];
  status: BookingStatus;
  amount: number;
  notes?: string;
  memberAccount?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  bookingId: string;
  amount: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  feeItems: FeeItem[];
  invoice?: {
    title: string;
    taxNo?: string;
    email: string;
    status: "requested" | "issued";
    requestedAt: string;
  };
  paidAt?: string;
  refundRequestedAt?: string;
  refundedAt?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  memberCardNo?: string;
  points: number;
}

export interface Member {
  id: string;
  account: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface StoreData {
  services: Service[];
  courses: Course[];
  equipment: Equipment[];
  users: User[];
  members: Member[];
  bookings: Booking[];
  orders: Order[];
  siteContent: Record<string, string>;
}

export const timeSlots = ["09:00-10:00", "10:00-11:00", "14:00-15:00", "16:00-17:00", "19:00-20:00", "20:00-21:00"];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = process.env.DATA_FILE_PATH
  ?? (process.env.VERCEL ? path.join("/tmp", "daiai-store.json") : path.join(__dirname, "../../data/store.json"));

function createSeedData(): StoreData {
  return {
    services: [
      { id: "lane", name: "泳道预约", price: 40, unit: "hour", capacityPerSlot: 8, description: "标准泳道按小时预约，适合个人训练和亲子陪伴。" },
      { id: "course", name: "课程预约", price: 128, unit: "lesson", capacityPerSlot: 12, description: "成人、儿童、进阶训练课程，按剩余名额预约。" },
      { id: "private", name: "包场咨询", price: 1200, unit: "session", capacityPerSlot: 60, description: "企业团建、生日派对、集训队包场申请。" },
      { id: "rental", name: "装备租赁", price: 0, unit: "session", capacityPerSlot: 999, description: "泳镜、泳帽、泳圈等装备按次租赁。" }
    ],
    courses: [
      { id: "adult-basic", title: "成人初级班", coach: "林教练", time: "周二/周四 19:30", seats: 6, enrolled: 0, price: 128, description: "适合零基础成人，重点训练换气和水中安全。" },
      { id: "kids-summer", title: "儿童暑期班", coach: "周教练", time: "周一/三/五 10:00", seats: 4, enrolled: 0, price: 168, description: "6-12 岁儿童小班教学，含基础漂浮和蛙泳入门。" },
      { id: "advanced", title: "自由泳进阶", coach: "陈教练", time: "周六 15:00", seats: 8, enrolled: 0, price: 188, description: "适合有基础学员，优化自由泳动作效率。" }
    ],
    equipment: [
      { id: "goggles", name: "防雾泳镜", price: 12, deposit: 20, stock: 18, totalStock: 18, description: "成人通用款，现场消毒后发放。", depositMode: "offline" },
      { id: "cap", name: "硅胶泳帽", price: 6, deposit: 20, stock: 35, totalStock: 35, description: "弹性舒适，适合长发用户。", depositMode: "offline" },
      { id: "float-ring", name: "儿童泳圈", price: 18, deposit: 20, stock: 12, totalStock: 12, description: "亲子陪游推荐，按次租赁。", depositMode: "offline" },
      { id: "dry-bag", name: "防水袋", price: 10, deposit: 20, stock: 20, totalStock: 20, description: "可放手机和小件物品。", depositMode: "offline" }
    ],
    users: [
      { id: "U10001", name: "示例会员", phone: "13800000000", memberCardNo: "M20260509001", points: 120 }
    ],
    members: [],
    bookings: [
      {
        id: "B20260509001",
        serviceId: "lane",
        contactName: "示例会员",
        phone: "13800000000",
        date: "2026-05-10",
        slot: "19:00-20:00",
        people: 2,
        hours: 1,
        rentalIds: ["goggles", "cap"],
        status: "confirmed",
        amount: 98,
        createdAt: "2026-05-09T08:00:00.000Z",
        updatedAt: "2026-05-09T08:05:00.000Z"
      }
    ],
    orders: [
      {
        id: "O20260509001",
        bookingId: "B20260509001",
        amount: 98,
        status: "paid",
        paymentMethod: "wechat",
        feeItems: [
          { label: "泳道预约 1小时", amount: 80 },
          { label: "防雾泳镜租赁", amount: 12 },
          { label: "硅胶泳帽租赁", amount: 6 }
        ],
        paidAt: "2026-05-09T08:05:00.000Z",
        createdAt: "2026-05-09T08:00:00.000Z"
      }
    ],
    siteContent: {
      shopName: "迪爱泳馆",
      phone: "18224358955",
      workTime: "周一至周日 08:00 - 22:00",
      address: "四川省成都市犀浦地铁站对面",
      email: "1986144233@qq.com",
      transit: "点击右侧导航到犀浦地铁站",
      customerWechat: "D1986144233"
    }
  };
}

function ensureDataDir() {
  fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
}

function normalizeData(data: Partial<StoreData>): StoreData {
  const seed = createSeedData();
  return {
    services: data.services ?? seed.services,
    courses: data.courses ?? seed.courses,
    equipment: data.equipment ?? seed.equipment,
    users: data.users ?? seed.users,
    members: data.members ?? [],
    bookings: data.bookings ?? seed.bookings,
    orders: data.orders ?? seed.orders,
    siteContent: { ...seed.siteContent, ...(data.siteContent ?? {}) }
  };
}

function loadStore(): StoreData {
  try {
    if (!fs.existsSync(dataFilePath)) {
      const seed = createSeedData();
      saveStore(seed);
      return seed;
    }

    const raw = fs.readFileSync(dataFilePath, "utf8");
    return normalizeData(JSON.parse(raw) as Partial<StoreData>);
  } catch (error) {
    console.error("Failed to load data store, using seed data", error);
    return createSeedData();
  }
}

function saveStore(nextData = data) {
  ensureDataDir();
  fs.writeFileSync(dataFilePath, JSON.stringify(nextData, null, 2));
}

const data = loadStore();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function countRentalIds(rentalIds: string[]): Record<string, number> {
  return rentalIds.reduce<Record<string, number>>((counts, id) => {
    counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, {});
}

function reserveBookingInventory(booking: Omit<Booking, "id" | "createdAt" | "updatedAt">): void {
  if (booking.serviceId === "course" && booking.courseId) {
    const course = data.courses.find((item) => item.id === booking.courseId);
    if (course) {
      course.enrolled += booking.people;
    }
  }

  for (const [equipmentId, count] of Object.entries(countRentalIds(booking.rentalIds))) {
    const item = data.equipment.find((candidate) => candidate.id === equipmentId);
    if (item) {
      item.stock = Math.max(item.stock - count, 0);
    }
  }
}

export function restoreBookingInventory(booking: Booking): void {
  if (booking.serviceId === "course" && booking.courseId) {
    const course = data.courses.find((item) => item.id === booking.courseId);
    if (course) {
      course.enrolled = Math.max(course.enrolled - booking.people, 0);
    }
  }

  for (const [equipmentId, count] of Object.entries(countRentalIds(booking.rentalIds))) {
    const item = data.equipment.find((candidate) => candidate.id === equipmentId);
    if (item) {
      item.stock = Math.min(item.stock + count, item.totalStock);
    }
  }
  saveStore();
}

export function getServices(): Service[] {
  return clone(data.services);
}

export function getCourses(): Course[] {
  return clone(data.courses);
}

export function getCourseById(id: string): Course | undefined {
  const course = data.courses.find((item) => item.id === id);
  return course ? clone(course) : undefined;
}

export function updateCourseEnrollment(id: string, enrolled: number): void {
  const course = data.courses.find((item) => item.id === id);
  if (course) {
    course.enrolled = enrolled;
    saveStore();
  }
}

export function getEquipment(): Equipment[] {
  return clone(data.equipment);
}

export function getEquipmentById(id: string): Equipment | undefined {
  const item = data.equipment.find((candidate) => candidate.id === id);
  return item ? clone(item) : undefined;
}

export function updateEquipmentStock(id: string, newStock: number): void {
  const item = data.equipment.find((candidate) => candidate.id === id);
  if (item) {
    item.stock = newStock;
    saveStore();
  }
}

export function createEquipment(input: Omit<Equipment, "id">): Equipment {
  const equipment = { id: `E${Date.now()}`, ...input };
  data.equipment.push(equipment);
  saveStore();
  return clone(equipment);
}

export function getUsers(): User[] {
  return clone(data.users);
}

export function getMemberByAccount(account: string): Member | undefined {
  const member = data.members.find((item) => item.account === account);
  return member ? clone(member) : undefined;
}

export function createMember(account: string, passwordHash: string): Member {
  const member = {
    id: `M${Date.now()}`,
    account,
    passwordHash,
    createdAt: new Date().toISOString()
  };
  data.members.push(member);
  saveStore();
  return clone(member);
}

export function updateMemberLastLogin(id: string): Member | undefined {
  const member = data.members.find((item) => item.id === id);
  if (!member) {
    return undefined;
  }

  member.lastLoginAt = new Date().toISOString();
  saveStore();
  return clone(member);
}

export function getBookings(): Booking[] {
  return clone(data.bookings);
}

export function getBookingById(id: string): Booking | undefined {
  const booking = data.bookings.find((item) => item.id === id);
  return booking ? clone(booking) : undefined;
}

export function createBooking(booking: Omit<Booking, "id" | "createdAt" | "updatedAt">): Booking {
  const now = new Date().toISOString();
  const nextBooking = {
    id: `B${Date.now()}`,
    ...booking,
    createdAt: now,
    updatedAt: now
  };

  data.bookings.push(nextBooking);
  reserveBookingInventory(booking);
  saveStore();
  return clone(nextBooking);
}

export function updateBooking(id: string, updates: Partial<Booking>): Booking | undefined {
  const booking = data.bookings.find((item) => item.id === id);
  if (!booking) {
    return undefined;
  }

  Object.assign(booking, updates, { updatedAt: new Date().toISOString() });
  saveStore();
  return clone(booking);
}

export function getOrders(): Order[] {
  return clone(data.orders);
}

export function getOrderById(id: string): Order | undefined {
  const order = data.orders.find((item) => item.id === id);
  return order ? clone(order) : undefined;
}

export function createOrder(order: Omit<Order, "id" | "createdAt">): Order {
  const nextOrder = {
    id: `O${Date.now()}`,
    ...order,
    createdAt: new Date().toISOString()
  };
  data.orders.push(nextOrder);
  saveStore();
  return clone(nextOrder);
}

export function updateOrder(id: string, updates: Partial<Order>): Order | undefined {
  const order = data.orders.find((item) => item.id === id);
  if (!order) {
    return undefined;
  }

  Object.assign(order, updates);
  saveStore();
  return clone(order);
}

export function getSiteContent(): Record<string, string> {
  return clone(data.siteContent);
}

export const services = getServices();
export const courses = getCourses();
export const equipment = getEquipment();
export const users = getUsers();
export const bookings = getBookings();
export const orders = getOrders();
export const siteContent = getSiteContent();
