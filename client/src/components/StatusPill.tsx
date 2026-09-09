import {
  statusColor,
  statusDotColor,
  statusLabel,
  questStatusColor,
  questStatusLabel,
  type StatusKind,
  type QuestStatus,
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
