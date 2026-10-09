import { useEffect, useEffectEvent, useState } from "react";
import { Trash2 } from "lucide-react";
import "../styles/list.css";
import { apiFetch } from "../lib/api";
import { useT, type TranslationKey } from "../lib/i18n";

interface TrashItem {
  kind: string;
  id: number;
  label: string;
  deleted_at: string;
}

const KINDS: { kind: string; titleKey: TranslationKey }[] = [
  { kind: "session", titleKey: "trash.session" },
  { kind: "arc", titleKey: "trash.arc" },
  { kind: "npc", titleKey: "trash.npc" },
  { kind: "player_character", titleKey: "trash.player_character" },
  { kind: "location", titleKey: "trash.location" },
  { kind: "group", titleKey: "trash.group" },
  { kind: "quest", titleKey: "trash.quest" },
  { kind: "encounter", titleKey: "trash.encounter" },
];

interface TrashProps {
  campaignId: string;
  onRestored: () => void;
  notify: (message: string, type?: "success" | "error", err?: unknown) => void;
}

export function Trash({ campaignId, onRestored, notify }: TrashProps) {
  const t = useT();
  const [items, setItems] = useState<TrashItem[]>();
  const [busyKey, setBusyKey] = useState<string>();

  const loadFailed = useEffectEvent((err: unknown) => {
    notify(t("toast.errorLoading"), "error", err);
  });

  useEffect(() => {
    apiFetch<TrashItem[]>(`/campaigns/${campaignId}/trash`)
      .then(setItems)
      .catch(loadFailed);
  }, [campaignId]);

  function restore(item: TrashItem) {
    const key = `${item.kind}:${item.id}`;
    setBusyKey(key);
    apiFetch(`/campaigns/${campaignId}/trash/${item.kind}/${item.id}/restore`, {
      method: "POST",
    })
      .then(() => {
        setItems((prev) =>
          prev?.filter((i) => i.kind !== item.kind || i.id !== item.id),
        );
        onRestored();
        notify(t("trash.restored"));
      })
      .catch((err) => notify(t("trash.errorRestoring"), "error", err))
      .finally(() => setBusyKey(undefined));
  }

  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Trash2 size={22} strokeWidth={1.75} />
          <div>
            <div className="display" style={{ fontSize: 21 }}>
              {t("trash.title")}
            </div>
            <span className="list-page__count">{t("trash.subtitle")}</span>
          </div>
        </div>
      </div>

      {items?.length === 0 && (
        <div className="list-page__row-sub" style={{ marginTop: 16 }}>
          {t("trash.empty")}
        </div>
      )}

      {KINDS.map(({ kind, titleKey }) => {
        const group = items?.filter((i) => i.kind === kind) ?? [];
        if (group.length === 0) return null;
        return (
          <section key={kind} style={{ marginTop: 22 }}>
            <span className="label">
              {t(titleKey)} · {group.length}
            </span>
            <div className="list-page__rows" style={{ marginTop: 8 }}>
              {group.map((item) => (
                <div key={item.id} className="list-page__row">
                  <div className="list-page__row-main">
                    <span className="list-page__row-title">
                      {item.label || `#${item.id}`}
                    </span>
                    <div className="list-page__row-sub">
                      {t("trash.deletedAt")} {item.deleted_at}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    disabled={busyKey !== undefined}
                    onClick={() => restore(item)}
                  >
                    {t("trash.restore")}
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
