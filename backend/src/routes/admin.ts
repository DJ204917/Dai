import { Router } from "express";
import { bookings, equipment, orders } from "../data/store.js";

const router = Router();

router.get("/summary", (_req, res) => {
  res.json({
    data: {
      todayBookings: bookings.length,
      revenue: orders.reduce((sum, order) => sum + order.amount, 0),
      hotSlot: "19:00-20:00",
      lowStockCount: equipment.filter((item) => item.stock <= 12).length
    }
  });
});

export default router;
