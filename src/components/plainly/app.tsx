import { BookOpen } from "lucide-react";
import { Toaster } from "sonner";
import { Composer } from "@/components/plainly/composer";
import { Explanation } from "@/components/plainly/explanation";
import { Quiz, Scorecard } from "@/components/plainly/quiz";
import { Button } from "@/components/ui/button";
import { useStudyStore } from "@/lib/session-store";

export function PlainlyApp() {
  const phase = useStudyStore((s) => s.phase);
  const sessions = useStudyStore((s) => s.sessions);
  const openSession = useStudyStore((s) => s.openSession);
  const resetToIdle = useStudyStore((s) => s.resetToIdle);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={resetToIdle}
          className="flex items-center gap-2 text-left"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="size-4" />
          </span>
          <span>
            <span className="block font-display text-xl font-medium leading-none tracking-tight">
              Plainly
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Notes, made simple
            </span>
          </span>
        </button>
      </header>

      {phase === "idle" || phase === "loading" ? (
        <div className="mt-10 sm:mt-14">
          <p className="max-w-xl font-display text-4xl font-medium leading-[1.12] tracking-tight text-paper-ink sm:text-5xl">
            Stuck on a page? Get it in plain words.
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Upload a photo of the textbook, or paste the bit that will not click.
            Plainly explains it like a friend, then quizzes you so it actually sticks.
          </p>
          <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
            <li className="rounded-lg border border-border bg-card/80 px-4 py-3 leading-relaxed">
              Dense notes become short, everyday language.
            </li>
            <li className="rounded-lg border border-border bg-card/80 px-4 py-3 leading-relaxed">
              Practice questions come from your page, not random past papers.
            </li>
            <li className="rounded-lg border border-border bg-card/80 px-4 py-3 leading-relaxed">
              You find out immediately whether you can explain it back.
            </li>
          </ul>
          <div className="mt-8">
            <Composer />
          </div>
          {sessions.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Recent
              </h2>
              <ul className="mt-3 grid gap-2">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <Button
                      variant="secondary"
                      className="h-auto w-full justify-between px-4 py-3 text-left font-normal"
                      onClick={() => openSession(session.id)}
                    >
                      <span>
                        <span className="block font-medium">{session.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {session.gist || "Saved lesson"}
                        </span>
                      </span>
                      {session.lastScore ? (
                        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                          {session.lastScore.correct}/{session.lastScore.total}
                        </span>
                      ) : null}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {phase === "explain" ? (
        <div className="mt-8">
          <Explanation />
        </div>
      ) : null}
      {phase === "quiz" ? (
        <div className="mt-8">
          <Quiz />
        </div>
      ) : null}
      {phase === "score" ? (
        <div className="mt-8">
          <Scorecard />
        </div>
      ) : null}

      <Toaster
        position="bottom-center"
        toastOptions={{
          className: "!bg-card !text-foreground !border-border !font-sans",
        }}
      />
    </div>
  );
}
