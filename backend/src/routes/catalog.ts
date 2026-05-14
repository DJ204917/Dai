import { Router } from "express";
import { getCourses, getEquipment, getServices, getSiteContent } from "../data/store.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

router.get("/services", asyncRoute(async (_req, res) => {
  res.json({ data: await getServices() });
}));

router.get("/courses", asyncRoute(async (_req, res) => {
  const courses = await getCourses();
  res.json({
    data: courses.map((course) => ({
      ...course,
      remainingSeats: Math.max(course.seats - course.enrolled, 0)
    }))
  });
}));

router.get("/courses/:courseId", asyncRoute(async (req, res) => {
  const courses = await getCourses();
  const course = courses.find((item) => item.id === req.params.courseId);
  if (!course) {
    throw new AppError(404, "课程不存在");
  }
  res.json({ data: { ...course, remainingSeats: Math.max(course.seats - course.enrolled, 0) } });
}));

router.get("/equipment", asyncRoute(async (_req, res) => {
  res.json({ data: await getEquipment() });
}));

router.get("/equipment/:equipmentId", asyncRoute(async (req, res) => {
  const equipment = await getEquipment();
  const item = equipment.find((candidate) => candidate.id === req.params.equipmentId);
  if (!item) {
    throw new AppError(404, "装备不存在");
  }
  res.json({ data: item });
}));

router.get("/content/contact", asyncRoute(async (_req, res) => {
  res.json({ data: await getSiteContent() });
}));

export default router;
