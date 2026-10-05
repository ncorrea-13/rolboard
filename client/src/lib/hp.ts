/**
 * HP after applying damage (sign -1) or healing (sign 1).
 * Healing never goes above max (but keeps an HP already above it);
 * damage from a positive value stops at 0 (down) and only a new hit goes negative.
 */
export function nextHp(
  current: number,
  max: number | undefined,
  amount: number,
  sign: 1 | -1,
): number {
  if (sign > 0) {
    const healed = current + amount;
    return max == null ? healed : Math.max(current, Math.min(max, healed));
  }
  return current > 0 ? Math.max(0, current - amount) : current - amount;
}

/** Widths (in %) of the HP bar: the base fill and the part above max. */
export function hpBar(current?: number, max?: number) {
  if (current == null || !max) return { fill: 0, overflow: 0, negative: false };
  if (current < 0)
    return { fill: Math.min(100, (-current / max) * 100), overflow: 0, negative: true };
  if (current > max) {
    const fill = (max / current) * 100;
    return { fill, overflow: 100 - fill, negative: false };
  }
  return { fill: (current / max) * 100, overflow: 0, negative: false };
}
