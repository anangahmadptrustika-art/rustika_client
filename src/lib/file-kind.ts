/**
 * Server-safe helpers for classifying files for preview. Kept out of any
 * "use client" module so Server Components can call `kindFromType` directly.
 */
export type FileKind = "image" | "pdf" | "office" | "other";

/** Maps a file extension to a preview kind. */
export function kindFromType(type: string | null | undefined): FileKind {
  const t = (type ?? "").toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(t)) return "image";
  if (t === "pdf") return "pdf";
  if (["doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx"].includes(t)) return "office";
  return "other";
}
