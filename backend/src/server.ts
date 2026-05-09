import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import adminRouter from "./routes/admin.js";
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

app.use("/api", catalogRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Swim shop API is running at http://localhost:${port}`);
});
