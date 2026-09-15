export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Tracks whether the admin session cookie was established this page load.
// The cookie itself is httpOnly (not readable from JS); this flag only
// drives which UI is shown, the server still enforces auth on every request.
let adminAuthenticated = false;

export function hasAdminSecret() {
  return adminAuthenticated;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `${init?.method ?? "GET"} ${path} failed: ${res.status}`);
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
