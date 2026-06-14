import Link from "next/link";
import type { Metadata } from "next";
import {
  Building2,
  FileText,
  FolderKanban,
  Receipt,
  Search as SearchIcon,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { globalSearch } from "@/lib/queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Pencarian" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireProfile();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query
    ? await globalSearch(query)
    : { projects: [], documents: [], clients: [], invoices: [] };

  const totalResults =
    results.projects.length +
    results.documents.length +
    results.clients.length +
    results.invoices.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Search"
        description="Cari berdasarkan nama proyek, file, client, nomor invoice, atau lokasi."
      />

      <form action="/search" className="relative max-w-2xl">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={query}
          placeholder="Ketik kata kunci…"
          className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </form>

      {!query ? (
        <EmptyState
          icon={SearchIcon}
          title="Mulai pencarian"
          description="Masukkan kata kunci untuk mencari di seluruh portal."
        />
      ) : totalResults === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={`Tidak ada hasil untuk "${query}"`}
          description="Coba kata kunci lain."
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {totalResults} hasil untuk <b>&quot;{query}&quot;</b>
          </p>

          {results.projects.length > 0 && (
            <Section title="Proyek" icon={FolderKanban}>
              {results.projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.code} · {p.location}
                        </p>
                      </div>
                      <ProjectStatusBadge status={p.status} />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </Section>
          )}

          {results.documents.length > 0 && (
            <Section title="Dokumen" icon={FileText}>
              {results.documents.map((d) => (
                <Link key={d.id} href={`/projects/${d.project_id}`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardContent className="p-4">
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Versi {d.version}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </Section>
          )}

          {results.clients.length > 0 && (
            <Section title="Client" icon={Building2}>
              {results.clients.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.company}</p>
                  </CardContent>
                </Card>
              ))}
            </Section>
          )}

          {results.invoices.length > 0 && (
            <Section title="Invoice" icon={Receipt}>
              {results.invoices.map((i) => (
                <Link key={i.id} href={`/projects/${i.project_id}?tab=invoice`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardContent className="flex items-center justify-between p-4">
                      <p className="font-medium">{i.invoice_number}</p>
                      <p className="text-sm">{formatCurrency(Number(i.amount))}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
