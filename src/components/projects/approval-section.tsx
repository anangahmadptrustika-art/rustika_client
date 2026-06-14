"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Stamp } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApprovalStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { respondApproval } from "@/app/(app)/projects/[id]/actions";
import { formatDate } from "@/lib/utils";
import type { Approval } from "@/types/database";

export function ApprovalSection({
  approvals,
  projectId,
  canRespond,
}: {
  approvals: Approval[];
  projectId: string;
  canRespond: boolean;
}) {
  if (approvals.length === 0) {
    return (
      <EmptyState
        icon={Stamp}
        title="Belum ada permintaan approval"
        description="Permintaan persetujuan dari tim akan tampil di sini."
      />
    );
  }

  return (
    <div className="space-y-4">
      {approvals.map((a) => (
        <ApprovalCard
          key={a.id}
          approval={a}
          projectId={projectId}
          canRespond={canRespond}
        />
      ))}
    </div>
  );
}

function ApprovalCard({
  approval,
  projectId,
  canRespond,
}: {
  approval: Approval;
  projectId: string;
  canRespond: boolean;
}) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function respond(status: "approved" | "revision_requested") {
    startTransition(async () => {
      const res = await respondApproval(approval.id, projectId, status, note);
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  const isPending = approval.status === "pending";

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{approval.title}</h3>
            {approval.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {approval.description}
              </p>
            )}
          </div>
          <ApprovalStatusBadge status={approval.status} />
        </div>

        <p className="text-xs text-muted-foreground">
          Diminta pada {formatDate(approval.created_at)}
        </p>

        {approval.response_note && (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <b>Catatan:</b> {approval.response_note}
          </p>
        )}

        {canRespond && isPending && (
          <div className="space-y-3 border-t pt-3">
            <Textarea
              placeholder="Tulis catatan (opsional untuk approve, wajib untuk revisi)…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={() => respond("approved")} disabled={pending}>
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => respond("revision_requested")}
                disabled={pending}
              >
                <RotateCcw className="h-4 w-4" /> Request Revision
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
