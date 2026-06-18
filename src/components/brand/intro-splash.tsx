"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./intro-splash.module.css";

const HOLD_MS = 2800;
const FADE_MS = 600;

/**
 * Brand intro shown the first time the app is opened in a browser session.
 * Plays a one-shot logo reveal, then fades out. It is skipped on the public
 * client portal, remembered per session (sessionStorage), click-to-skip, and
 * shortened for users who prefer reduced motion.
 */
export function IntroSplash({
  displayClass = "",
  monoClass = "",
}: {
  displayClass?: string;
  monoClass?: string;
}) {
  const pathname = usePathname();
  const isPortal = !!pathname?.startsWith("/portal");
  const [phase, setPhase] = useState<"play" | "fade" | "done">("play");

  useEffect(() => {
    if (isPortal) {
      setPhase("done");
      return;
    }
    let seen = false;
    try {
      seen = sessionStorage.getItem("rcg-intro") === "1";
      sessionStorage.setItem("rcg-intro", "1");
    } catch {
      /* sessionStorage unavailable — just play this once */
    }
    if (seen) {
      setPhase("done");
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hold = reduce ? 1100 : HOLD_MS;
    const t1 = setTimeout(() => setPhase("fade"), hold);
    const t2 = setTimeout(() => setPhase("done"), hold + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isPortal]);

  if (phase === "done" || isPortal) return null;

  return (
    <div
      className={`${styles.overlay} ${phase === "fade" ? styles.fadeOut : ""}`}
      onClick={() => setPhase("done")}
      aria-hidden="true"
    >
      <div className={styles.content}>
        <div className={styles.wordmarkWrap}>
          <h1 className={`${styles.wordmark} ${displayClass}`}>RUSTIKA CITRA GROUP</h1>
        </div>
        <div className={styles.datum}>
          <span className={`${styles.tick} ${styles.tickL}`} />
          <span className={styles.line} />
          <span className={`${styles.tick} ${styles.tickR}`} />
        </div>
        <p className={`${styles.tagline} ${monoClass}`}>
          Architecture · Civil Engineering · Design
        </p>
      </div>
      <span className={`${styles.label} ${monoClass}`}>RCG — Intro</span>
      <button
        type="button"
        className={`${styles.skip} ${monoClass}`}
        onClick={() => setPhase("done")}
      >
        Lewati
      </button>
    </div>
  );
}
