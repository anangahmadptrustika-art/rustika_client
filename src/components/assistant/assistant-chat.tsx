"use client";

import { useMemo, useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Paperclip,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface DocOption {
  id: string;
  name: string;
  projectName?: string | null;
}

const QUICK_PROMPTS = [
  "Ringkas progress semua proyek",
  "Buatkan laporan mingguan proyek VALE",
  "Lampirkan dokumen lalu: ringkas isi dokumen ini",
  "Lampirkan dokumen lalu: ambil poin-poin penting & angka kunci",
];

export function AssistantChat({
  aiEnabled,
  documents,
}: {
  aiEnabled: boolean;
  documents: DocOption[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attached, setAttached] = useState<DocOption | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [docQuery, setDocQuery] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const filteredDocs = useMemo(() => {
    const q = docQuery.toLowerCase().trim();
    return documents
      .filter(
        (d) =>
          !q ||
          d.name.toLowerCase().includes(q) ||
          (d.projectName ?? "").toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [documents, docQuery]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const doc = attached;
    const shown = doc ? `📎 ${doc.name}\n${content}` : content;
    setMessages((m) => [...m, { role: "user", content: shown }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: content, documentId: doc?.id }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? data.error ?? "—" },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Gagal menghubungi assistant." },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: "smooth" })
      );
    }
  }

  return (
    <Card className="flex h-[calc(100vh-13rem)] flex-col">
      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="font-semibold">Rustika AI Assistant</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Tanyakan progres, cari dokumen, buat laporan, atau{" "}
                <b>lampirkan dokumen (PDF/gambar)</b> untuk dianalisa AI.
                {!aiEnabled && " (Mode demo — atur ANTHROPIC_API_KEY untuk AI penuh.)"}
              </p>
              <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                  m.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border bg-muted/40"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Menyusun jawaban…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Attached document chip */}
        {attached && (
          <div className="flex items-center gap-2 rounded-lg border bg-accent/40 px-3 py-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">{attached.name}</span>
            <button
              onClick={() => setAttached(null)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Lepas dokumen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t pt-4"
        >
          <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setPickerOpen(true)}
              aria-label="Lampirkan dokumen"
              title="Lampirkan dokumen untuk dianalisa"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <DialogContent className="max-h-[80vh] gap-0 p-0">
              <DialogHeader className="border-b p-4">
                <DialogTitle>Lampirkan dokumen untuk dianalisa</DialogTitle>
              </DialogHeader>
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={docQuery}
                    onChange={(e) => setDocQuery(e.target.value)}
                    placeholder="Cari nama dokumen / proyek…"
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="scrollbar-thin max-h-[55vh] overflow-y-auto p-2">
                {filteredDocs.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    {documents.length === 0
                      ? "Belum ada dokumen PDF/gambar."
                      : "Tidak ada dokumen yang cocok."}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {filteredDocs.map((d) => (
                      <li key={d.id}>
                        <button
                          onClick={() => {
                            setAttached(d);
                            setPickerOpen(false);
                            setDocQuery("");
                          }}
                          className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{d.name}</span>
                            {d.projectName && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {d.projectName}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              attached ? "Tanya tentang dokumen ini…" : "Tanya apa saja tentang proyek Anda…"
            }
            className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
