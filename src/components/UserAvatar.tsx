import { Link } from "@tanstack/react-router";
import type { Profile } from "@/lib/api";

interface Props {
  profile: Pick<Profile, "username" | "display_name" | "avatar_url"> | null;
  size?: "sm" | "md" | "lg";
  linkless?: boolean;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-2xl",
};

export function UserAvatar({ profile, size = "md", linkless }: Props) {
  const initial = (profile?.display_name || profile?.username || "?").charAt(0).toUpperCase();
  const inner = profile?.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt={profile.username}
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
