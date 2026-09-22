import "./Splash.css";
import { BookOpenText } from "lucide-react";
import {
  GITHUB_URL,
  PORTFOLIO_URL,
  GithubIcon,
  PortfolioIcon,
} from "../components/SiteFooter";
import { LanguageToggle } from "../components/LanguageToggle";
import { useT } from "../lib/i18n";

interface SplashProps {
  onContinue: () => void;
  onHelp: () => void;
}

export function Splash({ onContinue, onHelp }: SplashProps) {
  const t = useT();
  return (
    <div className="splash">
      <div className="splash__lang">
        <LanguageToggle />
      </div>
      <div className="splash__logo">
        <img src="/logo-icon.png" alt="" className="splash__logo-icon" />
        <img
          src="/logo-wordmark.png"
          alt={t("campaignSelector.title")}
          className="splash__logo-wordmark"
        />
      </div>
      <p className="splash__tagline">{t("splash.tagline")}</p>
      <button className="btn btn-primary splash__enter" onClick={onContinue}>
        {t("splash.enter")}
      </button>
      <div className="splash__links">
        <a
          href="/help"
          onClick={(e) => {
            e.preventDefault();
            onHelp();
          }}
          className="splash__link"
        >
          <BookOpenText size={15} strokeWidth={1.6} />
          {t("footer.help")}
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="splash__link"
        >
          <GithubIcon />
          {t("splash.repo")}
        </a>
        <a
          href={PORTFOLIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="splash__link"
        >
          <PortfolioIcon />
          {t("splash.credits")}
        </a>
      </div>
    </div>
  );
}
