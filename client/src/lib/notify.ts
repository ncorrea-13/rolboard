import type { TranslationKey } from "./i18n";

type Reporter = (key: TranslationKey, err?: unknown, extra?: string) => void;

let reporter: Reporter = () => {};

export function setErrorReporter(r: Reporter) {
  reporter = r;
}

/** Shows an error toast: the translated key, an optional extra text and the reason behind err. */
export function reportError(
  key: TranslationKey,
  err?: unknown,
  extra?: string,
) {
  reporter(key, err, extra);
}
