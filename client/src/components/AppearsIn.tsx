import "./AppearsIn.css";
import { Link } from "./Link";
import type { Route } from "../types";

export interface AppearsItem {
  key: string;
  label: string;
  hint?: string;
  route: Route;
}

export interface AppearsGroup {
  title: string;
  items: AppearsItem[];
}

export function AppearsIn({ groups }: { groups: AppearsGroup[] }) {
  const visible = groups.filter((g) => g.items.length > 0);
  if (visible.length === 0) return null;
  return (
    <div className="appears-in">
      {visible.map((g) => (
        <div key={g.title}>
          <span className="label">
            {g.title} ({g.items.length})
          </span>
          <div className="appears-in__items">
            {g.items.map((i) => (
              <Link key={i.key} className="appears-in__item" route={i.route}>
                <span>{i.label}</span>
                {i.hint && <span className="appears-in__hint">{i.hint}</span>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
