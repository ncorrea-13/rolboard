import { useEffect, useState } from "react";

// Imagen elegida en un alta: la entidad todavía no tiene id, así que se sube después del POST.
export function usePendingImage() {
  const [file, setFile] = useState<File>();
  const [url, setUrl] = useState<string>();

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  return {
    file,
    url,
    set: async (f: File) => {
      setFile(f);
      setUrl(URL.createObjectURL(f));
    },
    clear: async () => {
      setFile(undefined);
      setUrl(undefined);
    },
  };
}
