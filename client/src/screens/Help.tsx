import { useState } from "react";
import "./Help.css";
import "./NpcDetail.css";
import { LanguageToggle } from "../components/LanguageToggle";
import { Crack } from "../components/Crack";
import { useLang, useT } from "../lib/i18n";
import { openExternal } from "../lib/api";
import { currentMode } from "../lib/appMode";
import { helpContent } from "./helpContent";

const DOCS_URL = "https://github.com/ncorrea-13/rolboard/tree/main/docs";

export function Help({ onBack }: { onBack: () => void }) {
  const t = useT();
  const lang = useLang();
  const mode = currentMode();
  const pages = helpContent[lang]
    .map((p) => ({
      ...p,
      sections: p.sections.filter((s) => !s.modes || s.modes.includes(mode)),
    }))
    .filter((p) => p.sections.length > 0);
  const [pageIndex, setPageIndex] = useState(0);
  const index = Math.min(pageIndex, pages.length - 1);
  const page = pages[index];
  const prev = pages[index - 1];
  const next = pages[index + 1];

  function goTo(i: number) {
    setPageIndex(i);
    document.querySelector(".app-shell__main")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }

  return (
    <main className="help">
      <div className="card help__card">
        <div className="help__header">
          <div className="display page-title">{t("help.title")}</div>
          <div className="help__actions">
            <LanguageToggle />
            <button className="btn btn-primary" onClick={onBack}>
              {t("help.back")}
            </button>
          </div>
        </div>
        <Crack />

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
            {pages.map((p, i) => (
              <div key={p.id} className="help__toc-group">
                <button
                  type="button"
                  className={`help__page-link${i === index ? " help__page-link--active" : ""}`}
                  aria-current={i === index ? "page" : undefined}
                  onClick={() => goTo(i)}
                >
                  {p.title}
                </button>
                {i === index && (
                  <div className="help__sections">
                    {p.sections.map((s) => (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(s.id)?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }}
                      >
                        {s.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="help__body">
            <header className="help__page-head">
              <div className="eyebrow">
                {index + 1} / {pages.length}
              </div>
              <h1 className="display help__page-title">{page.title}</h1>
              <p className="help__page-summary">{page.summary}</p>
            </header>
            {page.sections.map((s) => (
              <section key={s.id} id={s.id} className="help__section">
                <h2 className="display help__title">{s.title}</h2>
                <div className="npc-detail__desc help__md">{s.body}</div>
              </section>
            ))}

            <nav className="help__pager">
              {prev ? (
                <button
                  type="button"
                  className="help__pager-card"
                  onClick={() => goTo(index - 1)}
                >
                  <span className="help__pager-dir">{t("help.prev")}</span>
                  <span className="display help__pager-title">
                    {prev.title}
                  </span>
                </button>
              ) : (
                <span />
              )}
              {next && (
                <button
                  type="button"
                  className="help__pager-card help__pager-card--next"
                  onClick={() => goTo(index + 1)}
                >
                  <span className="help__pager-dir">{t("help.next")}</span>
                  <span className="display help__pager-title">
                    {next.title}
                  </span>
                </button>
              )}
            </nav>

            <a
              className="help__docs"
              href={DOCS_URL}
              target="_blank"
              onClick={openExternal}
              rel="noopener noreferrer"
            >
              {t("help.docs")} ↗
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
