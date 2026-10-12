import { androidBridge } from "./android";
import { isLocalMode } from "./api";

export type AppMode = "web" | "desktop" | "android";

export function currentMode(): AppMode {
  if (!isLocalMode()) return "web";
  return androidBridge() ? "android" : "desktop";
}
