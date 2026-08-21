import { ImagePlus, LoaderCircle, Trash2, Type } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { explainAndQuiz } from "@/lib/explain";
import { fileToCompressedDataUrl, MAX_IMAGES } from "@/lib/images";
import { SAMPLE_NOTES, SAMPLE_SUBJECT } from "@/lib/sample-notes";
import { useStudyStore } from "@/lib/session-store";

export function Composer() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const setLoading = useStudyStore((s) => s.setLoading);
  const setError = useStudyStore((s) => s.setError);
  const startSession = useStudyStore((s) => s.startSession);
  const phase = useStudyStore((s) => s.phase);
  const error = useStudyStore((s) => s.error);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    const room = MAX_IMAGES - previews.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX_IMAGES} photos.`);
      return;
    }
    try {
      const next = await Promise.all(
        list.slice(0, room).map((file) => fileToCompressedDataUrl(file)),
      );
      setPreviews((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
    } catch {
      toast.error("Could not read one of those images.");
    }
  }

  async function run(
    nextText = text,
    nextSubject = subject,
    nextImages = previews,
  ) {
    if (!nextText.trim() && nextImages.length === 0) {
      toast.error("Paste the stuck paragraph, or add a photo of the page.");
      return;
    }
    setBusy(true);
    setLoading();
    try {
      const response = await explainAndQuiz({
        text: nextText,
        subject: nextSubject,
        images: nextImages,
      });
      if (!response.ok) {
        setError(response.error);
        toast.error(response.error);
        return;
      }
      startSession(response.result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  const loading = busy || phase === "loading";

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_0_color-mix(in_oklab,var(--color-foreground)_6%,transparent),0_18px_40px_-28px_color-mix(in_oklab,var(--color-foreground)_28%,transparent)] sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              The stuck bit
            </span>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the paragraph, slide, or notes you keep re-reading…"
              className="min-h-40 font-sans leading-relaxed"
              disabled={loading}
            />
          </label>
          <div className="flex flex-col gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Class
              </span>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Biology, History…"
                disabled={loading}
              />
            </label>
            <div className="flex-1">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Page photos
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void addFiles(e.dataTransfer.files);
                }}
                className="flex h-[7.5rem] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/50 px-3 text-center text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <ImagePlus className="size-4 text-foreground" />
                Drop or choose
                <span className="text-xs">Up to {MAX_IMAGES}</span>
              </button>
            </div>
          </div>
        </div>

        {previews.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <li key={src.slice(0, 24) + i} className="relative">
                <img
                  src={src}
                  alt={`Note photo ${i + 1}`}
                  className="h-16 w-16 rounded-sm border border-border object-cover"
                />
                <button
                  type="button"
                  className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-card text-foreground"
                  onClick={() => setPreviews((p) => p.filter((_, idx) => idx !== i))}
                  aria-label="Remove photo"
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="justify-start sm:w-auto"
            disabled={loading}
            onClick={() => {
              setText(SAMPLE_NOTES);
              setSubject(SAMPLE_SUBJECT);
              void run(SAMPLE_NOTES, SAMPLE_SUBJECT, []);
            }}
          >
            <Type className="size-4" />
            Try a dense sample page
          </Button>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            disabled={loading}
            onClick={() => void run()}
          >
            {loading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Reading your notes
              </>
            ) : (
              "Explain this simply"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
