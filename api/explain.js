const SCHEMA_HINT = `{
  "title": "short topic title",
  "gist": "one everyday sentence of what this is about",
  "explanation": "3 to 6 short paragraphs separated by blank lines. Everyday words.",
  "keyIdeas": ["3 to 6 short bullets"],
  "analogy": "one concrete comparison from ordinary life",
  "watchOut": "one common mix-up in one or two sentences",
  "questions": [
    {
      "prompt": "question about THESE notes only",
      "choices": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "why": "one short sentence"
    }
  ]
}`;

function extractJson(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) throw new Error("Empty model response.");
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The tutor returned something I could not read. Try again.");
  }
  candidate = candidate.slice(start, end + 1);
  return JSON.parse(candidate);
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function parseResult(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Could not parse the lesson.");
  }
  const obj = raw;
  const questionsRaw = Array.isArray(obj.questions) ? obj.questions : [];
  const questions = [];
  for (const q of questionsRaw) {
    if (!q || typeof q !== "object") continue;
    const rec = q;
    const choicesRaw = Array.isArray(rec.choices) ? rec.choices.map(String) : [];
    if (choicesRaw.length < 4) continue;
    const idxNum = Number(rec.correctIndex);
    const correctIndex = idxNum >= 0 && idxNum <= 3 ? idxNum : 0;
    const prompt = asString(rec.prompt);
    if (!prompt) continue;
    questions.push({
      prompt,
      choices: [choicesRaw[0], choicesRaw[1], choicesRaw[2], choicesRaw[3]],
      correctIndex,
      why: asString(rec.why, "Check the explanation above."),
    });
  }
  if (questions.length < 4) {
    throw new Error("Not enough practice questions came back. Try again.");
  }
  const keyIdeas = Array.isArray(obj.keyIdeas)
    ? obj.keyIdeas.map((item) => asString(item)).filter(Boolean)
    : [];
  const title = asString(obj.title, "Your notes");
  const gist = asString(obj.gist);
  const explanation = asString(obj.explanation);
  if (!explanation) throw new Error("The explanation was empty. Try again.");
  return {
    title,
    gist,
    explanation,
    keyIdeas: keyIdeas.slice(0, 8),
    analogy: asString(obj.analogy),
    watchOut: asString(obj.watchOut),
    questions: questions.slice(0, 10),
  };
}

async function callGroq(apiKey, { model, messages, useJsonMode }) {
  const payload = {
    model,
    temperature: 0.3,
    max_tokens: 3500,
    messages,
  };
  // json_object mode is flaky with some vision models — only use for text-only
  if (useJsonMode) {
    payload.response_format = { type: "json_object" };
  }
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const groqBody = await groqRes.json().catch(() => ({}));
  if (!groqRes.ok) {
    const detail =
      groqBody?.error?.message || `Groq API error ${groqRes.status}`;
    const err = new Error(detail);
    err.status = groqRes.status;
    throw err;
  }
  return groqBody?.choices?.[0]?.message?.content || "";
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        ok: false,
        error:
          "GROQ_API_KEY is not configured on the server. Add it in Vercel → Environment Variables, then redeploy.",
      });
      return;
    }

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const text = typeof body.text === "string" ? body.text.slice(0, 12000) : "";
    const subject =
      typeof body.subject === "string" ? body.subject.slice(0, 80) : "";
    const images = Array.isArray(body.images)
      ? body.images.filter((item) => typeof item === "string").slice(0, 3)
      : [];

    if (!text.trim() && images.length === 0) {
      res.status(400).json({ ok: false, error: "Add some notes or a photo first." });
      return;
    }

    const instruction = [
      "You are a patient tutor. Explain like a sharp friend, never a textbook.",
      "Short sentences. Everyday words. No emoji. No filler.",
      "Ground every quiz question only in the provided notes or photo text.",
      "Respond with ONLY a single JSON object (no markdown fences, no extra text) matching this shape:",
      SCHEMA_HINT,
      "Include 6 to 8 questions. Exactly 4 choices each. correctIndex is 0, 1, 2, or 3.",
    ].join("\n");

    const userText = [
      subject ? `Class / subject hint: ${subject}` : "",
      text.trim()
        ? `Student notes:\n${text.trim()}`
        : "The student uploaded photos of a textbook or notes. Read all readable text in the images carefully.",
      "Explain this simply, then write practice questions from this material only.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const userContent =
      images.length > 0
        ? [
            { type: "text", text: userText },
            ...images.map((url) => ({
              type: "image_url",
              image_url: { url },
            })),
          ]
        : userText;

    const messages = [
      { role: "system", content: instruction },
      { role: "user", content: userContent },
    ];

    // Prefer strong text model; vision model when photos are present
    const primaryModel =
      images.length > 0 ? "qwen/qwen3.6-27b" : "openai/gpt-oss-120b";
    const fallbackModel = "openai/gpt-oss-20b";

    let content = "";
    let lastError = null;

    // Attempt 1: primary model
    try {
      content = await callGroq(apiKey, {
        model: primaryModel,
        messages,
        useJsonMode: images.length === 0,
      });
    } catch (e) {
      lastError = e;
    }

    // Attempt 2: fallback model without json_object if needed
    if (!content) {
      try {
        content = await callGroq(apiKey, {
          model: fallbackModel,
          messages,
          useJsonMode: false,
        });
      } catch (e) {
        lastError = e;
      }
    }

    if (!content) {
      res.status(502).json({
        ok: false,
        error:
          lastError instanceof Error
            ? lastError.message
            : "Empty response from the tutor. Try again.",
      });
      return;
    }

    try {
      const parsed = parseResult(extractJson(content));
      res.status(200).json({ ok: true, result: parsed });
    } catch (err) {
      res.status(502).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Could not read the lesson. Try again with clearer text or another photo.",
      });
    }
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Upstream request failed.",
    });
  }
}
