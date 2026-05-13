import { Router } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import { createEquipment, getBookings, getCourses, getEquipment, getOrders, getSiteContent, getUsers, restoreBookingInventory, updateBooking, updateOrder } from "../data/store.js";

const router = Router();

function getBeijingDateKey(value: Date | string = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function getOrderEventTime(order: ReturnType<typeof getOrders>[number]) {
  return order.paidAt ?? order.refundedAt ?? order.createdAt;
}

const equipmentSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  deposit: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  totalStock: z.number().int().nonnegative(),
  description: z.string().min(1),
  depositMode: z.enum(["offline", "online_hold"]).default("offline")
});

const courseSchema = z.object({
  title: z.string().min(1),
  coach: z.string().min(1),
  time: z.string().min(1),
  seats: z.number().int().positive(),
  price: z.number().nonnegative(),
  description: z.string().min(1)
});

const contentSchema = z.object({
  shopName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  workTime: z.string().min(1).optional(),
  email: z.string().email().optional(),
  address: z.string().min(1).optional(),
  transit: z.string().min(1).optional(),
  customerWechat: z.string().min(1).optional()
});

router.get("/summary", (_req, res) => {
  const orders = getOrders();
  const bookings = getBookings();
  const latestOrderTime = orders
    .map((order) => getOrderEventTime(order))
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  const targetDate = latestOrderTime ? getBeijingDateKey(latestOrderTime) : getBeijingDateKey();
  const slotCounts = bookings.reduce<Record<string, number>>((acc, booking) => {
    acc[booking.slot] = (acc[booking.slot] ?? 0) + 1;
    return acc;
  }, {});
  const hotSlot = Object.entries(slotCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "暂无";
  const netRevenue = orders.reduce((sum, order) => {
    if (order.status === "paid" && order.paidAt && getBeijingDateKey(order.paidAt) === targetDate) {
      return sum + order.amount;
    }
    if (order.status === "refunded" && order.refundedAt && getBeijingDateKey(order.refundedAt) === targetDate) {
      return sum - order.amount;
    }
    return sum;
  }, 0);

  res.json({
    data: {
      todayBookings: bookings.filter((booking) => getBeijingDateKey(booking.createdAt) === targetDate).length,
      revenue: Math.max(0, netRevenue),
      revenueDate: targetDate,
      hotSlot,
      pendingRefunds: orders.filter((order) => order.status === "refund_reviewing").length,
      lowStockCount: getEquipment().filter((item) => item.stock <= Math.max(3, Math.ceil(item.totalStock * 0.2))).length,
      pendingPayments: orders.filter((order) => order.status === "pending_payment").length
    }
  });
});

router.get("/bookings", (_req, res) => {
  const orders = getOrders();
  const equipment = getEquipment();
  res.json({
    data: getBookings().map((booking) => ({
      ...booking,
      order: orders.find((order) => order.bookingId === booking.id),
      rentals: booking.rentalIds.map((id) => equipment.find((item) => item.id === id)?.name ?? id)
    }))
  });
});

router.get("/orders", (_req, res) => {
  res.json({ data: getOrders() });
});

router.get("/refunds", (_req, res) => {
  const bookings = getBookings();
  res.json({
    data: getOrders()
      .filter((order) => order.status === "refund_reviewing")
      .map((order) => ({
        order,
        booking: bookings.find((booking) => booking.id === order.bookingId)
      }))
  });
});

router.get("/users", (_req, res) => {
  res.json({ data: getUsers() });
});

router.post("/equipment", (req, res) => {
  const input = equipmentSchema.parse(req.body);
  const equipment = createEquipment(input);
  res.status(201).json({ data: equipment });
});

router.post("/bookings/:bookingId/cancel", (req, res) => {
  const bookings = getBookings();
  const booking = bookings.find((item) => item.id === req.params.bookingId);
  if (!booking) {
    throw new AppError(404, "预约不存在");
  }
  if (booking.status === "cancelled") {
    throw new AppError(409, "预约已取消");
  }

  restoreBookingInventory(booking);
  const updatedBooking = updateBooking(booking.id, { status: "cancelled" });
  const order = getOrders().find((item) => item.bookingId === booking.id);
  const now = new Date().toISOString();
  const updatedOrder = order && order.status !== "cancelled" && order.status !== "refunded"
    ? updateOrder(order.id, order.status === "pending_payment" ? { status: "cancelled" } : { status: "refunded", refundedAt: now })
    : order;

  res.json({ data: { booking: updatedBooking, order: updatedOrder } });
});

router.patch("/equipment/:equipmentId", (req, res) => {
  throw new AppError(501, "装备管理功能暂未实现");
});

router.delete("/equipment/:equipmentId", (req, res) => {
  throw new AppError(501, "装备管理功能暂未实现");
});

router.post("/courses", (req, res) => {
  throw new AppError(501, "课程管理功能暂未实现");
});

router.patch("/courses/:courseId", (req, res) => {
  throw new AppError(501, "课程管理功能暂未实现");
});

router.patch("/content/contact", (req, res) => {
  const input = contentSchema.parse(req.body);
  // Note: Site content update not implemented in database yet
  res.json({ data: getSiteContent(), updatedAt: new Date().toISOString() });
});

export default router;
