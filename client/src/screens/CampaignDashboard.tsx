import type { CSSProperties, ReactNode } from "react";
import {
  CalendarDays,
  Dices,
  Earth,
  MapPin,
  Shield,
  StickyNote,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";
import "./CampaignDashboard.css";
import {
  crystalColor,
  crystalColorFor,
  formatDate,
  isPlayed,
  sessionCode,
  statusColor,
  type Arc,
  type Campaign,
  type LooseNote,
  type LoreCategory,
  type LoreEntry,
  type Npc,
  type PlayerCharacter,
  type Quest,
  type Session,
} from "../data/domain";
import {
  StatusPill,
  ArcStatusPill,
  QuestStatusPill,
} from "../components/StatusPill";
import { EntityIdentity } from "../components/EntityIdentity";
import { MarkdownText } from "../components/MarkdownText";
import { openInObsidian } from "../lib/obsidian";
import { isLocalMode } from "../lib/api";
import { useT } from "../lib/i18n";
import { entityImageUrl } from "../lib/images";
import { Link } from "../components/Link";
import { useCountUp } from "../hooks/useCountUp";

export type DashboardSection =
  | "resumen"
  | "npcs"
  | "sesiones"
  | "arcos"
  | "locaciones"
  | "facciones"
  | "quests"
  | "jugadores"
  | "encuentros"
  | "wardails"
  | "notas"
  | "mundo"
  | "secretos"
  | "objetos"
  | "papelera";

interface DashboardSummaryData {
  activeQuests: Quest[];
  recentNpcs: Npc[];
  lastSession?: Session;
}

interface CampaignDashboardProps {
  campaign: Campaign;
  arcs: Arc[];
  npcs: Npc[];
  quests: Quest[];
  sessions: Session[];
  players: PlayerCharacter[];
  looseNotes: LooseNote[];
  loreEntries: LoreEntry[];
  loreCategories: LoreCategory[];
  locationsCount: number;
  groupsCount: number;
  summary: DashboardSummaryData | null;
  nextSessionNumber: number;
  hasPlannedSession: boolean;
  onNavigate: (section: DashboardSection) => void;
  onOpenSession: (sessionId: string) => void;
  onStartSession: () => void;
  onPlanSession: () => void;
  onReindex: () => void;
  reindexing: boolean;
  imageVersion?: number;
}

function StatItem({
  icon: Icon,
  tone,
  value,
  label,
  hint,
  onClick,
}: {
  icon: LucideIcon;
  tone: string;
  value: number;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  const shown = useCountUp(value);
  return (
    <button
      type="button"
      className="dash-stat"
      style={{ "--tone": tone } as CSSProperties}
      onClick={onClick}
    >
      <span className="dash-stat__icon">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="dash-stat__value">{shown}</span>
      <span className="dash-stat__label">{label}</span>
      {hint && <span className="dash-stat__hint">{hint}</span>}
    </button>
  );
}

function Section({
  title,
  icon: Icon,
  tone,
  index,
  actionLabel,
  onAction,
  empty,
  children,
}: {
  title: string;
  icon: LucideIcon;
  tone: string;
  index: number;
  actionLabel?: string;
  onAction?: () => void;
  empty?: string;
  children: ReactNode[] | ReactNode;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <section
      className="dash-section dash-rise"
      style={{ "--tone": tone, "--i": index } as CSSProperties}
    >
      <div className="dash-section__head">
        <span className="dash-section__icon">
          <Icon size={14} strokeWidth={1.9} />
        </span>
        <span className="label">{title}</span>
        <span className="dash-section__rule" />
        {actionLabel && onAction && (
          <button
            type="button"
            className="campaign-dashboard__list-action"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
      {hasRows ? (
        <div className="dash-section__rows">{children}</div>
      ) : (
        <div className="dash-section__empty">{empty}</div>
      )}
    </section>
  );
}

function ProgressRing({ pct, caption }: { pct: number; caption: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="dash-ring" title={caption}>
      <div className="dash-ring__disc">
        <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
          <circle className="dash-ring__track" cx="32" cy="32" r={radius} />
          <circle
            className="dash-ring__fill"
            cx="32"
            cy="32"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
          />
        </svg>
        <span className="dash-ring__pct">{pct}%</span>
      </div>
      <span className="dash-ring__caption">{caption}</span>
    </div>
  );
}

function hpTone(pct: number): string {
  if (pct > 60) return "var(--status-alive)";
  if (pct > 30) return "var(--accent-flame)";
  return "var(--status-dead)";
}

function daysSince(iso: string): number | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const then = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - then) / 86_400_000));
}

export function CampaignDashboard({
  campaign,
  arcs,
  npcs,
  quests,
  sessions,
  players,
  looseNotes,
  loreEntries,
  loreCategories,
  locationsCount,
  groupsCount,
  summary,
  nextSessionNumber,
  hasPlannedSession,
  onNavigate,
  onOpenSession,
  onStartSession,
  onPlanSession,
  onReindex,
  reindexing,
  imageVersion = 0,
}: CampaignDashboardProps) {
  const t = useT();
  const recentNpcs = summary?.recentNpcs ?? npcs.slice(0, 4);
  const activeQuests =
    summary?.activeQuests ?? quests.filter((q) => q.status === "active");
  const currentArc =
    arcs.find((a) => a.status === "en_curso") ?? arcs[arcs.length - 1];
  const lastSession = summary?.lastSession;
  const sinceDays = lastSession?.date ? daysSince(lastSession.date) : null;
  const sinceLabel =
    sinceDays === null
      ? ""
      : sinceDays === 0
        ? t("dashboard.today")
        : sinceDays === 1
          ? t("dashboard.yesterday")
          : t("dashboard.daysAgo").replace("{n}", String(sinceDays));
  const subarcs = currentArc?.subarcOrder
    ? arcs.filter((a) => a.order === currentArc.order && a.subarcOrder)
    : [];
  const closedSubarcs = subarcs.filter((a) => a.status === "cerrado").length;
  const arcSessionsPlayed = currentArc
    ? sessions.filter(
        (s) =>
          s.arcId === currentArc.id &&
          s.sessionType !== "oneshot" &&
          isPlayed(s),
      ).length
    : 0;

  const oneshots = sessions.filter((s) => s.sessionType === "oneshot");
  const playedSessions = sessions.filter(
    (s) => s.sessionType !== "oneshot" && isPlayed(s),
  );
  const pendingNotes = looseNotes.filter((n) => n.pending);
  const recentLore = [...loreEntries]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);

  const tones = {
    sessions: "var(--status-alive)",
    npcs: crystalColor.npc,
    players: "var(--status-dead)",
    locations: crystalColor.location,
    factions: crystalColor["faction-quest"],
    quests: "var(--accent-teal)",
    lore: "var(--accent-lime)",
    notes: "var(--accent-orchid)",
    oneshot: "var(--accent-flame)",
  };

  return (
    <div className="campaign-dashboard">
      <header className="dash-head">
        <div className="dash-head__titles">
          <div className="display dash-head__name">{campaign.name}</div>
          <div className="dash-head__meta">
            <span>{campaign.system}</span>
            {currentArc && (
              <>
                <span className="dash-head__sep">·</span>
                <span>{currentArc.label}</span>
                {currentArc.meta && (
                  <>
                    <span className="dash-head__sep">·</span>
                    <span>{currentArc.meta}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="campaign-dashboard__actions">
          {currentArc?.obsidianPath && !isLocalMode() && (
            <button
              className="btn btn-secondary"
              onClick={() =>
                openInObsidian(campaign.vaultPath, currentArc.obsidianPath)
              }
            >
              {t("entityDetail.openInObsidian")}
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={onReindex}
            disabled={reindexing}
          >
            {reindexing
              ? t("dashboard.reindexing")
              : t("dashboard.reindexVault")}
          </button>
          {hasPlannedSession ? (
            <button className="btn btn-primary" onClick={onStartSession}>
              {t("sessionsTimeline.play")} {nextSessionNumber}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onPlanSession}>
              {t("sessionsTimeline.plan")}
            </button>
          )}
        </div>
      </header>

      <div className="dash-ledger">
        <StatItem
          icon={CalendarDays}
          tone={tones.sessions}
          value={playedSessions.length}
          label={t("dashboard.stat.sessions")}
          hint={
            oneshots.length
              ? `+ ${oneshots.length} ${t("dashboard.stat.oneshots")}`
              : undefined
          }
          onClick={() => onNavigate("sesiones")}
        />
        <StatItem
          icon={Users}
          tone={tones.npcs}
          value={npcs.length}
          label={t("dashboard.stat.npcs")}
          onClick={() => onNavigate("npcs")}
        />
        <StatItem
          icon={Dices}
          tone={tones.players}
          value={players.length}
          label={t("dashboard.stat.players")}
          onClick={() => onNavigate("jugadores")}
        />
        <StatItem
          icon={MapPin}
          tone={tones.locations}
          value={locationsCount}
          label={t("dashboard.stat.locations")}
          onClick={() => onNavigate("locaciones")}
        />
        <StatItem
          icon={Shield}
          tone={tones.factions}
          value={groupsCount}
          label={t("dashboard.stat.factions")}
          onClick={() => onNavigate("facciones")}
        />
        <StatItem
          icon={Swords}
          tone={tones.quests}
          value={activeQuests.length}
          label={t("dashboard.stat.quests")}
          onClick={() => onNavigate("quests")}
        />
        <StatItem
          icon={Earth}
          tone={tones.lore}
          value={loreEntries.length}
          label={t("dashboard.stat.lore")}
          onClick={() => onNavigate("mundo")}
        />
        <StatItem
          icon={StickyNote}
          tone={tones.notes}
          value={pendingNotes.length}
          label={t("dashboard.stat.notes")}
          onClick={() => onNavigate("notas")}
        />
      </div>

      <div className="dash-layout">
        <div className="dash-main">
          {(currentArc || lastSession) && (
            <div className="dash-pair">
              {currentArc && (
                <Link
                  className="card dash-feature dash-feature--arc dash-feature--clickable dash-rise"
                  style={{ "--i": 1 } as CSSProperties}
                  route={{
                    name: "entity-detail",
                    kind: "arc",
                    id: currentArc.id,
                  }}
                >
                  <div className="campaign-dashboard__panel-top">
                    <span className="label">{t("dashboard.currentArc")}</span>
                    <ArcStatusPill status={currentArc.status} />
                  </div>
                  <div className="dash-feature__split">
                    <div style={{ minWidth: 0 }}>
                      <div className="display dash-feature__title">
                        {currentArc.label}
                      </div>
                      <MarkdownText
                        className="campaign-dashboard__desc campaign-dashboard__desc--clamp"
                        text={currentArc.summary}
                      />
                    </div>
                    {subarcs.length > 1 ? (
                      <ProgressRing
                        pct={Math.round((closedSubarcs / subarcs.length) * 100)}
                        caption={`${closedSubarcs}/${subarcs.length} ${t("dashboard.subarcs")}`}
                      />
                    ) : (
                      <div className="dash-count">
                        <span className="dash-count__value">
                          {arcSessionsPlayed}
                        </span>
                        <span className="dash-count__label">
                          {t("dashboard.arcSessions")}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              )}

              {lastSession && (
                <div
                  className="card dash-feature dash-feature--session dash-feature--clickable dash-rise"
                  style={{ "--i": 2 } as CSSProperties}
                  onClick={() => onOpenSession(lastSession.id)}
                >
                  <div className="campaign-dashboard__panel-top">
                    <span className="label">{t("dashboard.lastSession")}</span>
                    {lastSession.sessionType !== "planning" && (
                      <button
                        className="btn btn-secondary dash-feature__action"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlanSession();
                        }}
                      >
                        {t(
                          hasPlannedSession
                            ? "sessionsTimeline.editPlan"
                            : "sessionsTimeline.plan",
                        )}
                      </button>
                    )}
                  </div>
                  <div className="campaign-dashboard__session-title">
                    <span className="display dash-feature__title">
                      {sessionCode(lastSession)}
                    </span>
                    <span className="campaign-dashboard__session-date">
                      {lastSession.date ? formatDate(lastSession.date) : ""}
                      {sinceLabel ? ` · ${sinceLabel}` : ""}
                    </span>
                  </div>
                  <MarkdownText
                    className="campaign-dashboard__desc campaign-dashboard__desc--clamp"
                    text={lastSession.summary}
                  />
                </div>
              )}
            </div>
          )}

          <Section
            title={t("dashboard.activeQuests")}
            icon={Swords}
            tone={tones.quests}
            index={3}
            actionLabel={t("dashboard.viewAllFem")}
            onAction={() => onNavigate("quests")}
            empty={t("dashboard.empty")}
          >
            {activeQuests.slice(0, 5).map((q) => (
              <Link
                key={q.id}
                className="dash-row dash-row--clickable"
                route={{ name: "entity-detail", kind: "quest", id: q.id }}
              >
                <div className="dash-row__main">
                  <span className="title-underline">
                    <span className="dash-row__title">{q.name}</span>
                    <span
                      className="title-underline__bar"
                      style={{ background: crystalColor[q.crystal] }}
                    />
                  </span>
                  <div className="dash-row__sub">
                    <MarkdownText inline text={q.hook} />
                  </div>
                </div>
                <QuestStatusPill status={q.status} />
              </Link>
            ))}
          </Section>

          <Section
            title={t("dashboard.recentNpcs")}
            icon={Users}
            tone={tones.npcs}
            index={4}
            actionLabel={t("dashboard.viewAllMasc")}
            onAction={() => onNavigate("npcs")}
            empty={t("dashboard.empty")}
          >
            {recentNpcs.map((n) => (
              <Link
                key={n.id}
                className="dash-row dash-row--clickable"
                route={{ name: "npc-detail", npcId: n.id }}
              >
                <div className="dash-row__main">
                  <EntityIdentity
                    initials={n.initials}
                    name={n.name}
                    role={n.statusNote ?? n.role}
                    color={crystalColorFor(n.crystal)}
                    imageUrl={entityImageUrl(
                      "npc",
                      n.id,
                      n.hasImage,
                      imageVersion,
                    )}
                  />
                </div>
                <StatusPill status={n.status} />
              </Link>
            ))}
          </Section>
        </div>

        <aside className="dash-side">
          <Section
            title={t("dashboard.party")}
            icon={Dices}
            tone={tones.players}
            index={3}
            actionLabel={t("dashboard.viewAllMasc")}
            onAction={() => onNavigate("jugadores")}
            empty={t("dashboard.empty")}
          >
            {players.slice(0, 5).map((p) => {
              const hasHp = p.currentHp != null && p.maxHp;
              const hpPct = hasHp
                ? Math.max(
                    0,
                    Math.min(100, ((p.currentHp ?? 0) / (p.maxHp ?? 1)) * 100),
                  )
                : 0;
              return (
                <Link
                  key={p.id}
                  className="dash-row dash-row--clickable"
                  route={{ name: "player-detail", playerId: p.id }}
                >
                  <div className="dash-row__main">
                    <EntityIdentity
                      initials={p.characterName.slice(0, 2).toUpperCase()}
                      name={p.characterName}
                      role={`${p.race}${p.class && p.class !== "—" ? ` · ${p.class}` : ""}`}
                      color={statusColor[p.status]}
                      imageUrl={entityImageUrl(
                        "player-character",
                        p.id,
                        p.hasImage,
                        imageVersion,
                      )}
                    />
                    {hasHp && (
                      <div className="dash-hp">
                        <div className="dash-hp__track">
                          <div
                            className="dash-hp__fill"
                            style={{
                              width: `${hpPct}%`,
                              background: hpTone(hpPct),
                            }}
                          />
                        </div>
                        <span className="dash-hp__label">
                          {p.currentHp}/{p.maxHp}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </Section>

          <Section
            title={t("dashboard.pendingNotes")}
            icon={StickyNote}
            tone={tones.notes}
            index={4}
            actionLabel={t("dashboard.viewAllFem")}
            onAction={() => onNavigate("notas")}
            empty={t("dashboard.empty")}
          >
            {pendingNotes.slice(0, 4).map((n) => (
              <Link
                key={n.id}
                className="dash-row dash-row--clickable"
                route={{ name: "note-detail", noteId: n.id }}
              >
                <div className="dash-row__main">
                  <span className="dash-row__title">{n.title}</span>
                  {n.body && (
                    <div className="dash-row__sub">
                      <MarkdownText inline text={n.body} />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </Section>

          <Section
            title={t("dashboard.recentLore")}
            icon={Earth}
            tone={tones.lore}
            index={5}
            actionLabel={t("dashboard.viewAllFem")}
            onAction={() => onNavigate("mundo")}
            empty={t("dashboard.empty")}
          >
            {recentLore.map((e) => {
              const category = loreCategories.find(
                (c) => c.id === e.categoryId,
              );
              return (
                <Link
                  key={e.id}
                  className="dash-row dash-row--clickable"
                  route={{ name: "lore-detail", entryId: e.id }}
                >
                  <div className="dash-row__main">
                    <span className="dash-row__title">{e.title}</span>
                    {e.body && (
                      <div className="dash-row__sub">
                        <MarkdownText inline text={e.body} />
                      </div>
                    )}
                  </div>
                  {category && (
                    <span
                      className="list-page__badge"
                      style={{
                        color: category.color,
                        borderColor: category.color,
                      }}
                    >
                      {category.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </Section>

          <Section
            title={t("dashboard.oneshots")}
            icon={CalendarDays}
            tone={tones.oneshot}
            index={6}
            actionLabel={t("dashboard.viewAllMasc")}
            onAction={() => onNavigate("sesiones")}
            empty={t("dashboard.empty")}
          >
            {oneshots
              .slice(-4)
              .reverse()
              .map((s) => (
                <Link
                  key={s.id}
                  className="dash-row dash-row--clickable"
                  route={{ name: "session-detail", sessionId: s.id }}
                >
                  <span className="dash-oneshot__code">{sessionCode(s)}</span>
                  <div className="dash-row__main">
                    <span className="dash-row__title">
                      {s.title || t("dashboard.untitled")}
                    </span>
                  </div>
                  {!isPlayed(s) && (
                    <span className="npc-detail__appearance-chip">
                      {t("sessionsTimeline.planned")}
                    </span>
                  )}
                </Link>
              ))}
          </Section>
        </aside>
      </div>
    </div>
  );
}
