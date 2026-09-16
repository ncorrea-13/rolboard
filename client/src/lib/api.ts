export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let adminAuthenticated = false;

export function hasAdminSecret() {
  return adminAuthenticated;
}

export async function checkAdminSession() {
  try {
    await apiFetch<void>("/admin/session");
    adminAuthenticated = true;
  } catch {
    adminAuthenticated = false;
  }
  return adminAuthenticated;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new ApiError(
      res.status,
      `${init?.method ?? "GET"} ${path} failed: ${res.status}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function loginAsAdmin(token: string) {
  await apiFetch<void>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  adminAuthenticated = true;
}

export async function logoutAdmin() {
  await apiFetch<void>("/admin/logout", { method: "POST" });
  adminAuthenticated = false;
}

export function loginToCampaign(campaignId: string, code: string) {
  return apiFetch<void>(`/campaigns/${campaignId}/login`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function apiImageRequest<T>(
  path: string,
  method: "POST" | "DELETE",
  file?: File,
): Promise<T> {
  let body: FormData | undefined;
  if (file) {
    body = new FormData();
    body.append("file", file);
  }
  const res = await fetch(`/api${path}`, { method, body });
  if (!res.ok) {
    throw new ApiError(res.status, `${method} ${path} failed: ${res.status}`);
  }
  return res.json();
}
