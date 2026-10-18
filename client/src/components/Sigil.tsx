export type SigilVariant = "circle" | "astrolabe" | "runes";

// Seven-pointed star ({7/3}), one continuous stroke.
const HEPTAGRAM = Array.from({ length: 7 }, (_, n) => {
  const angle = ((-90 + (((n * 3) % 7) * 360) / 7) * Math.PI) / 180;
  return `${(200 + 118 * Math.cos(angle)).toFixed(1)},${(200 + 118 * Math.sin(angle)).toFixed(1)}`;
}).join(" ");

const TICKS = Array.from({ length: 72 }, (_, i) => i);
const RUNES = Array.from({ length: 12 }, (_, i) => i);
const SPOKES = Array.from({ length: 8 }, (_, i) => i);
const FINE_TICKS = Array.from({ length: 48 }, (_, i) => i);

const GLYPHS = [
  "M10 2V18M10 6L16 10M10 10L16 14",
  "M5 2V18M5 2L14 7L5 12",
  "M4 18L10 2L16 18M6.5 12H13.5",
  "M5 2L15 10L5 18M10 2V18",
  "M4 4L16 4M10 4V18M4 12L16 12",
  "M5 18V2L15 18V2",
  "M4 2L16 18M16 2L4 18",
  "M10 2L16 10L10 18L4 10Z",
  "M5 2V18M15 2V18M5 10H15",
  "M4 18L10 2L16 18",
  "M5 2L15 2L5 18L15 18",
  "M10 2V18M4 8L10 14L16 8",
];

export function Sigil({
  className = "",
  variant = "circle",
}: {
  className?: string;
  variant?: SigilVariant;
}) {
  return (
    <svg
      className={`sigil ${className}`.trim()}
      viewBox="0 0 400 400"
      aria-hidden="true"
    >
      {variant === "circle" && <CircleSigil />}
      {variant === "astrolabe" && <AstrolabeSigil />}
      {variant === "runes" && <RuneSigil />}
    </svg>
  );
}

function CircleSigil() {
  return (
    <>
      <circle className="sigil__ring" cx="200" cy="200" r="192" />
      <circle
        className="sigil__ring sigil__ring--soft"
        cx="200"
        cy="200"
        r="176"
      />
      {TICKS.map((i) => (
        <line
          key={i}
          className="sigil__tick"
          x1="200"
          y1={i % 6 === 0 ? 12 : 18}
          x2="200"
          y2="24"
          transform={`rotate(${i * 5} 200 200)`}
        />
      ))}
      <circle className="sigil__ring" cx="200" cy="200" r="128" />
      {RUNES.map((i) => (
        <path
          key={i}
          className="sigil__rune"
          d="M200 58 L206 68 L200 78 L194 68 Z"
          transform={`rotate(${i * 30} 200 200)`}
        />
      ))}
      <polygon className="sigil__star" points={HEPTAGRAM} />
      <circle
        className="sigil__ring sigil__ring--soft"
        cx="200"
        cy="200"
        r="46"
      />
    </>
  );
}

function AstrolabeSigil() {
  return (
    <>
      <circle className="sigil__ring" cx="200" cy="200" r="192" />
      <circle
        className="sigil__ring sigil__ring--soft"
        cx="200"
        cy="200"
        r="150"
      />
      <circle className="sigil__ring" cx="200" cy="200" r="104" />
      <circle
        className="sigil__ring sigil__ring--soft"
        cx="200"
        cy="200"
        r="58"
      />
      {FINE_TICKS.map((i) => (
        <line
          key={i}
          className="sigil__tick"
          x1="200"
          y1={i % 4 === 0 ? 14 : 20}
          x2="200"
          y2="26"
          transform={`rotate(${i * 7.5} 200 200)`}
        />
      ))}
      {SPOKES.map((i) => (
        <g key={i} transform={`rotate(${i * 45} 200 200)`}>
          <line className="sigil__star" x1="200" y1="142" x2="200" y2="50" />
          <circle className="sigil__bead" cx="200" cy="50" r="7" />
          <path
            className="sigil__rune"
            d="M200 90 L204 96 L200 102 L196 96 Z"
          />
        </g>
      ))}
      <circle className="sigil__bead" cx="200" cy="200" r="10" />
    </>
  );
}

function RuneSigil() {
  return (
    <>
      <circle className="sigil__ring" cx="200" cy="200" r="192" />
      <circle
        className="sigil__ring sigil__ring--soft"
        cx="200"
        cy="200"
        r="150"
      />
      {GLYPHS.map((d, i) => (
        <path
          key={i}
          className="sigil__glyph"
          d={d}
          transform={`rotate(${i * 30} 200 200) translate(190 20)`}
        />
      ))}
      <g transform="translate(200 200) scale(1.15)">
        <polygon
          className="sigil__star"
          points="0,-100 87,-50 87,50 0,100 -87,50 -87,-50"
        />
        <polygon className="sigil__star" points="0,-66 57,34 -57,34" />
        <path
          className="sigil__star"
          d="M0 -100V-66M87 -50L0 -66M87 -50L57 34M87 50L57 34M0 100L57 34M0 100L-57 34M-87 50L-57 34M-87 -50L0 -66M-87 -50L-57 34"
        />
      </g>
    </>
  );
}
