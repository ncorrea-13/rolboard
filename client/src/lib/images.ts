const basePathByKind = {
  npc: "/npcs",
  "player-character": "/player-characters",
  location: "/locations",
  group: "/groups",
} as const;

export type EntityImageKind = keyof typeof basePathByKind;

export function entityImageUrl(
  kind: EntityImageKind,
  id: string,
  hasImage: boolean | undefined,
  version: number,
): string | undefined {
  if (!hasImage || !id) return undefined;
  return `/api${basePathByKind[kind]}/${id}/image?v=${version}`;
}

const MAX_UPLOAD_DIMENSION = 1600;
const UPLOAD_JPEG_QUALITY = 0.82;

export async function downscaleImage(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });

    if (
      img.width <= MAX_UPLOAD_DIMENSION &&
      img.height <= MAX_UPLOAD_DIMENSION
    ) {
      return file;
    }

    const scale = MAX_UPLOAD_DIMENSION / Math.max(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", UPLOAD_JPEG_QUALITY),
    );
    if (!blob) return file;

    const name = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
