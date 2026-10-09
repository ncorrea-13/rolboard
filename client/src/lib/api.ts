import type { TranslationKey } from "./i18n";
import { androidBridge, send } from "./android";
import { reportError } from "./notify";

export class ApiError extends Error {
  status: number;
  detail: string;
  code: string;
  constructor(status: number, message: string, detail = "", code = "") {
    super(message);
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

const API_ERROR_KEYS: Record<string, TranslationKey> = {
  session_conflict: "apiError.sessionConflict",
  arc_in_use: "apiError.arcInUse",
  location_in_use: "apiError.locationInUse",
  npc_in_use: "apiError.npcInUse",
};

function parseCode(body: string): string {
  try {
    const code = JSON.parse(body)?.code;
    return typeof code === "string" ? code : "";
  } catch {
    return "";
  }
}

async function failure(res: Response, method: string, path: string) {
  const detail = (await res.text().catch(() => "")).trim().slice(0, 300);
  return new ApiError(
    res.status,
    `${method} ${path} failed: ${res.status}`,
    detail,
    parseCode(detail),
  );
}

/** Human-readable reason for a failed request, for toasts. */
export function describeError(
  err: unknown,
  t: (key: TranslationKey) => string,
): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return t("toast.unauthorized");
    const key = API_ERROR_KEYS[err.code];
    if (key) return t(key);
    if (err.status >= 500)
      return `${t("toast.serverError")} (HTTP ${err.status})`;
    return err.detail || `HTTP ${err.status}`;
  }
  if (err instanceof TypeError) return t("toast.networkError");
  return err instanceof Error ? err.message : String(err);
}

let adminAuthenticated = false;
let localMode = false;

export function hasAdminSecret() {
  return adminAuthenticated;
}

export function isLocalMode() {
  return localMode;
}

export function openExternal(e: {
  preventDefault(): void;
  currentTarget: HTMLAnchorElement;
}) {
  const bridge = androidBridge();
  if (bridge) {
    e.preventDefault();
    bridge.openExternal(e.currentTarget.href);
    return;
  }
  if (!localMode) return;
  e.preventDefault();
  apiFetch<void>("/desktop/open", {
    method: "POST",
    body: JSON.stringify({ url: e.currentTarget.href }),
  }).catch((err) => reportError("toast.errorOpeningLink", err));
}

export async function checkAdminSession() {
  try {
    const session = await apiFetch<{ localMode: boolean }>("/admin/session");
    adminAuthenticated = true;
    localMode = session.localMode;
  } catch {
    adminAuthenticated = false;
  }
  return adminAuthenticated;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await send(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) throw await failure(res, init?.method ?? "GET", path);
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
  let body: ArrayBuffer | undefined;
  let headers: HeadersInit | undefined;
  if (file) {
    const form = new FormData();
    form.append("file", file);
    const encoded = new Response(form);
    body = await encoded.arrayBuffer();
    headers = { "Content-Type": encoded.headers.get("Content-Type") ?? "" };
  }
  const res = await send(`/api${path}`, { method, body, headers });
  if (!res.ok) throw await failure(res, method, path);
  return res.json();
}
