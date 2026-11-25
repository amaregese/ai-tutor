"use client";
import { useState } from "react";
import ConnectWallet from "./components/ConnectWallet";
import LessonBadge from "./components/LessonBadge";

const LESSON_TITLE = "Introduction to Artificial Intelligence";

const LESSON_TEXT =
  "Artificial Intelligence, or AI, is the ability of computers to perform tasks that normally require human intelligence. These tasks include learning, understanding language, recognizing images, and solving problems. AI systems learn patterns from data and use those patterns to make predictions or decisions.";

export default function Home() {
  const [lessonContent] = useState(LESSON_TEXT);
  const [isLoading, setIsLoading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [tutorResponse, setTutorResponse] = useState("");
  const [askError, setAskError] = useState("");

  async function speak(text: string) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error ?? "Something went wrong");
        return;
      }
      const blob = await res.blob();
      new Audio(URL.createObjectURL(blob)).play();
    } finally {
      setIsLoading(false);
    }
  }

  async function askQuestion() {
    if (!question.trim()) {
      setAskError("Please type a question before asking.");
      return;
    }
    setAskError("");
    setIsAsking(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          lessonTitle: LESSON_TITLE,
          lessonText: LESSON_TEXT,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setAskError(body?.error ?? "Failed to get a response from the tutor.");
        return;
      }
      const data = await res.json();
      setTutorResponse(data.answer ?? "No answer received.");
    } catch {
      setAskError("Something went wrong. Please try again.");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        color: "#1e293b",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        lineHeight: 1.6,
        colorScheme: "light",
        padding: 0,
        margin: 0,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        <section
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 32,
            marginBottom: 40,
            boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          }}
        >
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 16,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            {LESSON_TITLE}
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "#334155",
              whiteSpace: "pre-wrap",
              marginBottom: 24,
            }}
          >
            {lessonContent}
          </p>
          <button
            onClick={() => speak(lessonContent)}
            disabled={isLoading}
            style={{
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              backgroundColor: isLoading ? "#cbd5e1" : "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              opacity: isLoading ? 0.6 : 1,
              transition: "background-color 0.2s, transform 0.1s",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            }}
          >
            {isLoading ? "Generating audio…" : "Hear the tutor"}
          </button>
        </section>

        <section
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 20,
              color: "#0f172a",
              letterSpacing: "-0.01em",
            }}
          >
            Ask your AI Tutor
          </h2>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question about the lesson…"
            style={{
              width: "100%",
              minHeight: 140,
              padding: 14,
              fontSize: 16,
              fontFamily: "inherit",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              resize: "vertical",
              marginBottom: 16,
              backgroundColor: "#ffffff",
              color: "#1e293b",
              boxShadow: "inset 0 1px 2px 0 rgb(0 0 0 / 0.05)",
              transition: "border-color 0.2s",
            }}
          />
          <button
            onClick={askQuestion}
            disabled={isAsking}
            style={{
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              cursor: isAsking ? "not-allowed" : "pointer",
              backgroundColor: isAsking ? "#94a3b8" : "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              opacity: isAsking ? 0.6 : 1,
              transition: "background-color 0.2s, transform 0.1s",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            }}
          >
            {isAsking ? "Asking…" : "Ask question"}
          </button>
          {askError && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#dc2626",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {askError}
            </div>
          )}
          <div
            style={{
              marginTop: 20,
              padding: 16,
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              minHeight: 80,
              color: "#475569",
            }}
          >
            {tutorResponse || "Your tutor's answer will appear here."}
          </div>
        </section>

        <ConnectWallet />

        <LessonBadge />
      </div>
    </main>
  );
}
