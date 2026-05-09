import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "请求参数不合法",
      issues: error.flatten()
    });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "服务器内部错误" });
};
