import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import { createMember, getDataStoreStatus, getMemberByAccount, updateMemberLastLogin } from "../data/store.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

const accountRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$/;
const passwordRegex = /^\d{6}$/;

const authSchema = z.object({
  account: z.string().regex(accountRegex, "账号需为 8-16 位英文和数字组合"),
  password: z.string().regex(passwordRegex, "密码需为 6 位数字")
});

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function publicMember(member: { id: string; account: string; createdAt: string; lastLoginAt?: string }) {
  return {
    id: member.id,
    account: member.account,
    createdAt: member.createdAt,
    lastLoginAt: member.lastLoginAt
  };
}

router.get("/status", asyncRoute(async (_req, res) => {
  res.json({
    data: await getDataStoreStatus()
  });
}));

router.post("/register", asyncRoute(async (req, res) => {
  const input = authSchema.parse(req.body);
  const existing = await getMemberByAccount(input.account);
  if (existing) {
    throw new AppError(409, "账号已注册，请直接登录");
  }

  const member = await createMember(input.account, hashPassword(input.password));
  res.status(201).json({ data: publicMember(member), message: "注册成功" });
}));

router.post("/login", asyncRoute(async (req, res) => {
  const input = authSchema.parse(req.body);
  const member = await getMemberByAccount(input.account);
  if (!member) {
    throw new AppError(404, "此账号未注册请前往注册");
  }
  if (member.passwordHash !== hashPassword(input.password)) {
    throw new AppError(401, "密码错误");
  }

  const updatedMember = await updateMemberLastLogin(member.id) ?? member;
  res.json({ data: publicMember(updatedMember), message: "登录成功" });
}));

export default router;
