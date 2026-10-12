import { useEffect, useEffectEvent, useState } from "react";
import { apiFetch } from "../lib/api";
import { askConfirm } from "../lib/confirm";
import { useT } from "../lib/i18n";
import {
  mapSecret,
  secretToApiPayload,
  type ApiSecret,
  type SecretValues,
} from "../lib/apiMappers";
import type { Secret } from "../data/domain";
import type { Route } from "../types";

type Notify = (
  message: string,
  type?: "success" | "error",
  err?: unknown,
) => void;

export function useSecrets(
  campaignId: string | null,
  reloadKey: number,
  navigate: (route: Route, opts?: { replace?: boolean }) => void,
  notify: Notify,
) {
  const t = useT();
  const [secrets, setSecrets] = useState<Secret[]>([]);

  const loadFailed = useEffectEvent((err: unknown) => {
    notify(t("toast.errorLoading"), "error", err);
  });

  useEffect(() => {
    if (!campaignId) return;
    let stale = false;
    apiFetch<ApiSecret[]>(`/campaigns/${campaignId}/secrets`)
      .then((data) => {
        if (!stale) setSecrets((data ?? []).map(mapSecret));
      })
      .catch((err) => loadFailed(err));
    return () => {
      stale = true;
    };
  }, [campaignId, reloadKey]);

  function requireTitle(values: SecretValues): boolean {
    if (values.title.trim()) return true;
    notify(`${t("toast.missingFields")}: ${t("secretEdit.title")}`, "error");
    return false;
  }

  function fail(
    kind: "toastErrorCreating" | "toastErrorSaving" | "toastErrorDeleting",
    err: unknown,
  ) {
    notify(`${t(`common.${kind}`)} ${t("common.nounSecret")}`, "error", err);
  }

  function createSecret(values: SecretValues) {
    if (!requireTitle(values)) return;
    apiFetch<ApiSecret>(`/campaigns/${campaignId}/secrets`, {
      method: "POST",
      body: JSON.stringify(secretToApiPayload(values)),
    })
      .then((created) => {
        const secret = mapSecret(created);
        setSecrets((prev) => [secret, ...prev]);
        navigate(
          { name: "secret-detail", secretId: secret.id },
          { replace: true },
        );
      })
      .catch((err) => fail("toastErrorCreating", err));
  }

  function saveSecret(id: string, values: SecretValues, stay = false) {
    if (!requireTitle(values)) return;
    apiFetch<ApiSecret>(`/secrets/${id}`, {
      method: "PUT",
      body: JSON.stringify(secretToApiPayload(values)),
    })
      .then((saved) => {
        const secret = mapSecret(saved);
        setSecrets((prev) => prev.map((s) => (s.id === id ? secret : s)));
        if (!stay)
          navigate({ name: "secret-detail", secretId: id }, { replace: true });
      })
      .catch((err) => fail("toastErrorSaving", err));
  }

  function toggleStatus(secret: Secret) {
    const revealing = secret.status === "hidden";
    saveSecret(
      secret.id,
      {
        title: secret.title,
        body: secret.body,
        status: revealing ? "revealed" : "hidden",
        revealedSessionId: revealing ? secret.revealedSessionId : undefined,
        npcId: secret.npcId,
        locationId: secret.locationId,
        loreEntryId: secret.loreEntryId,
        knownByNpcIds: secret.knownByNpcIds,
      },
      true,
    );
  }

  async function deleteSecret(id: string) {
    if (!(await askConfirm(t("confirm.deleteSecret")))) return;
    apiFetch(`/secrets/${id}`, { method: "DELETE" })
      .then(() => {
        setSecrets((prev) => prev.filter((s) => s.id !== id));
        navigate({ name: "section", section: "secretos" }, { replace: true });
      })
      .catch((err) => fail("toastErrorDeleting", err));
  }

  return { secrets, createSecret, saveSecret, toggleStatus, deleteSecret };
}
