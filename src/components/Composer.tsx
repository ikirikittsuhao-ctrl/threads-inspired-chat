import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPost, uploadPostImage, type PostBase } from "@/lib/api";
import { UserAvatar } from "./UserAvatar";
import type { Profile } from "@/lib/api";

interface Props {
  viewerId: string;
  viewerProfile: Profile | null;
  replyTo?: PostBase | null;
  onClose: () => void;
  onPosted?: () => void;
}

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

  const disabled = submit.isPending || (!content.trim() && !file);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-t-3xl border border-border bg-card p-4 sm:rounded-3xl">
        <div className="flex items-center justify-between pb-3">
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground">
            キャンセル
          </button>
          <h2 className="text-sm font-semibold">{replyTo ? "返信" : "新規スレッド"}</h2>
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
            <p className="text-sm font-semibold">
              {viewerProfile?.display_name || viewerProfile?.username || "あなた"}
            </p>
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="いまなにしてる？"
              rows={4}
              className="mt-1 w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            {file && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs">
                <span className="flex-1 truncate">{file.name}</span>
                <button type="button" aria-label="画像を削除" onClick={() => setFile(null)}>
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
              className="mt-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={disabled}
            onClick={() => submit.mutate()}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {submit.isPending ? "送信中…" : "投稿"}
          </button>
        </div>
      </div>
    </div>
  );
}
