import { askConfirm } from "./confirm";
import type { TranslationKey } from "./i18n";

/**
 * Tracks how many mounted forms hold unsaved changes. A counter (not a
 * boolean) so two forms on screen at once cannot clear each other's flag.
 */
let active = 0;

export function registerUnsaved(): () => void {
  active++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    active--;
  };
}

export function hasUnsaved(): boolean {
  return active > 0;
}

/**
 * Resolves true when it is safe to leave: nothing unsaved, or the user
 * accepted losing the changes.
 */
export function confirmLeave(
  t: (key: TranslationKey) => string,
): Promise<boolean> {
  if (!hasUnsaved()) return Promise.resolve(true);
  return askConfirm(t("unsaved.message"), {
    title: t("unsaved.title"),
    accept: t("unsaved.leave"),
    cancel: t("unsaved.stay"),
  });
}

// Closing or reloading the tab: the browser shows its own generic prompt
// (the text cannot be customised).
window.addEventListener("beforeunload", (e) => {
  if (!hasUnsaved()) return;
  e.preventDefault();
  e.returnValue = "";
});
