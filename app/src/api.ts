import type { Role } from "../../shared/types";
export async function api<T>(
  path: string,
  role: Role,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("x-demo-role", role);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status}).`);
  }
  return res.json();
}
export const post = (body: unknown = {}): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});
