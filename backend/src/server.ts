import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import bookingsRouter from "./routes/bookings.js";
import catalogRouter from "./routes/catalog.js";
import ordersRouter from "./routes/orders.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "swim-shop-backend" });
});

const apiModules = {
  catalog: [
    "GET /api/services",
    "GET /api/courses",
    "GET /api/courses/:courseId",
    "GET /api/equipment",
    "GET /api/content/contact"
  ],
  auth: [
    "POST /api/auth/register",
    "POST /api/auth/login"
  ],
  bookings: [
    "GET /api/bookings",
    "GET /api/bookings/availability?date=2026-05-10&serviceId=lane",
    "POST /api/bookings",
    "PATCH /api/bookings/:bookingId",
    "POST /api/bookings/:bookingId/cancel"
  ],
  orders: [
    "GET /api/orders",
    "GET /api/orders/:orderId",
    "POST /api/orders/:orderId/payments",
    "POST /api/orders/:orderId/refund-requests",
    "POST /api/orders/:orderId/refund-approve",
    "POST /api/orders/:orderId/invoice"
  ],
  admin: [
    "GET /api/admin/summary",
    "GET /api/admin/bookings",
    "GET /api/admin/orders",
    "GET /api/admin/users",
    "POST /api/admin/equipment",
    "PATCH /api/admin/equipment/:equipmentId",
    "DELETE /api/admin/equipment/:equipmentId",
    "POST /api/admin/courses",
    "PATCH /api/admin/courses/:courseId",
    "PATCH /api/admin/content/contact"
  ]
};

app.get("/api", (req, res) => {
  if (req.accepts("html")) {
    const sections = Object.entries(apiModules)
      .map(([name, endpoints]) => `
        <section>
          <h2>${name}</h2>
          <ul>${endpoints.map((endpoint) => `<li><code>${endpoint}</code></li>`).join("")}</ul>
        </section>
      `)
      .join("");

    res
      .type("html")
      .send(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>游泳店后端接口</title>
    <style>
      body { margin: 0; font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; color: #172326; background: #f5f7f4; }
      main { width: min(960px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0 48px; }
      h1 { margin: 0 0 8px; font-size: 34px; }
      p { color: #526164; }
      section { margin-top: 18px; padding: 18px; background: #fff; border: 1px solid #dfe8e0; border-radius: 8px; }
      h2 { margin: 0 0 10px; color: #0a7772; }
      ul { margin: 0; padding-left: 20px; }
      li { margin: 8px 0; }
      code { padding: 3px 6px; background: #edf3ed; border-radius: 6px; }
      a { color: #0a7772; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <h1>游泳店后端接口</h1>
      <p>这是后端 API 文档页。前端页面请打开 <a href="http://localhost:5173">http://localhost:5173</a>。</p>
      ${sections}
    </main>
  </body>
</html>`);
    return;
  }

  res.json({
    service: "swim-shop-backend",
    modules: apiModules
  });
});

app.use("/api", catalogRouter);
app.use("/api/auth", authRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "接口不存在，请访问 GET /api 查看接口清单" });
});
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Swim shop API is running at http://localhost:${port}`);
});
