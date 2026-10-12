import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { reportError } from "../lib/notify";
import type { SessionType } from "../data/domain";

export interface AppearanceSession {
  id: string;
  sessionNumber: number;
  subNumber: number;
  sessionType: SessionType;
  title: string;
}

export interface Appearances {
  sessions: AppearanceSession[];
  quests: { id: string; title: string; status: string; role: string }[];
  encounters: { id: string; name: string }[];
  secrets: { id: string; title: string; status: string }[];
}

interface ApiAppearances {
  sessions: {
    id: number;
    session_number: number;
    sub_number: number;
    session_type: string;
    title: string;
  }[];
  quests: { id: number; title: string; status: string; role: string }[];
  encounters: { id: number; name: string }[];
  secrets: { id: number; title: string; status: string }[];
}

export const emptyAppearances: Appearances = {
  sessions: [],
  quests: [],
  encounters: [],
  secrets: [],
};

export function useAppearances(
  kind: "npcs" | "player-characters",
  id: string,
): Appearances {
  const [data, setData] = useState<Appearances>(emptyAppearances);

  useEffect(() => {
    let stale = false;
    apiFetch<ApiAppearances>(`/${kind}/${id}/appearances`)
      .then((a) => {
        if (stale) return;
        setData({
          sessions: (a.sessions ?? []).map((s) => ({
            id: String(s.id),
            sessionNumber: s.session_number,
            subNumber: s.sub_number,
            sessionType: s.session_type as SessionType,
            title: s.title,
          })),
          quests: (a.quests ?? []).map((q) => ({ ...q, id: String(q.id) })),
          encounters: (a.encounters ?? []).map((e) => ({
            ...e,
            id: String(e.id),
          })),
          secrets: (a.secrets ?? []).map((s) => ({ ...s, id: String(s.id) })),
        });
      })
      .catch((err) => reportError("toast.errorLoading", err));
    return () => {
      stale = true;
    };
  }, [kind, id]);

  return data;
}
