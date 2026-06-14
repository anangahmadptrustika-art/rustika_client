import { cn } from "@/lib/utils";

/** Rustika monogram — black tile with a gold "R" hexagon mark. */
export function Logo({
  className,
  size = 36,
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
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
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

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo />
      <div className="flex flex-col leading-none">
        <span className="text-sm font-bold tracking-tight">RUSTIKA</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Consultant
        </span>
      </div>
    </div>
  );
}
