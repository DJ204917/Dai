import { Router } from "express";
import { z } from "zod";
import { bookings } from "../data/store.js";

const router = Router();

const createBookingSchema = z.object({
  serviceId: z.string(),
  date: z.string(),
  slot: z.string(),
  people: z.number().int().positive(),
  rentalIds: z.array(z.string()).default([])
});

router.get("/", (_req, res) => {
  res.json({ data: bookings });
});

router.get("/availability", (req, res) => {
  const date = String(req.query.date ?? "");
  res.json({
    date,
    data: ["09:00-10:00", "10:00-11:00", "14:00-15:00", "16:00-17:00", "19:00-20:00"]
  });
});

router.post("/", (req, res) => {
  const input = createBookingSchema.parse(req.body);
  const booking = {
    id: `B${Date.now()}`,
    ...input,
    status: "pending_payment"
  };
  bookings.push(booking);
  res.status(201).json({ data: booking });
});

export default router;
