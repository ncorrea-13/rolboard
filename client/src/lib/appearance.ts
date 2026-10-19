const AURA_KEY = "rolboard.aura";

function stored(): boolean | null {
  try {
    const v = localStorage.getItem(AURA_KEY);
    return v === null ? null : v !== "off";
  } catch {
    return null;
  }
}

export function getAura(): boolean {
  return stored() ?? document.documentElement.dataset.aura !== "off";
}

export function setAura(on: boolean) {
  try {
    localStorage.setItem(AURA_KEY, on ? "on" : "off");
  } catch {
    // storage blocked: the choice only lasts until reload
  }
  applyAura(on);
}

export function applyAura(on: boolean) {
  document.documentElement.dataset.aura = on ? "on" : "off";
}

/** The device choice wins; otherwise the Docker client's `AURA` env (served by Caddy as /config.json). */
export async function initAura() {
  let on = stored();
  if (on === null) {
    try {
      const res = await fetch("/config.json");
      on = ((await res.json()) as { aura?: string }).aura !== "off";
    } catch {
      on = true; // desktop, Android and vite dev have no /config.json
    }
  }
  applyAura(on);
}
