import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "../../../lib/rateLimit";

const MAX_QUESTION_LENGTH = 1000;
const MAX_LESSON_TEXT_LENGTH = 5000;
const MAX_RETRIES = 1;
const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8000;

function getGroqErrorStatus(error: unknown): number | null {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    const status = err.status;
    if (typeof status === "number") {
      return status;
    }
    return null;
  }
  return null;
}

function isRetryable(status: number | null): boolean {
  return status === 503 || status === 429;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question, lessonTitle, lessonText } = body as {
    question?: unknown;
    lessonTitle?: unknown;
    lessonText?: unknown;
  };

  if (
    typeof question !== "string" ||
    question.trim().length === 0 ||
    question.length > MAX_QUESTION_LENGTH
  ) {
    return NextResponse.json(
      { error: `Question is required and must be at most ${MAX_QUESTION_LENGTH} characters.` },
      { status: 400 }
    );
  }

  if (
    typeof lessonTitle !== "string" ||
    lessonTitle.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "Lesson title is required." },
      { status: 400 }
    );
  }

  if (
    typeof lessonText !== "string" ||
    lessonText.trim().length === 0 ||
    lessonText.length > MAX_LESSON_TEXT_LENGTH
  ) {
    return NextResponse.json(
      { error: `Lesson text is required and must be at most ${MAX_LESSON_TEXT_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const limit = rateLimit(clientIp(req), 15, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Groq API key is not configured on the server." },
      { status: 503 }
    );
  }

  const systemPrompt = `You are a friendly and helpful AI tutor. Answer the student's question based only on the supplied lesson content. Explain concepts clearly and simply. If the question goes beyond what is covered in the lesson, admit that you do not have enough information from the lesson and suggest what the student could explore next. Do not fabricate facts. Be encouraging and supportive.

Lesson title: ${lessonTitle}

Lesson content:
${lessonText}

Student question:
${question.trim()}`;

  let lastError: unknown = null;
  let delay = INITIAL_BACKOFF_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: question.trim() },
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          const status = errorBody?.status ?? response.status;
          lastError = new Error(`Groq API error: ${status}`);
          if (!isRetryable(status) || attempt === MAX_RETRIES) {
            break;
          }
          await sleep(Math.min(delay, MAX_BACKOFF_MS));
          delay *= 2;
          continue;
        }

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't generate an answer. Please try again.";

        return NextResponse.json({ answer }, { status: 200 });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: unknown) {
      lastError = error;
      const status = getGroqErrorStatus(error);

      if (!isRetryable(status) || attempt === MAX_RETRIES) {
        break;
      }

      await sleep(Math.min(delay, MAX_BACKOFF_MS));
      delay *= 2;
    }
  }

  console.error("Groq error after retries:", lastError);
  return NextResponse.json(
    { error: "The tutor is temporarily unavailable. Please try again later." },
    { status: 503 }
  );
}
