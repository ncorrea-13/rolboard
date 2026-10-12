import { useEffect, useState } from "react";
import { X } from "lucide-react";
import "../screens/NpcEdit.css";
import "./QuestNpcs.css";
import { apiFetch } from "../lib/api";
import { reportError } from "../lib/notify";
import { useT } from "../lib/i18n";
import { Link } from "./Link";
import type { Npc } from "../data/domain";

interface QuestNpc {
  npc_id: number;
  name: string;
  role: string;
}

export function QuestNpcs({ questId, npcs }: { questId: string; npcs: Npc[] }) {
  const t = useT();
  const [linked, setLinked] = useState<QuestNpc[]>([]);
  const [npcId, setNpcId] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    let stale = false;
    apiFetch<QuestNpc[]>(`/quests/${questId}/npcs`)
      .then((data) => {
        if (!stale) setLinked(data ?? []);
      })
      .catch((err) => reportError("toast.errorLoading", err));
    return () => {
      stale = true;
    };
  }, [questId]);

  async function link(id: string, nextRole: string) {
    try {
      await apiFetch(`/quests/${questId}/npcs/${id}`, {
        method: "PUT",
        body: JSON.stringify({ role: nextRole }),
      });
      const name = npcs.find((n) => n.id === id)?.name ?? id;
      setLinked((prev) =>
        [
          ...prev.filter((x) => String(x.npc_id) !== id),
          { npc_id: Number(id), name, role: nextRole.trim() },
        ].sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (err) {
      reportError("common.toastErrorSaving", err);
    }
  }

  async function unlink(id: number) {
    try {
      await apiFetch(`/quests/${questId}/npcs/${id}`, { method: "DELETE" });
      setLinked((prev) => prev.filter((x) => x.npc_id !== id));
    } catch (err) {
      reportError("common.toastErrorDeleting", err);
    }
  }

  async function add() {
    if (!npcId) return;
    await link(npcId, role);
    setNpcId("");
    setRole("");
  }

  const available = npcs.filter(
    (n) => !linked.some((x) => String(x.npc_id) === n.id),
  );

  return (
    <div className="quest-npcs">
      {linked.length === 0 && (
        <div className="npc-edit__hint">{t("questNpcs.empty")}</div>
      )}
      {linked.map((n) => (
        <div key={n.npc_id} className="quest-npcs__row">
          <Link
            className="quest-npcs__name"
            route={{ name: "npc-detail", npcId: String(n.npc_id) }}
          >
            {n.name}
          </Link>
          <input
            className="npc-edit__input quest-npcs__role"
            aria-label={t("questNpcs.role")}
            placeholder={t("questNpcs.rolePlaceholder")}
            defaultValue={n.role}
            maxLength={60}
            onBlur={(e) => {
              if (e.target.value.trim() !== n.role)
                void link(String(n.npc_id), e.target.value);
            }}
          />
          <button
            type="button"
            className="quest-npcs__remove"
            onClick={() => void unlink(n.npc_id)}
            aria-label={t("questNpcs.remove")}
            title={t("questNpcs.remove")}
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      {available.length > 0 && (
        <div className="quest-npcs__row quest-npcs__row--add">
          <select
            className="npc-edit__select npc-edit__select--native quest-npcs__name"
            aria-label={t("questNpcs.addNpc")}
            value={npcId}
            onChange={(e) => setNpcId(e.target.value)}
          >
            <option value="">{t("questNpcs.addNpc")}</option>
            {available.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <input
            className="npc-edit__input quest-npcs__role"
            aria-label={t("questNpcs.role")}
            placeholder={t("questNpcs.rolePlaceholder")}
            value={role}
            maxLength={60}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void add()}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void add()}
            disabled={!npcId}
          >
            {t("npcTypes.add")}
          </button>
        </div>
      )}
    </div>
  );
}
