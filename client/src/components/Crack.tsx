export function Crack() {
  return (
    <div className="crack" aria-hidden="true">
      <span className="crack__line crack__line--short" />
      <svg viewBox="0 0 48 14" width="48" height="14">
        <path d="M0 7 L16 3 L34 11 L48 7" fill="none" stroke="currentColor" />
        <path d="M24 2 L29 7 L24 12 L19 7 Z" fill="var(--accent-obsidian)" />
      </svg>
      <span className="crack__line" />
    </div>
  );
}
