import { Router } from "express";
import { getCourses, getEquipment, getServices, getSiteContent } from "../data/store.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

router.get("/services", (_req, res) => {
  res.json({ data: getServices() });
});

router.get("/courses", (_req, res) => {
  const courses = getCourses();
  res.json({
    data: courses.map((course) => ({
      ...course,
      remainingSeats: Math.max(course.seats - course.enrolled, 0)
    }))
  });
});

router.get("/courses/:courseId", (req, res) => {
  const courses = getCourses();
  const course = courses.find((item) => item.id === req.params.courseId);
  if (!course) {
    throw new AppError(404, "课程不存在");
  }
  res.json({ data: { ...course, remainingSeats: Math.max(course.seats - course.enrolled, 0) } });
});

router.get("/equipment", (_req, res) => {
  res.json({ data: getEquipment() });
});

router.get("/equipment/:equipmentId", (req, res) => {
  const equipment = getEquipment();
  const item = equipment.find((candidate) => candidate.id === req.params.equipmentId);
  if (!item) {
    throw new AppError(404, "装备不存在");
  }
  res.json({ data: item });
});

router.get("/content/contact", (_req, res) => {
  res.json({ data: getSiteContent() });
});

export default router;
