const SCHEMA_HINT = `{
  "title": "short topic title",
  "gist": "one everyday sentence of what this is about",
  "explanation": "3 to 6 short paragraphs, separated by blank lines. Everyday words. Define any needed term in the same sentence.",
  "keyIdeas": ["3 to 6 punchy bullets"],
  "analogy": "one concrete comparison from ordinary life",
  "watchOut": "one common mix-up, in one or two sentences",
  "questions": [
    {
      "prompt": "question that checks understanding of THESE notes",
      "choices": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "why": "one sentence, after they answer"
    }
  ]
}`;

function extractJson(raw) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced && fenced[1] ? fenced[1].trim() : trimmed);
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The tutor returned something I could not read. Try again.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
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

module.exports = async function handler(req, res) {
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
    res.status(500).json({ ok: false, error: "GROQ_API_KEY is not configured on the server." });
    return;
  }
  const body = req.body || {};
  const text = typeof body.text === "string" ? body.text.slice(0, 12000) : "";
  const subject = typeof body.subject === "string" ? body.subject.slice(0, 80) : "";
  const images = Array.isArray(body.images)
    ? body.images.filter((item) => typeof item === "string").slice(0, 3)
    : [];
  if (!text.trim() && images.length === 0) {
    res.status(400).json({ ok: false, error: "Add some notes or a photo first." });
    return;
  }
  const userParts = [{
    type: "text",
    text: [
      subject ? `Class / subject hint: ${subject}` : "",
      text.trim() ? `Student notes:\n${text.trim()}` : "The student uploaded photos of a textbook or notes. Read the text in the images.",
      "Explain this in the simplest honest way, then write practice questions grounded only in this material.",
      `Return ONLY JSON matching:\n${SCHEMA_HINT}`,
      "Write 6 to 8 questions. Exactly 4 choices each. correctIndex is 0-3.",
    ].filter(Boolean).join("\n\n"),
  }];
  for (const url of images) {
    userParts.push({ type: "image_url", image_url: { url } });
  }
  const model = images.length > 0 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";
  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, temperature: 0.35, max_tokens: 2800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a patient tutor. You explain like a sharp friend, never a textbook. Short sentences. Everyday words. No emoji. No filler. Ground quizzes only in the provided notes. Always respond with valid JSON only." },
          { role: "user", content: userParts },
        ],
      }),
    });
    if (!groqRes.ok) {
      let detail = `Groq API error ${groqRes.status}`;
      try { const errBody = await groqRes.json(); if (errBody.error && errBody.error.message) detail = errBody.error.message; } catch {}
      res.status(502).json({ ok: false, error: detail });
      return;
    }
    const groqBody = await groqRes.json();
    const content = (groqBody.choices && groqBody.choices[0] && groqBody.choices[0].message && groqBody.choices[0].message.content) || "";
    if (!content) {
      res.status(502).json({ ok: false, error: "Empty response from the tutor. Try again." });
      return;
    }
    try {
      const parsed = parseResult(extractJson(content));
      res.status(200).json({ ok: true, result: parsed });
    } catch (err) {
      res.status(502).json({ ok: false, error: err instanceof Error ? err.message : "Could not read the lesson." });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Upstream request failed." });
  }
};
