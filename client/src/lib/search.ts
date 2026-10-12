import type { Route } from "../types";

export type SearchKind =
  | "npc"
  | "player"
  | "location"
  | "faction"
  | "arc"
  | "quest"
  | "session"
  | "encounter"
  | "lore"
  | "secret"
  | "note"
  | "item"
  | "currency"
  | "event";

export interface SearchItem {
  key: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  body: string;
  route: Route;
}

export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Ranks items by where the query matches: title prefix, title, subtitle, body. */
export function searchItems(
  items: SearchItem[],
  query: string,
  limit = 40,
): SearchItem[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const scored: { item: SearchItem; score: number }[] = [];
  for (const item of items) {
    const title = normalize(item.title);
    let score = 0;
    if (title === q) score = 100;
    else if (title.startsWith(q)) score = 80;
    else if (title.split(/\s+/).some((w) => w.startsWith(q))) score = 65;
    else if (title.includes(q)) score = 50;
    else if (item.subtitle && normalize(item.subtitle).includes(q)) score = 30;
    else if (normalize(item.body).includes(q)) score = 10;
    if (score > 0) scored.push({ item, score });
  }
  scored.sort(
    (a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title),
  );
  return scored.slice(0, limit).map((s) => s.item);
}
