import { apiFetch } from "./api";
import { androidBridge, pickFolder as pickOnAndroid } from "./android";

export type FolderKind = "vaults-root" | "sync-dir";

export interface LocalSettings {
  vaultsRoot: string;
  syncDir: string;
}

export type PickResult =
  | { kind: "picked"; settings: LocalSettings }
  | { kind: "cancelled" }
  | { kind: "permission" };

export async function loadSettings(): Promise<LocalSettings> {
  const bridge = androidBridge();
  if (bridge) return JSON.parse(bridge.settings()) as LocalSettings;
  return apiFetch<LocalSettings>("/desktop/settings");
}

export async function pickFolder(kind: FolderKind): Promise<PickResult> {
  const bridge = androidBridge();
  if (bridge) {
    const r = await pickOnAndroid(bridge, kind);
    if (r.status === 200)
      return { kind: "picked", settings: JSON.parse(r.text) as LocalSettings };
    if (r.status === 204) return { kind: "cancelled" };
    if (r.status === 403) return { kind: "permission" };
    throw new Error(r.text);
  }
  const settings = await apiFetch<LocalSettings | undefined>(
    `/desktop/${kind}`,
    { method: "POST" },
  );
  return settings ? { kind: "picked", settings } : { kind: "cancelled" };
}
