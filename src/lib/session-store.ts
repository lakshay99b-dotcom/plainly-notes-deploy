import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExplainResult } from "@/lib/explain";

export type SavedSession = {
  id: string;
  createdAt: number;
  title: string;
  gist: string;
  result: ExplainResult;
  lastScore?: { correct: number; total: number };
};

type Phase = "idle" | "loading" | "explain" | "quiz" | "score";

type Store = {
  phase: Phase;
  current: SavedSession | null;
  sessions: SavedSession[];
  quizIndex: number;
  answers: Array<number | null>;
  revealed: boolean;
  error: string | null;
  setLoading: () => void;
  setError: (message: string) => void;
  startSession: (result: ExplainResult) => void;
  openSession: (id: string) => void;
  startQuiz: () => void;
  choose: (choiceIndex: number) => void;
  nextQuestion: () => void;
  resetToIdle: () => void;
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useStudyStore = create<Store>()(
  persist(
    (set, get) => ({
      phase: "idle",
      current: null,
      sessions: [],
      quizIndex: 0,
      answers: [],
      revealed: false,
      error: null,
      setLoading: () => set({ phase: "loading", error: null }),
      setError: (message) => set({ phase: "idle", error: message }),
      startSession: (result) => {
        const session: SavedSession = {
          id: uid(),
          createdAt: Date.now(),
          title: result.title,
          gist: result.gist,
          result,
        };
        set({
          phase: "explain",
          current: session,
          sessions: [session, ...get().sessions].slice(0, 12),
          quizIndex: 0,
          answers: result.questions.map(() => null),
          revealed: false,
          error: null,
        });
      },
      openSession: (id) => {
        const session = get().sessions.find((item) => item.id === id);
        if (!session) return;
        set({
          phase: "explain",
          current: session,
          quizIndex: 0,
          answers: session.result.questions.map(() => null),
          revealed: false,
          error: null,
        });
      },
      startQuiz: () => {
        const current = get().current;
        if (!current) return;
        set({
          phase: "quiz",
          quizIndex: 0,
          answers: current.result.questions.map(() => null),
          revealed: false,
        });
      },
      choose: (choiceIndex) => {
        if (get().revealed) return;
        const answers = [...get().answers];
        answers[get().quizIndex] = choiceIndex;
        set({ answers, revealed: true });
      },
      nextQuestion: () => {
        const current = get().current;
        if (!current) return;
        const next = get().quizIndex + 1;
        if (next >= current.result.questions.length) {
          const total = current.result.questions.length;
          const correct = current.result.questions.reduce((sum, q, i) => {
            return sum + (get().answers[i] === q.correctIndex ? 1 : 0);
          }, 0);
          const updated: SavedSession = {
            ...current,
            lastScore: { correct, total },
          };
          set({
            phase: "score",
            current: updated,
            sessions: get().sessions.map((s) => (s.id === updated.id ? updated : s)),
          });
          return;
        }
        set({ quizIndex: next, revealed: false });
      },
      resetToIdle: () =>
        set({
          phase: "idle",
          current: null,
          quizIndex: 0,
          answers: [],
          revealed: false,
          error: null,
        }),
    }),
    {
      name: "plainly-sessions",
      partialize: (state) => ({ sessions: state.sessions }),
    },
  ),
);
