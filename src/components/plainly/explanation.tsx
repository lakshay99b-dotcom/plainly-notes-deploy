import { ArrowLeft, CircleAlert, Lightbulb, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudyStore } from "@/lib/session-store";

export function Explanation() {
  const current = useStudyStore((s) => s.current);
  const startQuiz = useStudyStore((s) => s.startQuiz);
  const resetToIdle = useStudyStore((s) => s.resetToIdle);
  if (!current) return null;
  const { result } = current;
  const paragraphs = result.explanation
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
      <article className="rounded-xl border border-border bg-card p-5 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          In plain words
        </p>
        <h2 className="mt-2 font-display text-3xl font-medium leading-tight tracking-tight text-paper-ink sm:text-4xl">
          {result.title}
        </h2>
        {result.gist ? (
          <p className="mt-4 text-lg leading-relaxed text-foreground/90">{result.gist}</p>
        ) : null}
        <div className="mt-6 space-y-4 text-base leading-relaxed text-foreground">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
        </div>
      </article>

      <aside className="flex flex-col gap-4">
        {result.keyIdeas.length > 0 ? (
          <section className="rounded-lg border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <ListChecks className="size-4 text-primary" />
              Hold onto these
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground">
              {result.keyIdeas.map((idea) => (
                <li key={idea} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {result.analogy ? (
          <section className="rounded-lg border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="size-4 text-primary" />
              Like this
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{result.analogy}</p>
          </section>
        ) : null}
        {result.watchOut ? (
          <section className="rounded-lg border border-border bg-muted/80 p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <CircleAlert className="size-4" />
              Easy mix-up
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{result.watchOut}</p>
          </section>
        ) : null}
        <div className="mt-auto flex flex-col gap-2">
          <Button size="lg" onClick={startQuiz}>
            Test yourself
            <span className="text-primary-foreground/70">
              {result.questions.length} questions
            </span>
          </Button>
          <Button variant="ghost" onClick={resetToIdle}>
            <ArrowLeft className="size-4" />
            New notes
          </Button>
        </div>
      </aside>
    </div>
  );
}
