import { Router } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import { getBookings, getCourses, getEquipment, getOrders, getSiteContent, getUsers } from "../data/store.js";

const router = Router();

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
  const paidOrders = orders.filter((order) => order.status === "paid");
  const slotCounts = bookings.reduce<Record<string, number>>((acc, booking) => {
    acc[booking.slot] = (acc[booking.slot] ?? 0) + 1;
    return acc;
  }, {});
  const hotSlot = Object.entries(slotCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "暂无";

  res.json({
    data: {
      todayBookings: bookings.length,
      revenue: paidOrders.reduce((sum, order) => sum + order.amount, 0),
      hotSlot,
      pendingRefunds: orders.filter((order) => order.status === "refund_reviewing").length,
      lowStockCount: getEquipment().filter((item) => item.stock <= Math.max(3, Math.ceil(item.totalStock * 0.2))).length,
      pendingPayments: orders.filter((order) => order.status === "pending_payment").length
    }
  });
});

router.get("/bookings", (_req, res) => {
  res.json({ data: getBookings() });
});

router.get("/orders", (_req, res) => {
  res.json({ data: getOrders() });
});

router.get("/users", (_req, res) => {
  res.json({ data: getUsers() });
});

router.post("/equipment", (req, res) => {
  throw new AppError(501, "装备管理功能暂未实现");
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
