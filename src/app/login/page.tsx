import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LogoWordmark } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_MODE } from "@/lib/config";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden flex-col justify-between bg-foreground p-12 text-background lg:flex">
        <div className="bg-brand-gradient absolute inset-0 opacity-40" />
        <div className="relative z-10">
          <div className="inline-flex rounded-xl bg-white/95 px-3 py-2 shadow-sm">
            <LogoWordmark />
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-balance text-3xl font-bold leading-tight">
            Kelola seluruh proyek konsultan Rustika dalam satu portal.
          </h2>
          <ul className="space-y-3 text-background/70">
            {[
              "Monitoring progres real-time",
              "Dokumen dengan version control",
              "Akses aman berbasis peran (RLS)",
              "AI assistant untuk laporan & pencarian",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-sm text-background/50">
          © {new Date().getFullYear()} Rustika Consultant
        </p>
      </div>

      {/* Right — form */}
      <div className="flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <LogoWordmark />
          </div>
          <Card className="border-none shadow-none sm:border sm:shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Selamat datang kembali</CardTitle>
              <CardDescription>
                Masuk ke {APP_NAME} untuk melanjutkan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={null}>
                <LoginForm demoMode={DEMO_MODE} />
              </Suspense>
            </CardContent>
          </Card>
          <Link
            href="/"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
