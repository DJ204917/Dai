import { Router } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import { createBooking, createOrder, getBookingById, getBookings, getCourses, getEquipment, getOrders, getServices, restoreBookingInventory, timeSlots, updateBooking } from "../data/store.js";
import { asyncRoute } from "../middleware/asyncRoute.js";

const router = Router();

const createBookingSchema = z.object({
  serviceId: z.enum(["lane", "course", "private", "rental"]),
  courseId: z.string().optional(),
  contactName: z.string().min(1),
  phone: z.string().min(6),
  date: z.string().min(8),
  slot: z.string().min(5),
  people: z.number().int().positive(),
  hours: z.number().positive().default(1),
  rentalIds: z.array(z.string()).default([]),
  memberAccount: z.string().optional(),
  notes: z.string().optional()
});

const updateBookingSchema = z.object({
  date: z.string().min(8).optional(),
  slot: z.string().min(5).optional(),
  people: z.number().int().positive().optional(),
  hours: z.number().positive().optional(),
  notes: z.string().optional()
});

function calculateLaneAmount(hours: number, people: number) {
  const billableHours = Math.max(hours, 2);
  return (40 + Math.max(billableHours - 2, 0) * 10) * people;
}

function parseTimeRange(slot: string) {
  const match = slot.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
  if (!match) {
    throw new AppError(400, "时间段格式应为 HH:mm-HH:mm");
  }

  const [, startHourValue, startMinuteValue, endHourValue, endMinuteValue] = match;
  const start = Number(startHourValue) * 60 + Number(startMinuteValue);
  const end = Number(endHourValue) * 60 + Number(endMinuteValue);
  const opensAt = 8 * 60;
  const closesAt = 22 * 60;
  if (start < opensAt || end > closesAt) {
    throw new AppError(400, "预约时间需在营业时间 08:00-22:00 内");
  }
  if (end <= start) {
    throw new AppError(400, "结束时间需晚于开始时间");
  }
  if (start % 30 !== 0 || end % 30 !== 0) {
    throw new AppError(400, "开始和结束时间只能选择整点或半点，请重新选择时间");
  }

  return { start, end, hours: Math.ceil((end - start) / 30) / 2 };
}

function timeRangesOverlap(left: { start: number; end: number }, right: { start: number; end: number }) {
  return left.start < right.end && right.start < left.end;
}

function isActiveBooking(booking: { status: string }) {
  return booking.status !== "cancelled";
}

async function assertPrivateDayAvailable(date: string, serviceId: string) {
  const bookings = await getBookings();
  const activeBookingsOnDate = bookings.filter((booking) => booking.date === date && isActiveBooking(booking));
  const hasPrivateBooking = activeBookingsOnDate.some((booking) => booking.serviceId === "private");

  if ((serviceId === "lane" || serviceId === "rental") && hasPrivateBooking) {
    throw new AppError(409, "当天已被包场，泳道和装备余量不足，请选择其他日期");
  }

  if (serviceId === "private" && activeBookingsOnDate.length > 0) {
    throw new AppError(409, "当天已有预约或包场订单，无法购买包场，请选择其他日期");
  }
}

async function calculateAvailability(date: string, serviceId = "lane") {
  const [services, bookings] = await Promise.all([getServices(), getBookings()]);
  const service = services.find((item) => item.id === serviceId);
  if (!service) {
    throw new AppError(404, "服务不存在");
  }

  if ((serviceId === "lane" || serviceId === "rental") && bookings.some((booking) => booking.date === date && booking.serviceId === "private" && isActiveBooking(booking))) {
    return timeSlots.map((slot) => ({
      slot,
      capacity: service.capacityPerSlot,
      used: service.capacityPerSlot,
      available: 0,
      disabled: true
    }));
  }

  return timeSlots.map((slot) => {
    const targetRange = parseTimeRange(slot);
    const used = bookings
      .filter((booking) => {
        if (booking.date !== date || booking.serviceId !== service.id || booking.status === "cancelled") {
          return false;
        }
        return timeRangesOverlap(parseTimeRange(booking.slot), targetRange);
      })
      .reduce((sum, booking) => sum + booking.people, 0);

    return {
      slot,
      capacity: service.capacityPerSlot,
      used,
      available: Math.max(service.capacityPerSlot - used, 0),
      disabled: used >= service.capacityPerSlot
    };
  });
}

async function buildFeeItems(input: z.infer<typeof createBookingSchema>) {
  const [services, courses, equipment] = await Promise.all([getServices(), getCourses(), getEquipment()]);
  const service = services.find((item) => item.id === input.serviceId);
  if (!service) {
    throw new AppError(404, "服务不存在");
  }

  const feeItems = [];
  let serviceAmount = service.price;

  if (input.serviceId === "lane") {
    serviceAmount = calculateLaneAmount(input.hours, input.people);
    feeItems.push({ label: `${service.name} ${input.hours}小时 x ${input.people}人`, amount: serviceAmount });
  }

  if (input.serviceId === "course") {
    const course = courses.find((item) => item.id === input.courseId);
    if (!course) {
      throw new AppError(400, "课程预约必须选择有效课程");
    }
    if (course.seats - course.enrolled < input.people) {
      throw new AppError(409, "课程剩余名额不足");
    }
    serviceAmount = course.price * input.people;
    feeItems.push({ label: `${course.title} x ${input.people}人`, amount: serviceAmount });
  }

  if (input.serviceId === "private") {
    serviceAmount = service.price;
    feeItems.push({ label: `${service.name}申请`, amount: serviceAmount });
  }

  if (input.serviceId === "rental" && input.rentalIds.length === 0) {
    throw new AppError(400, "装备租赁必须选择至少一件装备");
  }

  const rentalCounts: Record<string, number> = {};
  for (const rentalId of input.rentalIds) {
    rentalCounts[rentalId] = (rentalCounts[rentalId] || 0) + 1;
  }

  for (const [rentalId, count] of Object.entries(rentalCounts)) {
    const item = equipment.find((candidate) => candidate.id === rentalId);
    if (!item) {
      throw new AppError(400, `租赁装备不存在：${rentalId}`);
    }
    if (item.stock < count) {
      throw new AppError(409, `${item.name}库存不足，需要${count}件，剩余${item.stock}件`);
    }
    feeItems.push({ label: `${item.name}租赁 x ${count}`, amount: input.serviceId === "private" ? 0 : item.price * count });
  }

  return feeItems;
}

async function buildFeeItemsForBooking(booking: {
  serviceId: "lane" | "course" | "private" | "rental";
  courseId?: string;
  people: number;
  hours: number;
  rentalIds: string[];
}) {
  return buildFeeItems({
    serviceId: booking.serviceId,
    courseId: booking.courseId,
    contactName: "system",
    phone: "000000",
    date: "system",
    slot: "system",
    people: booking.people,
    hours: booking.hours,
    rentalIds: booking.rentalIds
  });
}

async function assertSlotAvailable(date: string, slot: string, serviceId: string, people: number) {
  await assertPrivateDayAvailable(date, serviceId);

  const services = await getServices();
  const service = services.find((item) => item.id === serviceId);
  if (!service) {
    throw new AppError(404, "服务不存在");
  }

  const targetRange = parseTimeRange(slot);
  const bookings = await getBookings();
  const used = bookings
    .filter((booking) => {
      if (booking.date !== date || booking.serviceId !== service.id || booking.status === "cancelled") {
        return false;
      }
      return timeRangesOverlap(parseTimeRange(booking.slot), targetRange);
    })
    .reduce((sum, booking) => sum + booking.people, 0);

  if (service.capacityPerSlot - used < people) {
    throw new AppError(409, "该时间段剩余容量不足");
  }

  return targetRange;
}

router.get("/", asyncRoute(async (req, res) => {
  const bookings = await getBookings();
  const status = req.query.status ? String(req.query.status) : undefined;
  const date = req.query.date ? String(req.query.date) : undefined;
  const data = bookings.filter((booking) => (!status || booking.status === status) && (!date || booking.date === date));
  res.json({ data });
}));

router.get("/availability", asyncRoute(async (req, res) => {
  const date = String(req.query.date ?? "");
  const serviceId = String(req.query.serviceId ?? "lane");
  if (!date) {
    throw new AppError(400, "date 参数必填");
  }
  res.json({ date, serviceId, data: await calculateAvailability(date, serviceId) });
}));

router.get("/:bookingId", asyncRoute(async (req, res) => {
  const bookingId = String(req.params.bookingId);
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new AppError(404, "预约不存在");
  }
  const orders = await getOrders();
  const order = orders.find((item) => item.bookingId === booking.id);
  res.json({ data: { booking, order } });
}));

router.post("/", asyncRoute(async (req, res) => {
  const input = createBookingSchema.parse(req.body);
  await assertPrivateDayAvailable(input.date, input.serviceId);

  if (input.serviceId !== "rental") {
    const timeRange = await assertSlotAvailable(input.date, input.slot, input.serviceId, input.people);
    input.hours = timeRange.hours;
  }

  const feeItems = await buildFeeItems(input);
  const amount = feeItems.reduce((sum, item) => sum + item.amount, 0);

  const booking = await createBooking({
    ...input,
    status: "pending_payment",
    amount
  });

  const order = await createOrder({
    bookingId: booking.id,
    amount,
    status: "pending_payment",
    feeItems
  });

  res.status(201).json({ data: { booking, order } });
}));

router.patch("/:bookingId", asyncRoute(async (req, res) => {
  const bookingId = String(req.params.bookingId);
  const input = updateBookingSchema.parse(req.body);
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new AppError(404, "预约不存在");
  }
  if (booking.status === "cancelled" || booking.status === "completed") {
    throw new AppError(409, "当前预约状态不可修改");
  }

  const nextDate = input.date ?? booking.date;
  const nextSlot = input.slot ?? booking.slot;
  const nextPeople = input.people ?? booking.people;
  let nextHours = input.hours ?? booking.hours;
  if (booking.serviceId !== "rental" && (nextDate !== booking.date || nextSlot !== booking.slot || nextPeople !== booking.people)) {
    const timeRange = await assertSlotAvailable(nextDate, nextSlot, booking.serviceId, nextPeople);
    nextHours = timeRange.hours;
  }

  const updatedBooking = await updateBooking(bookingId, {
    ...input,
    people: nextPeople,
    hours: nextHours
  });

  if (!updatedBooking) {
    throw new AppError(404, "预约不存在");
  }

  const orders = await getOrders();
  const order = orders.find((item) => item.bookingId === updatedBooking.id);
  if (order && order.status === "pending_payment") {
    const feeItems = await buildFeeItemsForBooking(updatedBooking);
    const amount = feeItems.reduce((sum, item) => sum + item.amount, 0);
    // Note: In a real implementation, you'd update the order in the database too
  }

  res.json({ data: { booking: updatedBooking, order } });
}));

router.post("/:bookingId/cancel", asyncRoute(async (req, res) => {
  const bookingId = String(req.params.bookingId);
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new AppError(404, "预约不存在");
  }
  if (booking.status === "cancelled") {
    throw new AppError(409, "预约已取消");
  }

  const updatedBooking = await updateBooking(bookingId, { status: "cancelled" });
  if (!updatedBooking) {
    throw new AppError(404, "预约不存在");
  }

  await restoreBookingInventory(updatedBooking);

  const orders = await getOrders();
  const order = orders.find((item) => item.bookingId === updatedBooking.id);
  if (order) {
    // Note: In a real implementation, you'd update order status in database
  }

  res.json({
    data: {
      booking: updatedBooking,
      order,
      refundRule: "开游前2小时可免费取消，已支付订单进入退款审核。"
    }
  });
}));

export default router;
