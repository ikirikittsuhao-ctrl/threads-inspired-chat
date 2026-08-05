interface RowsProps {
  count?: number;
}

function Bar({ className }: { className: string }) {
  return <div className={`shimmer rounded-full ${className}`} />;
}

export function PostSkeleton({ count = 6 }: RowsProps) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in flex gap-3 border-b border-border px-4 py-4"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="shimmer h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Bar className="h-3 w-24" />
              <Bar className="h-3 w-16" />
            </div>
            <Bar className="h-3 w-full" />
            <Bar className="h-3 w-4/5" />
            <div className="flex gap-8 pt-2">
              <Bar className="h-3 w-8" />
              <Bar className="h-3 w-8" />
              <Bar className="h-3 w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton({ count = 6 }: RowsProps) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in flex items-center gap-3 border-b border-border px-4 py-3.5"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="shimmer h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Bar className="h-3 w-32" />
            <Bar className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-fade-in px-4 py-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Bar className="h-5 w-40" />
          <Bar className="h-3 w-24" />
        </div>
        <div className="shimmer h-20 w-20 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <Bar className="h-3 w-3/4" />
        <Bar className="h-3 w-1/2" />
      </div>
      <Bar className="mt-5 h-9 w-full" />
    </div>
  );
}

export function ChatSkeleton() {
  const widths = ["w-40", "w-56", "w-28", "w-48", "w-36"];
  return (
    <div className="space-y-3 px-4 py-4">
      {widths.map((w, i) => (
        <div
          key={i}
          className={`animate-fade-in flex ${i % 2 ? "justify-end" : "justify-start"}`}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <div className={`shimmer h-9 rounded-3xl ${w}`} />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="読み込み中"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
