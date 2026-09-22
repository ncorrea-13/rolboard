import "./Help.css";
import "./NpcDetail.css";
import { LanguageToggle } from "../components/LanguageToggle";
import { useLang, useT } from "../lib/i18n";
import { helpContent } from "./helpContent";

const DOCS_URL = "https://github.com/ncorrea-13/rolboard/tree/main/docs";

export function Help({ onBack }: { onBack: () => void }) {
  const t = useT();
  const lang = useLang();
  const sections = helpContent[lang];

  return (
    <div className="help">
      <div className="card help__card">
        <header className="help__header">
          <div className="display" style={{ fontSize: 21 }}>
            {t("help.title")}
          </div>
          <div className="help__actions">
            <LanguageToggle />
            <button className="btn btn-primary" onClick={onBack}>
              {t("help.back")}
            </button>
          </div>
        </header>

        <div className="help__layout">
          <nav className="help__toc" aria-label={t("help.contents")}>
            <div className="help__logo">
              <img src="/logo-icon.png" alt="" className="help__logo-icon" />
              <img
                src="/logo-wordmark.png"
                alt={t("campaignSelector.title")}
                className="help__logo-wordmark"
              />
            </div>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(s.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {s.title}
              </a>
            ))}
          </nav>

          <div className="help__body">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="help__section">
                <h2 className="display help__title">{s.title}</h2>
                <div className="npc-detail__desc help__md">{s.body}</div>
              </section>
            ))}
            <a
              className="help__docs"
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("help.docs")} ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
