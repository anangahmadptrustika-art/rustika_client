"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo.png";

/**
 * Square brand mark. Renders the uploaded logo (public/logo.png); if that file
 * is missing it gracefully falls back to the built-in monogram so the UI never
 * shows a broken image.
 */
export function Logo({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={LOGO_SRC}
        alt="Rustika Consultant"
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-md object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return <MonogramFallback className={className} size={size} />;
}

/** Full logo lockup (mark + wordmark). Uses the uploaded logo image. */
export function LogoWordmark({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={LOGO_SRC}
        alt="Rustika Consultant"
        onError={() => setFailed(true)}
        className={cn("h-10 w-auto object-contain", className)}
      />
    );
  }

  return <WordmarkFallback className={className} />;
}

// ── Fallbacks (shown only until public/logo.png exists) ───────
function MonogramFallback({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-lg bg-foreground text-background shadow-sm",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z"
          stroke="hsl(var(--primary))"
          strokeWidth="1.6"
          fill="none"
        />
        <path
          d="M9 8 h4.2 a2.4 2.4 0 0 1 0 4.8 H9 M9 8 v8 M12.6 12.8 L15.5 16"
          stroke="hsl(var(--primary))"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

function WordmarkFallback({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <MonogramFallback size={36} />
      <div className="flex flex-col leading-none">
        <span className="text-sm font-bold tracking-tight">RUSTIKA</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Consultant
        </span>
      </div>
    </div>
  );
}
