import { ArrowLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useStudyStore } from "@/lib/session-store";

export function Quiz() {
  const current = useStudyStore((s) => s.current);
  const quizIndex = useStudyStore((s) => s.quizIndex);
  const answers = useStudyStore((s) => s.answers);
  const revealed = useStudyStore((s) => s.revealed);
  const choose = useStudyStore((s) => s.choose);
  const nextQuestion = useStudyStore((s) => s.nextQuestion);
  const resetToIdle = useStudyStore((s) => s.resetToIdle);
  if (!current) return null;
  const questions = current.result.questions;
  const q = questions[quizIndex];
  if (!q) return null;
  const selected = answers[quizIndex];
  const last = quizIndex === questions.length - 1;
  const progress = ((quizIndex + (revealed ? 1 : 0)) / questions.length) * 100;

  return (
    <section className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="tabular-nums">
          {quizIndex + 1} / {questions.length}
        </span>
        <button
          type="button"
          className="inline-flex h-11 items-center gap-1 text-sm text-foreground"
          onClick={resetToIdle}
        >
          <ArrowLeft className="size-4" />
          Exit
        </button>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <h2 className="mt-6 font-display text-2xl font-medium leading-snug tracking-tight text-paper-ink">
        {q.prompt}
      </h2>
      <ul className="mt-6 grid gap-2">
        {q.choices.map((choice, i) => {
          const isCorrect = i === q.correctIndex;
          const isPicked = selected === i;
          const show = revealed;
          return (
            <li key={choice}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => choose(i)}
                className={cn(
                  "flex min-h-12 w-full items-start gap-3 rounded-md border px-3 py-3 text-left text-sm leading-relaxed transition-colors",
                  !show && "border-border bg-background hover:bg-muted",
                  show && isCorrect && "border-success/40 bg-success/10 text-foreground",
                  show && isPicked && !isCorrect && "border-destructive/40 bg-destructive/10",
                  show && !isPicked && !isCorrect && "border-border bg-background opacity-70",
                )}
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-[0.65rem] font-medium">
                  {show && isCorrect ? (
                    <Check className="size-3" />
                  ) : show && isPicked ? (
                    <X className="size-3" />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span>{choice}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {revealed ? (
        <div className="mt-5 rounded-md bg-muted px-4 py-3 text-sm leading-relaxed text-foreground">
          {q.why}
        </div>
      ) : null}
      <div className="mt-6 flex justify-end">
        <Button disabled={!revealed} onClick={nextQuestion}>
          {last ? "See score" : "Next"}
        </Button>
      </div>
    </section>
  );
}

export function Scorecard() {
  const current = useStudyStore((s) => s.current);
  const answers = useStudyStore((s) => s.answers);
  const startQuiz = useStudyStore((s) => s.startQuiz);
  const resetToIdle = useStudyStore((s) => s.resetToIdle);
  const openExplain = useStudyStore((s) => s.openSession);
  if (!current) return null;
  const total = current.result.questions.length;
  const correct =
    current.lastScore?.correct ??
    current.result.questions.reduce(
      (sum, q, i) => sum + (answers[i] === q.correctIndex ? 1 : 0),
      0,
    );
  const missed = current.result.questions.filter(
    (q, i) => answers[i] !== q.correctIndex,
  );

  return (
    <section className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-5 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Score
      </p>
      <p className="mt-2 font-display text-5xl font-medium tabular-nums tracking-tight text-paper-ink">
        {correct}
        <span className="text-2xl text-muted-foreground"> / {total}</span>
      </p>
      <p className="mt-3 text-base leading-relaxed text-foreground">
        {correct === total
          ? "You can explain this page back. That is the point."
          : "Misses are useful — they show which sentence still needs another pass."}
      </p>
      {missed.length > 0 ? (
        <ul className="mt-6 space-y-3 border-t border-border pt-5">
          {missed.map((q) => (
            <li key={q.prompt} className="text-sm leading-relaxed">
              <p className="font-medium text-foreground">{q.prompt}</p>
              <p className="mt-1 text-muted-foreground">
                {q.choices[q.correctIndex]} — {q.why}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button className="sm:flex-1" onClick={startQuiz}>
          Try the quiz again
        </Button>
        <Button
          variant="secondary"
          className="sm:flex-1"
          onClick={() => openExplain(current.id)}
        >
          Re-read the explanation
        </Button>
        <Button variant="ghost" onClick={resetToIdle}>
          New notes
        </Button>
      </div>
    </section>
  );
}
