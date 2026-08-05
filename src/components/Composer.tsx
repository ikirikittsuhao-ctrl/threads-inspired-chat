import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPost, uploadPostImage, type PostBase } from "@/lib/api";
import { UserAvatar } from "./UserAvatar";
import { Spinner } from "./skeletons/Skeletons";
import type { Profile } from "@/lib/api";

interface Props {
  viewerId: string;
  viewerProfile: Profile | null;
  replyTo?: PostBase | null;
  onClose: () => void;
  onPosted?: () => void;
}

const LIMIT = 280;

export function Composer({ viewerId, viewerProfile, replyTo, onClose, onPosted }: Props) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const submit = useMutation({
    mutationFn: async () => {
      const imagePath = file ? await uploadPostImage(file, viewerId) : null;
      return createPost({
        userId: viewerId,
        content: content.trim(),
        imagePath,
        parentId: replyTo?.id ?? null,
      });
    },
    onSuccess: () => {
      toast.success(replyTo ? "返信しました" : "投稿しました");
      setContent("");
      setFile(null);
      queryClient.invalidateQueries();
      onPosted?.();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const over = content.length > LIMIT;
  const disabled = submit.isPending || over || (!content.trim() && !file);
  const ratio = Math.min(content.length / LIMIT, 1);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-md sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-slide-up w-full max-w-lg rounded-t-3xl border border-border bg-card p-4 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3">
          <button type="button" onClick={onClose} className="tap text-sm text-muted-foreground">
            キャンセル
          </button>
          <h2 className="text-sm font-bold">{replyTo ? "返信" : "新しいポスト"}</h2>
          <span className="w-14" />
        </div>

        {replyTo && (
          <p className="mb-3 line-clamp-2 rounded-2xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
            @{replyTo.profiles?.username} への返信: {replyTo.content}
          </p>
        )}

        <div className="flex gap-3">
          <UserAvatar profile={viewerProfile} linkless />
          <div className="flex-1">
            <p className="text-sm font-bold">
              {viewerProfile?.display_name || viewerProfile?.username || "あなた"}
            </p>
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="いまどうしてる？"
              rows={4}
              className="mt-1 w-full resize-none bg-transparent text-[17px] outline-none placeholder:text-muted-foreground"
            />
            {file && (
              <div className="animate-rise-in mt-2 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs">
                <span className="flex-1 truncate">{file.name}</span>
                <button type="button" aria-label="画像を削除" onClick={() => setFile(null)} className="tap">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              aria-label="画像を追加"
              onClick={() => fileRef.current?.click()}
              className="tap mt-2 grid h-9 w-9 place-items-center rounded-full text-brand transition-colors hover:bg-brand/10"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 border-t border-border pt-3">
          {content.length > 0 && (
            <span
              className={`text-xs tabular-nums transition-colors ${
                over ? "text-destructive" : ratio > 0.8 ? "text-like" : "text-muted-foreground"
              }`}
            >
              {LIMIT - content.length}
            </span>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => submit.mutate()}
            className="tap flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-bold text-brand-foreground disabled:opacity-40"
          >
            {submit.isPending && <Spinner />}
            {submit.isPending ? "送信中" : replyTo ? "返信" : "ポストする"}
          </button>
        </div>
      </div>
    </div>
  );
}
