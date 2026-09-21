import { useState } from "react";
import { Modal } from "./Modal";
import { MarkdownText } from "./MarkdownText";
import { apiFetch } from "../lib/api";
import { useT } from "../lib/i18n";

/** "View rendered note" button + modal. Renders nothing without a vault note. */
export function RenderedNoteButton({
  campaignId,
  path,
  title,
  fallback,
}: {
  campaignId: string;
  path?: string;
  title: string;
  fallback: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);

  if (!path) return null;

  function openNote() {
    setOpen(true);
    setHtml(null);
    apiFetch<{ html: string }>(
      `/campaigns/${campaignId}/notes/render?path=${encodeURIComponent(path!)}`,
    )
      .then((res) => setHtml(res.html))
      .catch(() => setHtml(null));
  }

  return (
    <>
      <button className="btn btn-secondary" onClick={openNote}>
        {t("entityDetail.viewRenderedNote")}
      </button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)} size="large">
          {html ? (
            <div
              className="npc-detail__desc"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <MarkdownText className="npc-detail__desc" text={fallback} />
          )}
        </Modal>
      )}
    </>
  );
}
