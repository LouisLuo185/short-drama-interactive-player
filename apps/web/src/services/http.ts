import type { ApiResponse } from "../types/api";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

export function resolveBackendUrl(url: string): string {
  if (!apiBaseUrl || isAbsoluteUrl(url)) {
    return url;
  }

  return `${apiBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function getJson<T>(url: string): Promise<T> {
  const requestUrl = resolveBackendUrl(url);
  const response = await fetch(requestUrl);
  const body = await parseApiResponse<T>(response, requestUrl);

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return body.data;
}

export async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const requestUrl = resolveBackendUrl(url);
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await parseApiResponse<T>(response, requestUrl);

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return body.data;
}

export async function patchJson<T>(url: string, payload: unknown): Promise<T> {
  const requestUrl = resolveBackendUrl(url);
  const response = await fetch(requestUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await parseApiResponse<T>(response, requestUrl);

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return body.data;
}

export async function deleteJson<T>(url: string): Promise<T> {
  const requestUrl = resolveBackendUrl(url);
  const response = await fetch(requestUrl, { method: "DELETE" });
  const body = await parseApiResponse<T>(response, requestUrl);

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return body.data;
}

async function parseApiResponse<T>(response: Response, url: string): Promise<ApiResponse<T>> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `API 返回为空：${url}。请确认后端服务已启动，并且 VITE_API_BASE_URL 指向正确的后端地址。`
    );
  }

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new Error(
      `API 返回的不是合法 JSON：${url}。请确认请求已经连到后端服务，而不是返回了空响应或 HTML。`
    );
  }
}

function isAbsoluteUrl(url: string) {
  return (
    /^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  );
}
