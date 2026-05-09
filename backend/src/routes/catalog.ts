import { Router } from "express";
import { courses, equipment, services } from "../data/store.js";

const router = Router();

router.get("/services", (_req, res) => {
  res.json({ data: services });
});

router.get("/courses", (_req, res) => {
  res.json({ data: courses });
});

router.get("/equipment", (_req, res) => {
  res.json({ data: equipment });
});

export default router;
