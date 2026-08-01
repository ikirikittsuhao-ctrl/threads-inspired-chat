import { useEffect, useState } from "react";
import { getSignedUrl } from "@/lib/api";

export function SignedImage({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSignedUrl(path)
      .then((u) => {
        if (active) setUrl(u);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (!url) return <div className="mt-3 h-56 w-full animate-pulse rounded-2xl bg-secondary" />;

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="mt-3 max-h-[28rem] w-full rounded-2xl border border-border object-cover"
    />
  );
}
