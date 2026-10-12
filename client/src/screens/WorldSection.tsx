import { useState } from "react";
import { Tabs } from "../components/Tabs";
import { useT } from "../lib/i18n";
import { LoreList } from "./LoreList";
import { TimelineView } from "./TimelineView";

type WorldTab = "lore" | "timeline";
const TAB_STORAGE_KEY = "rolboard.worldTab";

function readStoredTab(): WorldTab {
  try {
    return localStorage.getItem(TAB_STORAGE_KEY) === "timeline"
      ? "timeline"
      : "lore";
  } catch {
    return "lore";
  }
}

type WorldSectionProps = {
  lore: React.ComponentProps<typeof LoreList>;
  timeline: React.ComponentProps<typeof TimelineView>;
};

export function WorldSection({ lore, timeline }: WorldSectionProps) {
  const t = useT();
  const [tab, setTab] = useState<WorldTab>(readStoredTab);

  function selectTab(next: WorldTab) {
    setTab(next);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      return;
    }
  }

  return (
    <div>
      <Tabs
        tabs={[
          { key: "lore", label: t("world.tabLore") },
          { key: "timeline", label: t("world.tabTimeline") },
        ]}
        active={tab}
        onChange={selectTab}
      />
      {tab === "lore" ? <LoreList {...lore} /> : <TimelineView {...timeline} />}
    </div>
  );
}
