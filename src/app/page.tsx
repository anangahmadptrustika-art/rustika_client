import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  Plane,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoWordmark } from "@/components/brand/logo";
import { APP_NAME } from "@/lib/constants";

const features = [
  {
    icon: BarChart3,
    title: "Monitoring Real-time",
    desc: "Pantau progres setiap proyek, divisi, dan termin secara langsung dari satu dashboard.",
  },
  {
    icon: FileText,
    title: "Dokumen Terstruktur",
    desc: "Kajian teknis, gambar SIMBG, dan laporan tersimpan rapi dengan version control.",
  },
  {
    icon: Plane,
    title: "Drone Mapping & Survey",
    desc: "Kelola orthomosaic, DSM/DTM, point cloud, dan dokumentasi lapangan.",
  },
  {
    icon: ShieldCheck,
    title: "Akses Berbasis Peran",
    desc: "Super Admin, Project Manager, Staff, dan Client dengan hak akses yang aman.",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    desc: "Ringkasan progres otomatis, pencarian dokumen bahasa natural, laporan mingguan.",
  },
  {
    icon: Building2,
    title: "Skala Enterprise",
    desc: "Dirancang untuk ratusan client dan ribuan dokumen proyek.",
  },
];

const modules = [
  "Kajian Teknis",
  "SIMBG Drawing",
  "Survey",
  "Drone Mapping",
  "Capture Images",
  "Data Luasan",
  "Progress Report",
  "Timeline Activity",
  "Invoice",
  "Approval",
  "Discussion",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <LogoWordmark />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Fitur</a>
            <a href="#modules" className="hover:text-foreground">Modul</a>
            <a href="#roles" className="hover:text-foreground">Peran</a>
          </nav>
          <Button asChild>
            <Link href="/login">
              Masuk Portal <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-brand-gradient">
        <div className="container flex flex-col items-center gap-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Client Project Management Portal
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Pusat informasi seluruh{" "}
            <span className="text-primary">proyek konsultan</span> Rustika.
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground">
            {APP_NAME} menyatukan konsultan, arsitektur, sipil, survey, drone
            mapping, kajian teknis, SIMBG, dan dokumen proyek dalam satu portal
            yang aman dan terdokumentasi — menggantikan komunikasi yang tercecer.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">
                Mulai Sekarang <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard">Lihat Demo Dashboard</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Real-time progress", "Version control", "Row Level Security", "AI Assistant"].map(
              (item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {item}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Semua yang dibutuhkan konsultan modern
          </h2>
          <p className="mt-3 text-muted-foreground">
            Dibangun dengan standar enterprise SaaS yang scalable dan secure.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="border-y bg-muted/30 py-24">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight">Modul Proyek Lengkap</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Setiap proyek memiliki 12 modul terintegrasi — dari kajian teknis
            hingga diskusi.
          </p>
          <div className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-3">
            {modules.map((m) => (
              <span
                key={m}
                className="rounded-full border bg-background px-4 py-2 text-sm font-medium"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="container py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Empat peran pengguna</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { role: "Super Admin", desc: "Akses penuh seluruh data, client, dan user." },
            { role: "Project Manager", desc: "Buat proyek, atur tim & progres." },
            { role: "Staff", desc: "Upload dokumen, foto, dan laporan." },
            { role: "Client", desc: "Pantau proyek, approval & invoice." },
          ].map((r) => (
            <div key={r.role} className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold text-primary">{r.role}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="overflow-hidden rounded-2xl bg-foreground px-8 py-16 text-center text-background">
          <h2 className="text-3xl font-bold tracking-tight">
            Siap mengelola proyek dengan lebih rapi?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-background/70">
            Masuk ke portal dan mulai monitoring proyek Rustika Consultant hari ini.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/login">
              Masuk Portal <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <LogoWordmark />
          <p>© {new Date().getFullYear()} Rustika Consultant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
