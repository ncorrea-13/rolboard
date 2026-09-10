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
  type StatusKind,
  type QuestStatus,
  type CampaignStatus,
  type ArcStatus,
} from "../data/mock";

export function StatusPill({
  status,
  label,
}: {
  status: StatusKind;
  label?: string;
}) {
  return (
    <span className="status-pill" style={{ color: statusColor[status] }}>
      <span
        className="status-dot"
        style={{ background: statusDotColor[status] }}
      />
      {label ?? statusLabel[status]}
    </span>
  );
}

export function QuestStatusPill({ status }: { status: QuestStatus }) {
  const color = questStatusColor[status];
  return (
    <span className="status-pill" style={{ color }}>
      <span className="status-dot" style={{ background: color }} />
      {questStatusLabel[status]}
    </span>
  );
}

export function ArcStatusPill({ status }: { status: ArcStatus }) {
  const color = arcStatusColor[status];
  return (
    <span className="status-pill" style={{ color }}>
      <span className="status-dot" style={{ background: color }} />
      {arcStatusLabel[status]}
    </span>
  );
}

export function CampaignStatusPill({ status }: { status: CampaignStatus }) {
  return (
    <span className="status-pill" style={{ color: campaignStatusColor[status] }}>
      <span
        className="status-dot"
        style={{ background: campaignStatusDotColor[status] }}
      />
      {campaignStatusLabel[status]}
    </span>
  );
}
