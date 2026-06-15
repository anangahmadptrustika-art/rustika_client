"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteClient } from "@/app/(app)/clients/actions";

export function DeleteClientButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      title={`Hapus client "${clientName}"?`}
      description="Tindakan ini permanen. Client hanya dapat dihapus jika tidak memiliki proyek."
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label="Hapus client"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      }
      action={() => deleteClient(clientId)}
      onDone={() => router.refresh()}
    />
  );
}
