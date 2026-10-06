import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import "./VaultsRootPicker.css";
import { apiFetch } from "../lib/api";
import { useT } from "../lib/i18n";
import { reportError } from "../lib/notify";

interface VaultsRoot {
  vaultsRoot: string;
}

export function VaultsRootPicker({ onChange }: { onChange: () => void }) {
  const t = useT();
  const [root, setRoot] = useState("");
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    apiFetch<VaultsRoot>("/desktop/vaults-root")
      .then((r) => setRoot(r.vaultsRoot))
      .catch((err) =>
        console.error("Error leyendo la carpeta de vaults:", err),
      );
  }, []);

  async function pick() {
    if (picking) return;
    setPicking(true);
    try {
      const r = await apiFetch<VaultsRoot | undefined>("/desktop/vaults-root", {
        method: "POST",
      });
      if (r) {
        setRoot(r.vaultsRoot);
        onChange();
      }
    } catch (err) {
      reportError("toast.errorVaultsRoot", err);
    } finally {
      setPicking(false);
    }
  }

  return (
    <div>
      <span className="label">{t("vaultsRoot.label")}</span>
      <div className="vaults-root">
        <FolderOpen
          className="vaults-root__icon"
          size={15}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span
          className={`vaults-root__path${root ? "" : " vaults-root__path--empty"}`}
          title={root || undefined}
        >
          {root || t("vaultsRoot.none")}
        </span>
        <button
          className="btn btn-secondary vaults-root__btn"
          onClick={pick}
          disabled={picking}
          type="button"
        >
          {t(root ? "vaultsRoot.change" : "vaultsRoot.pick")}
        </button>
      </div>
    </div>
  );
}
