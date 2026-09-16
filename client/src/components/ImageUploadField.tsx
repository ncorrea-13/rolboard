import { useRef, useState } from "react";
import "./ImageUploadField.css";
import { useT } from "../lib/i18n";
import { downscaleImage } from "../lib/images";

interface ImageUploadFieldProps {
  label: string;
  imageUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function ImageUploadField({
  label,
  imageUrl,
  onUpload,
  onRemove,
}: ImageUploadFieldProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    downscaleImage(file)
      .then(onUpload)
      .finally(() => setBusy(false));
  }

  function handleRemove() {
    setBusy(true);
    onRemove().finally(() => setBusy(false));
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="image-upload-field">
        <div className="image-upload-field__preview">
          {imageUrl ? (
            <img src={imageUrl} alt={label} />
          ) : (
            <span className="image-upload-field__placeholder">—</span>
          )}
        </div>
        <div className="image-upload-field__actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {imageUrl ? t("imageUpload.replace") : t("imageUpload.upload")}
          </button>
          {imageUrl && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={handleRemove}
            >
              {t("common.remove")}
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: "none" }}
            onChange={handleFile}
          />
        </div>
      </div>
    </div>
  );
}
