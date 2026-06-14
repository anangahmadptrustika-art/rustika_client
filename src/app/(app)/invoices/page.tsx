import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getInvoices, getProjects } from "@/lib/queries";
import { canViewFinance } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { InvoiceStatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, CheckCircle2, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicesPage() {
  const profile = await requireProfile();
  if (!canViewFinance(profile.role)) redirect("/dashboard");

  const [invoices, projects] = await Promise.all([getInvoices(), getProjects()]);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";

  const total = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const paid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.amount), 0);
  const outstanding = total - paid;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice"
        description="Tagihan, pembayaran, dan status keuangan seluruh proyek."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Tagihan" value={formatCurrency(total)} icon={Receipt} accent="primary" />
        <StatCard label="Sudah Dibayar" value={formatCurrency(paid)} icon={CheckCircle2} accent="success" />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} icon={AlertCircle} accent="danger" />
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Proyek</TableHead>
              <TableHead>Termin</TableHead>
              <TableHead>Nilai</TableHead>
              <TableHead>Terbit</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                <TableCell>
                  <Link
                    href={`/projects/${inv.project_id}?tab=invoice`}
                    className="text-sm text-primary hover:underline"
                  >
                    {projectName(inv.project_id)}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {inv.termin ?? "—"}
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(Number(inv.amount))}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(inv.issue_date)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(inv.due_date)}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={inv.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
