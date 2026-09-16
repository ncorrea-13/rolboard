import "./EntityIdentity.css";

interface EntityIdentityProps {
  initials: string;
  name: string;
  role: string;
  color: string;
  size?: "row" | "header";
  imageUrl?: string;
}

export function EntityIdentity({
  initials,
  name,
  role,
  color,
  size = "row",
  imageUrl,
}: EntityIdentityProps) {
  return (
    <div className={`entity-identity entity-identity--${size}`}>
      <div
        className="entity-identity__tile"
        style={{ borderColor: color, color }}
      >
        {imageUrl ? (
          <img className="entity-identity__image" src={imageUrl} alt="" />
        ) : (
          initials
        )}
      </div>
      <div className="entity-identity__text">
        <span className="entity-identity__name-wrap">
          <span className="entity-identity__name">{name}</span>
          <span
            className="entity-identity__underline"
            style={{ background: color }}
          />
        </span>
        <div className="entity-identity__role">{role}</div>
      </div>
    </div>
  );
}
