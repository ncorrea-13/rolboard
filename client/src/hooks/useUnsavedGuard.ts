import { useEffect } from "react";
import { registerUnsaved } from "../lib/unsavedGuard";

/**
 * Marks the calling form as holding unsaved changes while `dirty` is true.
 * App's navigate() and popstate handling ask for confirmation before leaving.
 * Programmatic navigation after a save uses `{ replace: true }` and skips the
 * prompt, so a form must not call this from its save path.
 */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => (dirty ? registerUnsaved() : undefined), [dirty]);
}
