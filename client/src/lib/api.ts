export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let adminSecret = "";

export function setAdminSecret(secret: string) {
  adminSecret = secret;
}

export function hasAdminSecret() {
  return adminSecret !== "";
}

interface ApiFetchInit extends RequestInit {
  admin?: boolean;
}

export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const { admin, headers, ...rest } = init ?? {};
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(admin ? { "X-Admin-Token": adminSecret } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function loginToCampaign(campaignId: string, code: string) {
  return apiFetch<void>(`/campaigns/${campaignId}/login`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
