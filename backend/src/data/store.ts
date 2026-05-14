import { neon } from "@neondatabase/serverless";
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

type Sql = any;

export const timeSlots = ["09:00-10:00", "10:00-11:00", "14:00-15:00", "16:00-17:00", "19:00-20:00", "20:00-21:00"];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.NEON_DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : undefined;
const dataFilePath = process.env.DATA_FILE_PATH
  ?? (process.env.VERCEL ? path.join("/tmp", "daiai-store.json") : path.join(__dirname, "../../data/store.json"));

let postgresReady: Promise<void> | undefined;

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

function loadLocalStore(): StoreData {
  try {
    if (!fs.existsSync(dataFilePath)) {
      const seed = createSeedData();
      saveLocalStore(seed);
      return seed;
    }

    const raw = fs.readFileSync(dataFilePath, "utf8");
    return normalizeData(JSON.parse(raw) as Partial<StoreData>);
  } catch (error) {
    console.error("Failed to load local data store, using seed data", error);
    return createSeedData();
  }
}

function saveLocalStore(nextData = localData) {
  ensureDataDir();
  fs.writeFileSync(dataFilePath, JSON.stringify(nextData, null, 2));
}

const localData = sql ? createSeedData() : loadLocalStore();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function jsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "string" && value.length > 0) {
    return JSON.parse(value) as T[];
  }
  return [];
}

function mapService(row: any): Service {
  return {
    id: row.id as ServiceId,
    name: row.name,
    price: Number(row.price),
    unit: row.unit,
    capacityPerSlot: Number(row.capacity_per_slot),
    description: row.description
  };
}

function mapCourse(row: any): Course {
  return {
    id: row.id,
    title: row.title,
    coach: row.coach,
    time: row.time,
    seats: Number(row.seats),
    enrolled: Number(row.enrolled),
    price: Number(row.price),
    description: row.description
  };
}

function mapEquipment(row: any): Equipment {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    deposit: Number(row.deposit),
    stock: Number(row.stock),
    totalStock: Number(row.total_stock),
    description: row.description,
    depositMode: row.deposit_mode
  };
}

function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    memberCardNo: optionalString(row.member_card_no),
    points: Number(row.points)
  };
}

function mapMember(row: any): Member {
  return {
    id: row.id,
    account: row.account,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    lastLoginAt: optionalString(row.last_login_at)
  };
}

function mapBooking(row: any): Booking {
  return {
    id: row.id,
    serviceId: row.service_id,
    courseId: optionalString(row.course_id),
    contactName: row.contact_name,
    phone: row.phone,
    date: row.date,
    slot: row.slot,
    people: Number(row.people),
    hours: Number(row.hours),
    rentalIds: jsonArray<string>(row.rental_ids),
    status: row.status,
    amount: Number(row.amount),
    notes: optionalString(row.notes),
    memberAccount: optionalString(row.member_account),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapOrder(row: any): Order {
  return {
    id: row.id,
    bookingId: row.booking_id,
    amount: Number(row.amount),
    status: row.status,
    paymentMethod: optionalString(row.payment_method) as PaymentMethod | undefined,
    feeItems: jsonArray<FeeItem>(row.fee_items),
    invoice: row.invoice_title ? {
      title: row.invoice_title,
      taxNo: optionalString(row.invoice_tax_no),
      email: row.invoice_email,
      status: row.invoice_status ?? "requested",
      requestedAt: row.invoice_requested_at ?? row.created_at
    } : undefined,
    paidAt: optionalString(row.paid_at),
    refundRequestedAt: optionalString(row.refund_requested_at),
    refundedAt: optionalString(row.refunded_at),
    createdAt: row.created_at
  };
}

async function ensurePostgresReady(client: Sql) {
  if (!postgresReady) {
    postgresReady = initializePostgres(client);
  }
  await postgresReady;
}

async function initializePostgres(client: Sql) {
  await client`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      unit TEXT NOT NULL,
      capacity_per_slot INTEGER NOT NULL,
      description TEXT NOT NULL
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      coach TEXT NOT NULL,
      time TEXT NOT NULL,
      seats INTEGER NOT NULL,
      enrolled INTEGER NOT NULL DEFAULT 0,
      price INTEGER NOT NULL,
      description TEXT NOT NULL
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      deposit INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      total_stock INTEGER NOT NULL,
      description TEXT NOT NULL,
      deposit_mode TEXT NOT NULL DEFAULT 'offline'
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      member_card_no TEXT,
      points INTEGER NOT NULL DEFAULT 0
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      account TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL REFERENCES services(id),
      course_id TEXT,
      contact_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      date TEXT NOT NULL,
      slot TEXT NOT NULL,
      people INTEGER NOT NULL,
      hours NUMERIC NOT NULL,
      rental_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL,
      amount INTEGER NOT NULL,
      notes TEXT,
      member_account TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      payment_method TEXT,
      fee_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      invoice_title TEXT,
      invoice_tax_no TEXT,
      invoice_email TEXT,
      invoice_status TEXT,
      invoice_requested_at TEXT,
      paid_at TEXT,
      refund_requested_at TEXT,
      refunded_at TEXT,
      created_at TEXT NOT NULL
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;

  const seed = createSeedData();
  for (const service of seed.services) {
    await client`
      INSERT INTO services (id, name, price, unit, capacity_per_slot, description)
      VALUES (${service.id}, ${service.name}, ${service.price}, ${service.unit}, ${service.capacityPerSlot}, ${service.description})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  for (const course of seed.courses) {
    await client`
      INSERT INTO courses (id, title, coach, time, seats, enrolled, price, description)
      VALUES (${course.id}, ${course.title}, ${course.coach}, ${course.time}, ${course.seats}, ${course.enrolled}, ${course.price}, ${course.description})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  for (const item of seed.equipment) {
    await client`
      INSERT INTO equipment (id, name, price, deposit, stock, total_stock, description, deposit_mode)
      VALUES (${item.id}, ${item.name}, ${item.price}, ${item.deposit}, ${item.stock}, ${item.totalStock}, ${item.description}, ${item.depositMode})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  for (const user of seed.users) {
    await client`
      INSERT INTO users (id, name, phone, member_card_no, points)
      VALUES (${user.id}, ${user.name}, ${user.phone}, ${user.memberCardNo ?? null}, ${user.points})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  for (const booking of seed.bookings) {
    await client`
      INSERT INTO bookings (id, service_id, course_id, contact_name, phone, date, slot, people, hours, rental_ids, status, amount, notes, member_account, created_at, updated_at)
      VALUES (${booking.id}, ${booking.serviceId}, ${booking.courseId ?? null}, ${booking.contactName}, ${booking.phone}, ${booking.date}, ${booking.slot}, ${booking.people}, ${booking.hours}, ${JSON.stringify(booking.rentalIds)}::jsonb, ${booking.status}, ${booking.amount}, ${booking.notes ?? null}, ${booking.memberAccount ?? null}, ${booking.createdAt}, ${booking.updatedAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  for (const order of seed.orders) {
    await client`
      INSERT INTO orders (id, booking_id, amount, status, payment_method, fee_items, invoice_title, invoice_tax_no, invoice_email, invoice_status, invoice_requested_at, paid_at, refund_requested_at, refunded_at, created_at)
      VALUES (${order.id}, ${order.bookingId}, ${order.amount}, ${order.status}, ${order.paymentMethod ?? null}, ${JSON.stringify(order.feeItems)}::jsonb, ${order.invoice?.title ?? null}, ${order.invoice?.taxNo ?? null}, ${order.invoice?.email ?? null}, ${order.invoice?.status ?? null}, ${order.invoice?.requestedAt ?? null}, ${order.paidAt ?? null}, ${order.refundRequestedAt ?? null}, ${order.refundedAt ?? null}, ${order.createdAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  for (const [key, value] of Object.entries(seed.siteContent)) {
    await client`
      INSERT INTO site_content (key, value)
      VALUES (${key}, ${value})
      ON CONFLICT (key) DO NOTHING
    `;
  }
}

async function withPostgres<T>(handler: (client: Sql) => Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
  if (!sql) {
    return fallback();
  }

  await ensurePostgresReady(sql);
  return handler(sql);
}

function countRentalIds(rentalIds: string[]): Record<string, number> {
  return rentalIds.reduce<Record<string, number>>((counts, id) => {
    counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, {});
}

async function reserveBookingInventory(booking: Omit<Booking, "id" | "createdAt" | "updatedAt">): Promise<void> {
  if (booking.serviceId === "course" && booking.courseId) {
    const course = await getCourseById(booking.courseId);
    if (course) {
      await updateCourseEnrollment(course.id, course.enrolled + booking.people);
    }
  }

  for (const [equipmentId, count] of Object.entries(countRentalIds(booking.rentalIds))) {
    const item = await getEquipmentById(equipmentId);
    if (item) {
      await updateEquipmentStock(equipmentId, Math.max(item.stock - count, 0));
    }
  }
}

export async function restoreBookingInventory(booking: Booking): Promise<void> {
  if (booking.serviceId === "course" && booking.courseId) {
    const course = await getCourseById(booking.courseId);
    if (course) {
      await updateCourseEnrollment(course.id, Math.max(course.enrolled - booking.people, 0));
    }
  }

  for (const [equipmentId, count] of Object.entries(countRentalIds(booking.rentalIds))) {
    const item = await getEquipmentById(equipmentId);
    if (item) {
      await updateEquipmentStock(equipmentId, Math.min(item.stock + count, item.totalStock));
    }
  }
}

export async function getServices(): Promise<Service[]> {
  return withPostgres(
    async (client) => (await client`SELECT * FROM services ORDER BY id`).map(mapService),
    () => clone(localData.services)
  );
}

export async function getCourses(): Promise<Course[]> {
  return withPostgres(
    async (client) => (await client`SELECT * FROM courses ORDER BY id`).map(mapCourse),
    () => clone(localData.courses)
  );
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  return withPostgres(
    async (client) => {
      const rows = await client`SELECT * FROM courses WHERE id = ${id} LIMIT 1`;
      return rows[0] ? mapCourse(rows[0]) : undefined;
    },
    () => {
      const course = localData.courses.find((item) => item.id === id);
      return course ? clone(course) : undefined;
    }
  );
}

export async function updateCourseEnrollment(id: string, enrolled: number): Promise<void> {
  await withPostgres(
    async (client) => {
      await client`UPDATE courses SET enrolled = ${enrolled} WHERE id = ${id}`;
    },
    () => {
      const course = localData.courses.find((item) => item.id === id);
      if (course) {
        course.enrolled = enrolled;
        saveLocalStore();
      }
    }
  );
}

export async function getEquipment(): Promise<Equipment[]> {
  return withPostgres(
    async (client) => (await client`SELECT * FROM equipment ORDER BY id`).map(mapEquipment),
    () => clone(localData.equipment)
  );
}

export async function getEquipmentById(id: string): Promise<Equipment | undefined> {
  return withPostgres(
    async (client) => {
      const rows = await client`SELECT * FROM equipment WHERE id = ${id} LIMIT 1`;
      return rows[0] ? mapEquipment(rows[0]) : undefined;
    },
    () => {
      const item = localData.equipment.find((candidate) => candidate.id === id);
      return item ? clone(item) : undefined;
    }
  );
}

export async function updateEquipmentStock(id: string, newStock: number): Promise<void> {
  await withPostgres(
    async (client) => {
      await client`UPDATE equipment SET stock = ${newStock} WHERE id = ${id}`;
    },
    () => {
      const item = localData.equipment.find((candidate) => candidate.id === id);
      if (item) {
        item.stock = newStock;
        saveLocalStore();
      }
    }
  );
}

export async function createEquipment(input: Omit<Equipment, "id">): Promise<Equipment> {
  const equipment = { id: `E${Date.now()}`, ...input };
  return withPostgres(
    async (client) => {
      await client`
        INSERT INTO equipment (id, name, price, deposit, stock, total_stock, description, deposit_mode)
        VALUES (${equipment.id}, ${equipment.name}, ${equipment.price}, ${equipment.deposit}, ${equipment.stock}, ${equipment.totalStock}, ${equipment.description}, ${equipment.depositMode})
      `;
      return equipment;
    },
    () => {
      localData.equipment.push(equipment);
      saveLocalStore();
      return clone(equipment);
    }
  );
}

export async function getUsers(): Promise<User[]> {
  return withPostgres(
    async (client) => (await client`SELECT * FROM users ORDER BY id`).map(mapUser),
    () => clone(localData.users)
  );
}

export async function getMemberByAccount(account: string): Promise<Member | undefined> {
  return withPostgres(
    async (client) => {
      const rows = await client`SELECT * FROM members WHERE account = ${account} LIMIT 1`;
      return rows[0] ? mapMember(rows[0]) : undefined;
    },
    () => {
      const member = localData.members.find((item) => item.account === account);
      return member ? clone(member) : undefined;
    }
  );
}

export async function createMember(account: string, passwordHash: string): Promise<Member> {
  const member = {
    id: `M${Date.now()}`,
    account,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  return withPostgres(
    async (client) => {
      await client`
        INSERT INTO members (id, account, password_hash, created_at, last_login_at)
        VALUES (${member.id}, ${member.account}, ${member.passwordHash}, ${member.createdAt}, ${null})
      `;
      return member;
    },
    () => {
      localData.members.push(member);
      saveLocalStore();
      return clone(member);
    }
  );
}

export async function updateMemberLastLogin(id: string): Promise<Member | undefined> {
  const now = new Date().toISOString();
  return withPostgres(
    async (client) => {
      const rows = await client`
        UPDATE members SET last_login_at = ${now}
        WHERE id = ${id}
        RETURNING *
      `;
      return rows[0] ? mapMember(rows[0]) : undefined;
    },
    () => {
      const member = localData.members.find((item) => item.id === id);
      if (!member) {
        return undefined;
      }
      member.lastLoginAt = now;
      saveLocalStore();
      return clone(member);
    }
  );
}

export async function getBookings(): Promise<Booking[]> {
  return withPostgres(
    async (client) => (await client`SELECT * FROM bookings ORDER BY created_at DESC`).map(mapBooking),
    () => clone(localData.bookings)
  );
}

export async function getBookingById(id: string): Promise<Booking | undefined> {
  return withPostgres(
    async (client) => {
      const rows = await client`SELECT * FROM bookings WHERE id = ${id} LIMIT 1`;
      return rows[0] ? mapBooking(rows[0]) : undefined;
    },
    () => {
      const booking = localData.bookings.find((item) => item.id === id);
      return booking ? clone(booking) : undefined;
    }
  );
}

export async function createBooking(booking: Omit<Booking, "id" | "createdAt" | "updatedAt">): Promise<Booking> {
  const now = new Date().toISOString();
  const nextBooking = {
    id: `B${Date.now()}`,
    ...booking,
    createdAt: now,
    updatedAt: now
  };

  return withPostgres(
    async (client) => {
      await client`
        INSERT INTO bookings (id, service_id, course_id, contact_name, phone, date, slot, people, hours, rental_ids, status, amount, notes, member_account, created_at, updated_at)
        VALUES (${nextBooking.id}, ${nextBooking.serviceId}, ${nextBooking.courseId ?? null}, ${nextBooking.contactName}, ${nextBooking.phone}, ${nextBooking.date}, ${nextBooking.slot}, ${nextBooking.people}, ${nextBooking.hours}, ${JSON.stringify(nextBooking.rentalIds)}::jsonb, ${nextBooking.status}, ${nextBooking.amount}, ${nextBooking.notes ?? null}, ${nextBooking.memberAccount ?? null}, ${nextBooking.createdAt}, ${nextBooking.updatedAt})
      `;
      await reserveBookingInventory(booking);
      return nextBooking;
    },
    async () => {
      localData.bookings.push(nextBooking);
      await reserveBookingInventory(booking);
      saveLocalStore();
      return clone(nextBooking);
    }
  );
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined> {
  const existing = await getBookingById(id);
  if (!existing) {
    return undefined;
  }

  const nextBooking = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  return withPostgres(
    async (client) => {
      const rows = await client`
        UPDATE bookings
        SET service_id = ${nextBooking.serviceId},
            course_id = ${nextBooking.courseId ?? null},
            contact_name = ${nextBooking.contactName},
            phone = ${nextBooking.phone},
            date = ${nextBooking.date},
            slot = ${nextBooking.slot},
            people = ${nextBooking.people},
            hours = ${nextBooking.hours},
            rental_ids = ${JSON.stringify(nextBooking.rentalIds)}::jsonb,
            status = ${nextBooking.status},
            amount = ${nextBooking.amount},
            notes = ${nextBooking.notes ?? null},
            member_account = ${nextBooking.memberAccount ?? null},
            updated_at = ${nextBooking.updatedAt}
        WHERE id = ${id}
        RETURNING *
      `;
      return rows[0] ? mapBooking(rows[0]) : undefined;
    },
    () => {
      const index = localData.bookings.findIndex((item) => item.id === id);
      if (index < 0) {
        return undefined;
      }
      localData.bookings[index] = nextBooking;
      saveLocalStore();
      return clone(nextBooking);
    }
  );
}

export async function getOrders(): Promise<Order[]> {
  return withPostgres(
    async (client) => (await client`SELECT * FROM orders ORDER BY created_at DESC`).map(mapOrder),
    () => clone(localData.orders)
  );
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  return withPostgres(
    async (client) => {
      const rows = await client`SELECT * FROM orders WHERE id = ${id} LIMIT 1`;
      return rows[0] ? mapOrder(rows[0]) : undefined;
    },
    () => {
      const order = localData.orders.find((item) => item.id === id);
      return order ? clone(order) : undefined;
    }
  );
}

export async function createOrder(order: Omit<Order, "id" | "createdAt">): Promise<Order> {
  const nextOrder = {
    id: `O${Date.now()}`,
    ...order,
    createdAt: new Date().toISOString()
  };

  return withPostgres(
    async (client) => {
      await client`
        INSERT INTO orders (id, booking_id, amount, status, payment_method, fee_items, invoice_title, invoice_tax_no, invoice_email, invoice_status, invoice_requested_at, paid_at, refund_requested_at, refunded_at, created_at)
        VALUES (${nextOrder.id}, ${nextOrder.bookingId}, ${nextOrder.amount}, ${nextOrder.status}, ${nextOrder.paymentMethod ?? null}, ${JSON.stringify(nextOrder.feeItems)}::jsonb, ${nextOrder.invoice?.title ?? null}, ${nextOrder.invoice?.taxNo ?? null}, ${nextOrder.invoice?.email ?? null}, ${nextOrder.invoice?.status ?? null}, ${nextOrder.invoice?.requestedAt ?? null}, ${nextOrder.paidAt ?? null}, ${nextOrder.refundRequestedAt ?? null}, ${nextOrder.refundedAt ?? null}, ${nextOrder.createdAt})
      `;
      return nextOrder;
    },
    () => {
      localData.orders.push(nextOrder);
      saveLocalStore();
      return clone(nextOrder);
    }
  );
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
  const existing = await getOrderById(id);
  if (!existing) {
    return undefined;
  }

  const nextOrder = { ...existing, ...updates };
  return withPostgres(
    async (client) => {
      const rows = await client`
        UPDATE orders
        SET booking_id = ${nextOrder.bookingId},
            amount = ${nextOrder.amount},
            status = ${nextOrder.status},
            payment_method = ${nextOrder.paymentMethod ?? null},
            fee_items = ${JSON.stringify(nextOrder.feeItems)}::jsonb,
            invoice_title = ${nextOrder.invoice?.title ?? null},
            invoice_tax_no = ${nextOrder.invoice?.taxNo ?? null},
            invoice_email = ${nextOrder.invoice?.email ?? null},
            invoice_status = ${nextOrder.invoice?.status ?? null},
            invoice_requested_at = ${nextOrder.invoice?.requestedAt ?? null},
            paid_at = ${nextOrder.paidAt ?? null},
            refund_requested_at = ${nextOrder.refundRequestedAt ?? null},
            refunded_at = ${nextOrder.refundedAt ?? null}
        WHERE id = ${id}
        RETURNING *
      `;
      return rows[0] ? mapOrder(rows[0]) : undefined;
    },
    () => {
      const index = localData.orders.findIndex((item) => item.id === id);
      if (index < 0) {
        return undefined;
      }
      localData.orders[index] = nextOrder;
      saveLocalStore();
      return clone(nextOrder);
    }
  );
}

export async function getSiteContent(): Promise<Record<string, string>> {
  return withPostgres(
    async (client) => {
      const rows = await client`SELECT * FROM site_content ORDER BY key` as any[];
      return rows.reduce((content: Record<string, string>, row: any) => {
        content[row.key] = row.value;
        return content;
      }, {});
    },
    () => clone(localData.siteContent)
  );
}

const seedSnapshot = createSeedData();
export const services = seedSnapshot.services;
export const courses = seedSnapshot.courses;
export const equipment = seedSnapshot.equipment;
export const users = seedSnapshot.users;
export const bookings = seedSnapshot.bookings;
export const orders = seedSnapshot.orders;
export const siteContent = seedSnapshot.siteContent;
