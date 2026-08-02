import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getSignedUrl, type Profile } from "@/lib/api";

interface Props {
  profile: Pick<Profile, "username" | "display_name" | "avatar_url"> | null;
  size?: "xs" | "sm" | "md" | "lg";
  linkless?: boolean;
}

const sizes = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-2xl",
};

export function useAvatarUrl(avatarUrl: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(
    avatarUrl && /^https?:\/\//.test(avatarUrl) ? avatarUrl : null,
  );

  useEffect(() => {
    if (!avatarUrl) {
      setUrl(null);
      return;
    }
    if (/^https?:\/\//.test(avatarUrl)) {
      setUrl(avatarUrl);
      return;
    }
    let active = true;
    getSignedUrl(avatarUrl)
      .then((u) => active && setUrl(u))
      .catch(() => active && setUrl(null));
    return () => {
      active = false;
    };
  }, [avatarUrl]);

  return url;
}

export function UserAvatar({ profile, size = "md", linkless }: Props) {
  const url = useAvatarUrl(profile?.avatar_url);
  const initial = (profile?.display_name || profile?.username || "?").charAt(0).toUpperCase();

  const inner = url ? (
    <img
      src={url}
      alt={profile?.username ?? "avatar"}
      className={`${sizes[size]} shrink-0 rounded-full border border-border object-cover`}
    />
  ) : (
    <span
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-semibold text-secondary-foreground`}
    >
      {initial}
    </span>
  );

  if (linkless || !profile) return inner;

  return (
    <Link to="/u/$username" params={{ username: profile.username }} className="shrink-0">
      {inner}
    </Link>
  );
}
