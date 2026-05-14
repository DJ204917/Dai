import { Router } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import { createEquipment, getBookings, getEquipment, getOrders, getSiteContent, getUsers, restoreBookingInventory, updateBooking, updateOrder, type Order } from "../data/store.js";
import { asyncRoute } from "../middleware/asyncRoute.js";

const router = Router();

function getBeijingDateKey(value: Date | string = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function getOrderEventTime(order: Order) {
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

router.get("/summary", asyncRoute(async (_req, res) => {
  const [orders, bookings, equipment] = await Promise.all([getOrders(), getBookings(), getEquipment()]);
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
      lowStockCount: equipment.filter((item) => item.stock <= Math.max(3, Math.ceil(item.totalStock * 0.2))).length,
      pendingPayments: orders.filter((order) => order.status === "pending_payment").length
    }
  });
}));

router.get("/bookings", asyncRoute(async (_req, res) => {
  const [orders, equipment, bookings] = await Promise.all([getOrders(), getEquipment(), getBookings()]);
  res.json({
    data: bookings.map((booking) => ({
      ...booking,
      order: orders.find((order) => order.bookingId === booking.id),
      rentals: booking.rentalIds.map((id) => equipment.find((item) => item.id === id)?.name ?? id)
    }))
  });
}));

router.get("/orders", asyncRoute(async (_req, res) => {
  res.json({ data: await getOrders() });
}));

router.get("/refunds", asyncRoute(async (_req, res) => {
  const [bookings, orders] = await Promise.all([getBookings(), getOrders()]);
  res.json({
    data: orders
      .filter((order) => order.status === "refund_reviewing")
      .map((order) => ({
        order,
        booking: bookings.find((booking) => booking.id === order.bookingId)
      }))
  });
}));

router.get("/users", asyncRoute(async (_req, res) => {
  res.json({ data: await getUsers() });
}));

router.post("/equipment", asyncRoute(async (req, res) => {
  const input = equipmentSchema.parse(req.body);
  const equipment = await createEquipment(input);
  res.status(201).json({ data: equipment });
}));

router.post("/bookings/:bookingId/cancel", asyncRoute(async (req, res) => {
  const bookings = await getBookings();
  const booking = bookings.find((item) => item.id === req.params.bookingId);
  if (!booking) {
    throw new AppError(404, "预约不存在");
  }
  if (booking.status === "cancelled") {
    throw new AppError(409, "预约已取消");
  }

  await restoreBookingInventory(booking);
  const updatedBooking = await updateBooking(booking.id, { status: "cancelled" });
  const order = (await getOrders()).find((item) => item.bookingId === booking.id);
  const now = new Date().toISOString();
  const updatedOrder = order && order.status !== "cancelled" && order.status !== "refunded"
    ? await updateOrder(order.id, order.status === "pending_payment" ? { status: "cancelled" } : { status: "refunded", refundedAt: now })
    : order;

  res.json({ data: { booking: updatedBooking, order: updatedOrder } });
}));

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

router.patch("/content/contact", asyncRoute(async (req, res) => {
  const input = contentSchema.parse(req.body);
  // Note: Site content update not implemented in database yet
  res.json({ data: await getSiteContent(), updatedAt: new Date().toISOString() });
}));

export default router;
