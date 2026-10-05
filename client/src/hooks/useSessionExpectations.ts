import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { reportError } from "../lib/notify";

/** Loads the NPCs and quests expected for a planned session. */
export function useSessionExpectations(sessionId: string) {
  const [npcs, setNpcs] = useState<{ npc_id: number; name: string }[]>([]);
  const [quests, setQuests] = useState<{ quest_id: number; title: string }[]>(
    [],
  );

  useEffect(() => {
    apiFetch<{ npc_id: number; name: string }[]>(`/sessions/${sessionId}/npcs`)
      .then((data) => setNpcs(data ?? []))
      .catch((err) => {
        console.error("Error cargando NPCs esperados:", err);
        reportError("toast.errorLoading", err);
      });
    apiFetch<{ quest_id: number; title: string }[]>(
      `/sessions/${sessionId}/quests`,
    )
      .then((data) => setQuests(data ?? []))
      .catch((err) => {
        console.error("Error cargando quests esperadas:", err);
        reportError("toast.errorLoading", err);
      });
  }, [sessionId]);

  return { npcs, quests };
}
