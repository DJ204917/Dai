const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (apiBaseUrl.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${apiBaseUrl}${normalizedPath.slice(4)}`;
  }
  return `${apiBaseUrl}${normalizedPath}`;
}

export function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return fetch(apiUrl(path), {
    cache: "no-store",
    ...init,
    headers
  });
}

export async function apiJson<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  const body = await response.text();
  if (body.toLowerCase().includes("the page")) {
    throw new Error("接口地址不存在，请确认 Vercel 已部署最新代码，并检查环境变量 VITE_API_BASE_URL 不要填错");
  }

  throw new Error(body || `接口请求失败（${response.status}）`);
}
