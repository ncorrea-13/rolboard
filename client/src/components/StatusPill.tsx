import {
  statusColor,
  statusDotColor,
  statusLabel,
  questStatusColor,
  questStatusLabel,
  campaignStatusColor,
  campaignStatusDotColor,
  campaignStatusLabel,
  arcStatusColor,
  arcStatusLabel,
  encounterStatusColor,
  encounterStatusLabel,
  type StatusKind,
  type QuestStatus,
  type CampaignStatus,
  type ArcStatus,
  type EncounterStatus,
} from "../data/domain";
import { useLang } from "../lib/i18n";

export function StatusPill({
  status,
  label,
}: {
  status: StatusKind;
  label?: string;
}) {
  const lang = useLang();
  return (
    <span className="status-pill" style={{ color: statusColor[status] }}>
      <span
        className="status-dot"
        style={{ background: statusDotColor[status] }}
      />
      {label ?? statusLabel[lang][status]}
    </span>
  );
}

export function QuestStatusPill({ status }: { status: QuestStatus }) {
  const lang = useLang();
  const color = questStatusColor[status];
  return (
    <span className="status-pill" style={{ color }}>
      <span className="status-dot" style={{ background: color }} />
      {questStatusLabel[lang][status]}
    </span>
  );
}

export function ArcStatusPill({ status }: { status: ArcStatus }) {
  const lang = useLang();
  const color = arcStatusColor[status];
  return (
    <span className="status-pill" style={{ color }}>
      <span className="status-dot" style={{ background: color }} />
      {arcStatusLabel[lang][status]}
    </span>
  );
}

export function EncounterStatusPill({ status }: { status: EncounterStatus }) {
  const lang = useLang();
  const color = encounterStatusColor[status];
  return (
    <span className="status-pill" style={{ color }}>
      <span className="status-dot" style={{ background: color }} />
      {encounterStatusLabel[lang][status]}
    </span>
  );
}

export function CampaignStatusPill({ status }: { status: CampaignStatus }) {
  const lang = useLang();
  return (
    <span className="status-pill" style={{ color: campaignStatusColor[status] }}>
      <span
        className="status-dot"
        style={{ background: campaignStatusDotColor[status] }}
      />
      {campaignStatusLabel[lang][status]}
    </span>
  );
}
