import db from './database.js';

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

export const timeSlots = ["09:00-10:00", "10:00-11:00", "14:00-15:00", "16:00-17:00", "19:00-20:00", "20:00-21:00"];

// Database query functions
export function getServices(): Service[] {
  const rows = db.prepare('SELECT * FROM services').all();
  return rows.map((row: any) => ({
    id: row.id as ServiceId,
    name: row.name,
    price: row.price,
    unit: row.unit,
    capacityPerSlot: row.capacity_per_slot,
    description: row.description
  }));
}

export function getCourses(): Course[] {
  const rows = db.prepare('SELECT * FROM courses').all();
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    coach: row.coach,
    time: row.time,
    seats: row.seats,
    enrolled: row.enrolled,
    price: row.price,
    description: row.description
  }));
}

export function getCourseById(id: string): Course | undefined {
  const row = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!row) return undefined;
  return {
    id: row.id,
    title: row.title,
    coach: row.coach,
    time: row.time,
    seats: row.seats,
    enrolled: row.enrolled,
    price: row.price,
    description: row.description
  };
}

export function updateCourseEnrollment(id: string, enrolled: number): void {
  db.prepare('UPDATE courses SET enrolled = ? WHERE id = ?').run(enrolled, id);
}

export function getEquipment(): Equipment[] {
  const rows = db.prepare('SELECT * FROM equipment').all();
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    price: row.price,
    deposit: row.deposit,
    stock: row.stock,
    totalStock: row.total_stock,
    description: row.description,
    depositMode: row.deposit_mode as "offline" | "online_hold"
  }));
}

export function getEquipmentById(id: string): Equipment | undefined {
  const row = db.prepare('SELECT * FROM equipment WHERE id = ?').get(id);
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    deposit: row.deposit,
    stock: row.stock,
    totalStock: row.total_stock,
    description: row.description,
    depositMode: row.deposit_mode as "offline" | "online_hold"
  };
}

export function updateEquipmentStock(id: string, newStock: number): void {
  db.prepare('UPDATE equipment SET stock = ? WHERE id = ?').run(newStock, id);
}

export function createEquipment(input: Omit<Equipment, 'id'>): Equipment {
  const id = `E${Date.now()}`;
  db.prepare(`
    INSERT INTO equipment (id, name, price, deposit, stock, total_stock, description, deposit_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.price,
    input.deposit,
    input.stock,
    input.totalStock,
    input.description,
    input.depositMode
  );
  return { id, ...input };
}

function countRentalIds(rentalIds: string[]): Record<string, number> {
  return rentalIds.reduce<Record<string, number>>((counts, id) => {
    counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, {});
}

function reserveBookingInventory(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): void {
  if (booking.serviceId === "course" && booking.courseId) {
    const course = getCourseById(booking.courseId);
    if (course) {
      updateCourseEnrollment(course.id, course.enrolled + booking.people);
    }
  }

  for (const [equipmentId, count] of Object.entries(countRentalIds(booking.rentalIds))) {
    const equipment = getEquipmentById(equipmentId);
    if (equipment) {
      updateEquipmentStock(equipmentId, Math.max(equipment.stock - count, 0));
    }
  }
}

export function restoreBookingInventory(booking: Booking): void {
  if (booking.serviceId === "course" && booking.courseId) {
    const course = getCourseById(booking.courseId);
    if (course) {
      updateCourseEnrollment(course.id, Math.max(course.enrolled - booking.people, 0));
    }
  }

  for (const [equipmentId, count] of Object.entries(countRentalIds(booking.rentalIds))) {
    const equipment = getEquipmentById(equipmentId);
    if (equipment) {
      updateEquipmentStock(equipmentId, Math.min(equipment.stock + count, equipment.totalStock));
    }
  }
}

export function getUsers(): User[] {
  const rows = db.prepare('SELECT * FROM users').all();
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    memberCardNo: row.member_card_no,
    points: row.points
  }));
}

function mapMember(row: any): Member {
  return {
    id: row.id,
    account: row.account,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at
  };
}

export function getMemberByAccount(account: string): Member | undefined {
  const row = db.prepare('SELECT * FROM members WHERE account = ?').get(account);
  return row ? mapMember(row) : undefined;
}

export function createMember(account: string, passwordHash: string): Member {
  const id = `M${Date.now()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO members (id, account, password_hash, created_at, last_login_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, account, passwordHash, now, null);
  return { id, account, passwordHash, createdAt: now };
}

export function updateMemberLastLogin(id: string): Member | undefined {
  const now = new Date().toISOString();
  db.prepare('UPDATE members SET last_login_at = ? WHERE id = ?').run(now, id);
  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  return row ? mapMember(row) : undefined;
}

export function getBookings(): Booking[] {
  const rows = db.prepare('SELECT * FROM bookings').all();
  return rows.map((row: any) => ({
    id: row.id,
    serviceId: row.service_id as ServiceId,
    courseId: row.course_id,
    contactName: row.contact_name,
    phone: row.phone,
    date: row.date,
    slot: row.slot,
    people: row.people,
    hours: row.hours,
    rentalIds: JSON.parse(row.rental_ids || '[]'),
    status: row.status as BookingStatus,
    amount: row.amount,
    notes: row.notes,
    memberAccount: row.member_account,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export function getBookingById(id: string): Booking | undefined {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!row) return undefined;
  return {
    id: row.id,
    serviceId: row.service_id as ServiceId,
    courseId: row.course_id,
    contactName: row.contact_name,
    phone: row.phone,
    date: row.date,
    slot: row.slot,
    people: row.people,
    hours: row.hours,
    rentalIds: JSON.parse(row.rental_ids || '[]'),
    status: row.status as BookingStatus,
    amount: row.amount,
    notes: row.notes,
    memberAccount: row.member_account,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Booking {
  const id = `B${Date.now()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO bookings (id, service_id, course_id, contact_name, phone, date, slot, people, hours, rental_ids, status, amount, notes, member_account, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    booking.serviceId,
    booking.courseId,
    booking.contactName,
    booking.phone,
    booking.date,
    booking.slot,
    booking.people,
    booking.hours,
    JSON.stringify(booking.rentalIds),
    booking.status,
    booking.amount,
    booking.notes,
    booking.memberAccount,
    now,
    now
  );

  reserveBookingInventory(booking);

  return {
    id,
    ...booking,
    createdAt: now,
    updatedAt: now
  };
}

export function updateBooking(id: string, updates: Partial<Booking>): Booking | undefined {
  const existing = getBookingById(id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const fields = [];
  const values = [];

  if (updates.contactName !== undefined) {
    fields.push('contact_name = ?');
    values.push(updates.contactName);
  }
  if (updates.phone !== undefined) {
    fields.push('phone = ?');
    values.push(updates.phone);
  }
  if (updates.date !== undefined) {
    fields.push('date = ?');
    values.push(updates.date);
  }
  if (updates.slot !== undefined) {
    fields.push('slot = ?');
    values.push(updates.slot);
  }
  if (updates.people !== undefined) {
    fields.push('people = ?');
    values.push(updates.people);
  }
  if (updates.hours !== undefined) {
    fields.push('hours = ?');
    values.push(updates.hours);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return getBookingById(id);
}

export function getOrders(): Order[] {
  const rows = db.prepare('SELECT * FROM orders').all();
  return rows.map((row: any) => ({
    id: row.id,
    bookingId: row.booking_id,
    amount: row.amount,
    status: row.status as OrderStatus,
    paymentMethod: row.payment_method as PaymentMethod,
    feeItems: JSON.parse(row.fee_items || '[]'),
    invoice: row.invoice_title ? {
      title: row.invoice_title,
      taxNo: row.invoice_tax_no,
      email: row.invoice_email,
      status: row.invoice_status as "requested" | "issued",
      requestedAt: row.refund_requested_at
    } : undefined,
    paidAt: row.paid_at,
    refundRequestedAt: row.refund_requested_at,
    refundedAt: row.refunded_at,
    createdAt: row.created_at
  }));
}

export function getOrderById(id: string): Order | undefined {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!row) return undefined;
  return {
    id: row.id,
    bookingId: row.booking_id,
    amount: row.amount,
    status: row.status as OrderStatus,
    paymentMethod: row.payment_method as PaymentMethod,
    feeItems: JSON.parse(row.fee_items || '[]'),
    invoice: row.invoice_title ? {
      title: row.invoice_title,
      taxNo: row.invoice_tax_no,
      email: row.invoice_email,
      status: row.invoice_status as "requested" | "issued",
      requestedAt: row.refund_requested_at
    } : undefined,
    paidAt: row.paid_at,
    refundRequestedAt: row.refund_requested_at,
    refundedAt: row.refunded_at,
    createdAt: row.created_at
  };
}

export function createOrder(order: Omit<Order, 'id' | 'createdAt'>): Order {
  const id = `O${Date.now()}`;
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO orders (id, booking_id, amount, status, payment_method, fee_items, invoice_title, invoice_tax_no, invoice_email, invoice_status, paid_at, refund_requested_at, refunded_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    order.bookingId,
    order.amount,
    order.status,
    order.paymentMethod,
    JSON.stringify(order.feeItems),
    order.invoice?.title,
    order.invoice?.taxNo,
    order.invoice?.email,
    order.invoice?.status,
    order.paidAt,
    order.refundRequestedAt,
    order.refundedAt,
    createdAt
  );
  return { id, ...order, createdAt };
}

export function updateOrder(id: string, updates: Partial<Order>): Order | undefined {
  const existing = getOrderById(id);
  if (!existing) return undefined;

  const fields = [];
  const values = [];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.paymentMethod !== undefined) {
    fields.push('payment_method = ?');
    values.push(updates.paymentMethod);
  }
  if (updates.paidAt !== undefined) {
    fields.push('paid_at = ?');
    values.push(updates.paidAt);
  }
  if (updates.refundRequestedAt !== undefined) {
    fields.push('refund_requested_at = ?');
    values.push(updates.refundRequestedAt);
  }
  if (updates.refundedAt !== undefined) {
    fields.push('refunded_at = ?');
    values.push(updates.refundedAt);
  }
  if (updates.invoice !== undefined) {
    fields.push('invoice_title = ?');
    values.push(updates.invoice.title);
    fields.push('invoice_tax_no = ?');
    values.push(updates.invoice.taxNo);
    fields.push('invoice_email = ?');
    values.push(updates.invoice.email);
    fields.push('invoice_status = ?');
    values.push(updates.invoice.status);
  }

  values.push(id);
  db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return getOrderById(id);
}

export function getSiteContent(): Record<string, string> {
  const rows = db.prepare('SELECT * FROM site_content').all();
  const content: Record<string, string> = {};
  rows.forEach((row: any) => {
    content[row.key] = row.value;
  });
  return content;
}

// Legacy exports for backward compatibility
export const services = getServices();
export const courses = getCourses();
export const equipment = getEquipment();
export const users = getUsers();
export const bookings = getBookings();
export const orders = getOrders();
export const siteContent = getSiteContent();
