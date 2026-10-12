import "./Tabs.css";

export function Tabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: K; label: string }[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((x) => (
        <button
          key={x.key}
          role="tab"
          aria-selected={active === x.key}
          className={`tabs__tab${active === x.key ? " tabs__tab--active" : ""}`}
          onClick={() => onChange(x.key)}
        >
          {x.label}
        </button>
      ))}
    </div>
  );
}
