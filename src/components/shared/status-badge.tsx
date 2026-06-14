import { Badge } from "@/components/ui/badge";
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_STYLES,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_STYLES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_STYLES,
  type ApprovalStatus,
  type InvoiceStatus,
  type ProjectStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", PROJECT_STATUS_STYLES[status])}
    >
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", INVOICE_STATUS_STYLES[status])}
    >
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", APPROVAL_STATUS_STYLES[status])}
    >
      {APPROVAL_STATUS_LABELS[status]}
    </Badge>
  );
}
