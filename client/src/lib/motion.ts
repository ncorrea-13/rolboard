import { flushSync } from "react-dom";

export type MotionKind = "route";

export function withViewTransition(update: () => void, kind: MotionKind) {
  if (
    !("startViewTransition" in document) ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.motion = kind;
  const transition = document.startViewTransition(() => flushSync(update));
  transition.finished.finally(() => {
    if (root.dataset.motion === kind) delete root.dataset.motion;
  });
}
