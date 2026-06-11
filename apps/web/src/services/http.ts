import type { ApiResponse } from "../types/api";

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await parseApiResponse<T>(response, url);

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return body.data;
}

export async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await parseApiResponse<T>(response, url);

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return body.data;
}

export async function patchJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await parseApiResponse<T>(response, url);

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return body.data;
}

export async function deleteJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "DELETE" });
  const body = await parseApiResponse<T>(response, url);

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return body.data;
}

async function parseApiResponse<T>(response: Response, url: string): Promise<ApiResponse<T>> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `API 返回为空：${url}。请确认后端服务已启动，并监听 http://localhost:3001。`
    );
  }

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new Error(
      `API 返回不是合法 JSON：${url}。请确认 Vite 代理已连到后端服务，而不是返回了空响应或 HTML。`
    );
  }
}
