import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const MAX_QUESTION_LENGTH = 1000;
const MAX_LESSON_TEXT_LENGTH = 5000;
const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 8000;

function getGeminiErrorStatus(error: unknown): number | null {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;

    for (const key of ["status", "code"]) {
      const val = err[key];
      const parsed = normalizeStatus(val);
      if (parsed !== null) {
        return parsed;
      }
    }

    const nested = err.error;
    if (nested && typeof nested === "object") {
      const n = nested as Record<string, unknown>;
      for (const key of ["code", "status"]) {
        const val = n[key];
        const parsed = normalizeStatus(val);
        if (parsed !== null) {
          return parsed;
        }
      }
    }
  }
  return null;
}

function normalizeStatus(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
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

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key is not configured on the server." },
      { status: 503 }
    );
  }

  const genAI = new GoogleGenAI({ apiKey });

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
      const response = await genAI.models.generateContent({
        model: "gemini-3.8-flash",
        contents: systemPrompt,
      });

      const answer = response.text ?? "I'm sorry, I couldn't generate an answer. Please try again.";

      return NextResponse.json({ answer }, { status: 200 });
    } catch (error) {
      lastError = error;
      const status = getGeminiErrorStatus(error);

      if (!isRetryable(status) || attempt === MAX_RETRIES) {
        break;
      }

      await sleep(Math.min(delay, MAX_BACKOFF_MS));
      delay *= 2;
    }
  }

  console.error("Gemini error after retries:", lastError);
  return NextResponse.json(
    { error: "The tutor is temporarily unavailable. Please try again later." },
    { status: 503 }
  );
}
