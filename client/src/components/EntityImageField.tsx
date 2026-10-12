import { ImageUploadField } from "./ImageUploadField";
import type { usePendingImage } from "../hooks/usePendingImage";
import { entityImageUrl, type EntityImageKind } from "../lib/images";

interface EntityImageFieldProps {
  kind: EntityImageKind;
  label: string;
  entity: { id: string; hasImage?: boolean };
  pending: ReturnType<typeof usePendingImage>;
  imageVersion?: number;
  onUpload?: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
}

export function EntityImageField({
  kind,
  label,
  entity,
  pending,
  imageVersion = 0,
  onUpload,
  onRemove,
}: EntityImageFieldProps) {
  if (entity.id && onUpload && onRemove) {
    return (
      <ImageUploadField
        label={label}
        imageUrl={entityImageUrl(
          kind,
          entity.id,
          entity.hasImage,
          imageVersion,
        )}
        onUpload={onUpload}
        onRemove={onRemove}
      />
    );
  }
  if (entity.id) return null;
  return (
    <ImageUploadField
      label={label}
      imageUrl={pending.url}
      onUpload={pending.set}
      onRemove={pending.clear}
    />
  );
}
