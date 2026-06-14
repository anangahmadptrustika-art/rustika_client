"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { signIn, type AuthState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="h-4 w-4" />
      )}
      Masuk
    </Button>
  );
}

export function LoginForm({ demoMode }: { demoMode: boolean }) {
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/dashboard";
  const [state, formAction] = useActionState<AuthState, FormData>(
    signIn,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="nama@rustika.co.id"
          autoComplete="email"
          required
          defaultValue={demoMode ? "admin@rustika.co.id" : ""}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Lupa password?
          </button>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          defaultValue={demoMode ? "Password123!" : ""}
        />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <SubmitButton />

      {demoMode && (
        <p className="rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
          Mode demo aktif — kredensial sudah terisi. Klik <b>Masuk</b> untuk
          menjelajah portal tanpa backend.
        </p>
      )}
    </form>
  );
}
