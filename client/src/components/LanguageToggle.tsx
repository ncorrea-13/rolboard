import { setLang, useLang } from "../lib/i18n";

export function LanguageToggle() {
  const lang = useLang();
  return (
    <button
      className="btn btn-secondary"
      onClick={() => setLang(lang === "es" ? "en" : "es")}
      title={lang === "es" ? "Switch to English" : "Cambiar a español"}
    >
      {lang === "es" ? "EN" : "ES"}
    </button>
  );
}
