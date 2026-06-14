"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { postComment } from "@/app/(app)/projects/[id]/actions";
import { getInitials, timeAgo } from "@/lib/utils";
import type { CommentWithAuthor } from "@/types/database";

export function DiscussionThread({
  comments,
  projectId,
  canComment,
}: {
  comments: CommentWithAuthor[];
  projectId: string;
  canComment: boolean;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function send() {
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await postComment(projectId, body);
      if (res.ok) {
        toast.success(res.message);
        setBody("");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      {canComment && (
        <div className="flex gap-3 rounded-xl border bg-card p-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/15 text-primary">Me</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Tulis komentar… gunakan @ untuk mention rekan tim."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" type="button">
                <Paperclip className="h-4 w-4" /> Lampiran
              </Button>
              <Button size="sm" onClick={send} disabled={pending || !body.trim()}>
                <Send className="h-4 w-4" /> Kirim
              </Button>
            </div>
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Belum ada diskusi"
          description="Mulai diskusi proyek dengan tim dan client di sini."
        />
      ) : (
        <ul className="space-y-5">
          {comments.map((c) => (
            <li key={c.id} className="space-y-3">
              <CommentBubble comment={c} />
              {c.replies && c.replies.length > 0 && (
                <ul className="ml-12 space-y-3 border-l pl-4">
                  {c.replies.map((r) => (
                    <li key={r.id}>
                      <CommentBubble comment={r} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentBubble({ comment }: { comment: CommentWithAuthor }) {
  return (
    <div className="flex gap-3">
      <Avatar className="h-9 w-9">
        <AvatarImage src={comment.author?.avatar_url ?? undefined} />
        <AvatarFallback className="bg-muted text-xs">
          {getInitials(comment.author?.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="rounded-xl rounded-tl-sm border bg-card px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium">
              {comment.author?.full_name ?? "Pengguna"}
            </span>
            <span className="text-xs text-muted-foreground">
              {timeAgo(comment.created_at)}
            </span>
          </div>
          <p className="text-sm">{comment.body}</p>
        </div>
      </div>
    </div>
  );
}
