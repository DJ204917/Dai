import { Router } from "express";
import { z } from "zod";
import { getBookings, getOrderById, getOrders, restoreBookingInventory, updateBooking, updateOrder } from "../data/store.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

const createPaymentSchema = z.object({
  method: z.enum(["wechat", "alipay", "unionpay"])
});

const invoiceSchema = z.object({
  title: z.string().min(1),
  taxNo: z.string().optional(),
  email: z.string().email()
});

async function assertMemberCanAccessOrder(order: { bookingId: string }, memberAccount?: string) {
  if (!memberAccount) {
    return;
  }

  const bookings = await getBookings();
  const booking = bookings.find((item) => item.id === order.bookingId);
  if (!booking || booking.memberAccount !== memberAccount) {
    throw new AppError(404, "订单不存在");
  }
}

router.get("/", asyncRoute(async (req, res) => {
  const orders = await getOrders();
  const status = req.query.status ? String(req.query.status) : undefined;
  const memberAccount = req.query.memberAccount ? String(req.query.memberAccount) : undefined;
  const bookings = await getBookings();
  const data = orders.filter((order) => {
    if (status && order.status !== status) {
      return false;
    }
    if (!memberAccount) {
      return true;
    }
    const booking = bookings.find((item) => item.id === order.bookingId);
    return booking?.memberAccount === memberAccount;
  });
  res.json({ data });
}));

router.get("/:orderId", asyncRoute(async (req, res) => {
  const orderId = String(req.params.orderId);
  const order = await getOrderById(orderId);
  if (!order) {
    throw new AppError(404, "订单不存在");
  }
  await assertMemberCanAccessOrder(order, req.query.memberAccount ? String(req.query.memberAccount) : undefined);
  const bookings = await getBookings();
  const booking = bookings.find((item) => item.id === order.bookingId);
  res.json({ data: { order, booking } });
}));

router.post("/:orderId/payments", asyncRoute(async (req, res) => {
  const orderId = String(req.params.orderId);
  const input = createPaymentSchema.parse(req.body);
  const order = await getOrderById(orderId);
  if (!order) {
    throw new AppError(404, "订单不存在");
  }
  await assertMemberCanAccessOrder(order, req.query.memberAccount ? String(req.query.memberAccount) : undefined);
  if (order.status !== "pending_payment") {
    throw new AppError(409, "订单当前状态不可支付");
  }

  const now = new Date().toISOString();
  const updatedOrder = await updateOrder(orderId, {
    status: "paid",
    paymentMethod: input.method,
    paidAt: now
  });

  if (!updatedOrder) {
    throw new AppError(404, "订单不存在");
  }

  const bookings = await getBookings();
  const booking = bookings.find((item) => item.id === updatedOrder.bookingId);
  if (booking) {
    await updateBooking(booking.id, { status: "confirmed" });
    // Note: Course enrollment update would need to be implemented
  }

  res.json({
    data: {
      order: updatedOrder,
      booking,
      payment: {
        method: input.method,
        status: "paid",
        transactionId: `T${Date.now()}`
      }
    }
  });
}));

router.post("/:orderId/refund-requests", asyncRoute(async (req, res) => {
  const orderId = String(req.params.orderId);
  const order = await getOrderById(orderId);
  if (!order) {
    throw new AppError(404, "订单不存在");
  }
  await assertMemberCanAccessOrder(order, req.query.memberAccount ? String(req.query.memberAccount) : undefined);
  if (order.status !== "paid") {
    throw new AppError(409, "只有已支付订单可以申请退款");
  }

  const now = new Date().toISOString();
  const updatedOrder = await updateOrder(orderId, {
    status: "refund_reviewing",
    refundRequestedAt: now
  });

  res.status(202).json({
    data: {
      order: updatedOrder,
      rule: "开游前2小时可免费取消，超时需后台审核。"
    }
  });
}));

router.post("/:orderId/cancel", asyncRoute(async (req, res) => {
  const orderId = String(req.params.orderId);
  const order = await getOrderById(orderId);
  if (!order) {
    throw new AppError(404, "订单不存在");
  }
  await assertMemberCanAccessOrder(order, req.query.memberAccount ? String(req.query.memberAccount) : undefined);
  if (order.status !== "pending_payment") {
    throw new AppError(409, "只有待支付订单可以取消");
  }

  const bookings = await getBookings();
  const booking = bookings.find((item) => item.id === order.bookingId);
  if (booking) {
    await restoreBookingInventory(booking);
    await updateBooking(booking.id, { status: "cancelled" });
  }

  const updatedOrder = await updateOrder(order.id, { status: "cancelled" });
  res.json({ data: { order: updatedOrder, booking } });
}));

router.post("/:orderId/refund-approve", asyncRoute(async (req, res) => {
  const orderId = String(req.params.orderId);
  const order = await getOrderById(orderId);
  if (!order) {
    throw new AppError(404, "订单不存在");
  }
  if (order.status !== "refund_reviewing") {
    throw new AppError(409, "订单未处于退款审核状态");
  }

  const now = new Date().toISOString();
  const updatedOrder = await updateOrder(orderId, {
    status: "refunded",
    refundedAt: now
  });

  const bookings = await getBookings();
  const booking = bookings.find((item) => item.id === order.bookingId);
  if (booking) {
    await restoreBookingInventory(booking);
    await updateBooking(booking.id, { status: "cancelled" });
  }

  res.json({ data: { order: updatedOrder, booking } });
}));

router.post("/:orderId/invoice", asyncRoute(async (req, res) => {
  const orderId = String(req.params.orderId);
  const input = invoiceSchema.parse(req.body);
  const order = await getOrderById(orderId);
  if (!order) {
    throw new AppError(404, "订单不存在");
  }
  await assertMemberCanAccessOrder(order, req.query.memberAccount ? String(req.query.memberAccount) : undefined);
  if (order.status !== "paid") {
    throw new AppError(409, "只有已支付订单可以申请发票");
  }

  const now = new Date().toISOString();
  const updatedOrder = await updateOrder(orderId, {
    invoice: {
      ...input,
      status: "requested",
      requestedAt: now
    }
  });

  res.status(201).json({ data: updatedOrder?.invoice });
}));

export default router;
