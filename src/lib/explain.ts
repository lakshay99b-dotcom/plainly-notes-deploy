export type QuizQuestion = {
  prompt: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  why: string;
};

export type ExplainResult = {
  title: string;
  gist: string;
  explanation: string;
  keyIdeas: string[];
  analogy: string;
  watchOut: string;
  questions: QuizQuestion[];
};

export type ExplainOk = { ok: true; result: ExplainResult };
export type ExplainErr = { ok: false; error: string };
export type ExplainResponse = ExplainOk | ExplainErr;

export async function explainAndQuiz(input: {
  text?: string;
  images?: string[];
  subject?: string;
}): Promise<ExplainResponse> {
  const res = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: input.text ?? "",
      subject: input.subject ?? "",
      images: input.images ?? [],
    }),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {}
    return { ok: false, error: message };
  }
  return (await res.json()) as ExplainResponse;
}
