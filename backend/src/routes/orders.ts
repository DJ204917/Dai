import { Router } from "express";
import { z } from "zod";
import { orders } from "../data/store.js";

const router = Router();

const createPaymentSchema = z.object({
  orderId: z.string(),
  method: z.enum(["wechat", "alipay", "unionpay"])
});

router.get("/", (_req, res) => {
  res.json({ data: orders });
});

router.post("/payments", (req, res) => {
  const input = createPaymentSchema.parse(req.body);
  res.json({
    data: {
      orderId: input.orderId,
      method: input.method,
      status: "payment_created",
      payUrl: `/mock-pay/${input.method}/${input.orderId}`
    }
  });
});

router.post("/:orderId/refund-requests", (req, res) => {
  res.status(202).json({
    data: {
      orderId: req.params.orderId,
      status: "refund_reviewing",
      rule: "开游前2小时可免费取消"
    }
  });
});

export default router;
