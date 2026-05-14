import { LogIn, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, apiJson } from "../lib/api";

interface Member {
  id: string;
  account: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface AuthProps {
  onLogin: (member: Member) => void;
}

const accountRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$/;
const passwordRegex = /^\d{6}$/;

export default function Auth({ onLogin }: AuthProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!accountRegex.test(account)) {
      setStatus("error");
      setMessage("账号需为 8-16 位英文和数字组合");
      return;
    }

    if (!passwordRegex.test(password)) {
      setStatus("error");
      setMessage("密码需为 6 位数字");
      return;
    }

    setStatus("loading");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const response = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password })
      });
      const result = await apiJson<{ data?: Member; message?: string }>(response);
      if (!response.ok) {
        throw new Error(result.message ?? "请求失败");
      }
      if (!result.data) {
        throw new Error("接口返回数据异常，请稍后重试");
      }

      onLogin(result.data);
      setStatus("success");
      setMessage(result.message ?? (mode === "login" ? "登录成功" : "注册成功"));
      navigate(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "请求失败");
    }
  };

  return (
    <div className="page compact-page auth-page">
      <section className="section-heading">
        <p className="eyebrow">会员中心</p>
        <h1>{mode === "login" ? "会员登录" : "会员注册"}</h1>
      </section>

      <section className="panel auth-panel">
        <div className="segmented auth-tabs">
          <button className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")} type="button">
            <LogIn size={18} /> 登录
          </button>
          <button className={mode === "register" ? "selected" : ""} onClick={() => setMode("register")} type="button">
            <UserPlus size={18} /> 注册
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            账号
            <input
              maxLength={16}
              placeholder="8-16 位英文+数字"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
            />
          </label>
          <label>
            密码
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="6 位数字"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button className="primary-button full" disabled={status === "loading"} type="submit">
            {status === "loading" ? "处理中..." : mode === "login" ? "登录" : "注册并登录"}
          </button>
          {message && (
            <div className={status === "success" ? "payment-result success" : "payment-result error"}>
              {message}
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
