"use client";
import { useState } from "react";
import ConnectWallet from "./components/ConnectWallet";
import LessonBadge from "./components/LessonBadge";

const LESSON_TITLE = "Introduction to Artificial Intelligence";

const LESSON_TEXT =
  "Artificial Intelligence, or AI, is the ability of computers to perform tasks that normally require human intelligence. These tasks include learning, understanding language, recognizing images, and solving problems. AI systems learn patterns from data and use those patterns to make predictions or decisions.";

const QUIZ_QUESTION =
  "What is Artificial Intelligence?";

const QUIZ_OPTIONS = [
  {
    id: "a",
    text: "Computer systems that perform tasks normally requiring human intelligence",
    correct: true,
  },
  {
    id: "b",
    text: "A type of computer hardware component",
    correct: false,
  },
  {
    id: "c",
    text: "Only robots and physical machines",
    correct: false,
  },
  {
    id: "d",
    text: "A single programming language",
    correct: false,
  },
];

const QUIZ_EXPLANATION =
  "AI refers to computer systems that can perform tasks typically requiring human intelligence, such as learning, understanding language, recognizing images, and solving problems. These systems learn patterns from data to make predictions or decisions.";

const SUGGESTED_QUESTIONS = [
  "What is Artificial Intelligence?",
  "How do AI systems learn from data?",
  "What tasks can AI perform?",
];

const STEPS = [
  { id: "listen", label: "Listen to the lesson", short: "Listen" },
  { id: "quiz", label: "Pass the quiz", short: "Quiz" },
  { id: "badge", label: "Earn on-chain badge", short: "Badge" },
] as const;

const HOW_IT_WORKS = [
  {
    title: "Listen to the lesson",
    text: "Hear the lesson read aloud by an ElevenLabs voice.",
  },
  {
    title: "Pass the quiz",
    text: "Check your understanding with a quick question.",
  },
  {
    title: "Earn a verifiable on-chain badge",
    text: "Get a Solana Devnet memo proving you finished.",
  },
] as const;

interface AskPanelProps {
  question: string;
  setQuestion: (v: string) => void;
  isAsking: boolean;
  askError: string;
  tutorResponse: string;
  askQuestion: () => void;
  handleSuggestedQuestion: (q: string) => void;
}

function AskPanel({
  question,
  setQuestion,
  isAsking,
  askError,
  tutorResponse,
  askQuestion,
  handleSuggestedQuestion,
}: AskPanelProps) {
  return (
    <section className="ai-card ai-ask-panel">
      <div className="ai-ask-panel-header">
        <h2 className="ai-ask-panel-title">Ask AI Tutor</h2>
        <p className="ai-ask-panel-caption">
          Ask a question about the lesson and get an answer from your AI tutor.
        </p>
      </div>
      <div className="ai-ask-chips">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            className="ai-chip"
            onClick={() => handleSuggestedQuestion(q)}
          >
            {q}
          </button>
        ))}
      </div>
      <textarea
        className="ai-textarea"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Type your question about the lesson…"
      />
      <button
        className="ai-btn ai-btn-primary ai-btn-lg ai-btn-full"
        onClick={askQuestion}
        disabled={isAsking}
      >
        {isAsking ? "Asking…" : "Ask question"}
      </button>
      {askError && <div className="ai-error">{askError}</div>}
      {isAsking && (
        <div className="ai-loading">
          <span className="ai-loading-dots" />
          Generating answer…
        </div>
      )}
        <div className="ai-answer-scroll">
          {tutorResponse || "Your tutor's answer will appear here."}
        </div>
    </section>
  );
}

export default function Home() {
  const [lessonContent] = useState(LESSON_TEXT);
  const [isLoading, setIsLoading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [tutorResponse, setTutorResponse] = useState("");
  const [askError, setAskError] = useState("");
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [askDrawerOpen, setAskDrawerOpen] = useState(false);

  const [hasListened, setHasListened] = useState(false);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizContinued, setQuizContinued] = useState(false);

  const isCorrect = quizSelected
    ? QUIZ_OPTIONS.find((o) => o.id === quizSelected)?.correct ?? false
    : false;
  const quizPassed = quizAnswered && isCorrect;
  const quizDone = quizPassed && quizContinued;
  const progress = Math.round(((hasListened ? 1 : 0) + (quizDone ? 1 : 0)) / 2 * 100);

  let currentStep: string = "listen";
  if (hasListened && !quizDone) currentStep = "quiz";
  if (quizDone) currentStep = "badge";

  async function speak(text: string) {
    setIsLoading(true);
    setSpeakError(null);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSpeakError(
          res.status === 429
            ? "Too many requests. Please wait a minute and try again."
            : body?.error ?? "Something went wrong"
        );
        return;
      }
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("Audio playback failed"));
        audio.play().catch(reject);
      });
      setHasListened(true);
    } catch {
      setSpeakError("Audio playback failed. Please try again.");
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
        setAskError(
          res.status === 429
            ? "Too many requests. Please wait a minute and try again."
            : body?.error ?? "Failed to get a response from the tutor."
        );
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

  function handleQuizSelect(optionId: string) {
    if (quizAnswered) return;
    setQuizSelected(optionId);
    setQuizAnswered(true);
  }

  function resetQuiz() {
    setQuizSelected(null);
    setQuizAnswered(false);
    setQuizContinued(false);
  }

  function continueQuiz() {
    setQuizContinued(true);
  }

  function handleSuggestedQuestion(q: string) {
    setQuestion(q);
    setAskError("");
  }

  function stepState(id: string): "done" | "current" | "locked" {
    if (id === "listen") return hasListened ? "done" : currentStep === "listen" ? "current" : "locked";
    if (id === "quiz") {
      if (quizDone) return "done";
      if (currentStep === "quiz") return "current";
      return hasListened ? "current" : "locked";
    }
    if (id === "badge") {
      if (currentStep === "badge") return "current";
      return quizDone ? "current" : "locked";
    }
    return "locked";
  }

  return (
    <main className="ai-app">
      <header className="ai-topbar">
        <div className="ai-brand">
          <div className="ai-logo">AT</div>
          <h1 className="ai-topbar-title">AI Tutor</h1>
        </div>
        <div className="ai-topbar-actions">
          <span className="ai-network-pill">
            <span className="ai-network-dot" />
            Solana Devnet
          </span>
          <ConnectWallet compact={true} />
        </div>
      </header>

      <section className="ai-hero">
        <div className="ai-hero-inner">
          <h2 className="ai-hero-title">
            Learn with a voice tutor. Prove it on <span className="ai-accent">Solana</span>.
          </h2>
          <p className="ai-hero-sub">
            A voice-led AI lesson that records your achievement on Solana Devnet when you finish.
          </p>
          <div className="ai-sponsors">
            <span className="ai-sponsor-chip">
              <span className="ai-sponsor-dot" />
              Voice by ElevenLabs
            </span>
            <span className="ai-sponsor-chip">
              <span className="ai-sponsor-dot" />
              Powered by Solana
            </span>
            <span className="ai-sponsor-chip">
              <span className="ai-sponsor-dot" />
              Deployed on Vercel
            </span>
          </div>
        </div>
      </section>

      <section className="ai-how">
        <div className="ai-how-grid">
          {HOW_IT_WORKS.map((item, index) => (
            <div key={item.title} className="ai-how-card">
              <span className="ai-how-num">{index + 1}</span>
              <h3 className="ai-how-title">{item.title}</h3>
              <p className="ai-how-text">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="ai-body">
        <aside className="ai-sidebar">
          <nav className="ai-steps">
            {STEPS.map((step, index) => {
              const state = stepState(step.id);
              const isDone = state === "done";
              const isCurrent = state === "current";
              const isLocked = state === "locked";
              const stepNumber = index + 1;
              return (
                <button
                  key={step.id}
                  className={`ai-step ${isDone ? "ai-step-done" : ""} ${isCurrent ? "ai-step-current" : ""} ${isLocked ? "ai-step-locked" : ""}`}
                  disabled={isLocked}
                >
                  <span className="ai-step-number">
                    {isDone ? "✓" : stepNumber}
                  </span>
                  <span className="ai-step-label ai-step-label-full">{step.label}</span>
                  <span className="ai-step-label ai-step-label-short">{step.short}</span>
                  <span className="ai-step-status">
                    {isDone ? "Done" : isCurrent ? "Current" : "Locked"}
                  </span>
                </button>
              );
            })}
          </nav>
          <AskPanel
            question={question}
            setQuestion={setQuestion}
            isAsking={isAsking}
            askError={askError}
            tutorResponse={tutorResponse}
            askQuestion={askQuestion}
            handleSuggestedQuestion={handleSuggestedQuestion}
          />
        </aside>

        <main className="ai-main">
          <div className="ai-progress">
            <div className="ai-progress-label">
              <span>Lesson progress</span>
              <span>{progress}% complete</span>
            </div>
            <div className="ai-progress-track">
              <div className="ai-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {currentStep === "listen" && (
            <section className="ai-card">
              <span className="ai-kicker ai-kicker-purple">
                <span className="ai-kicker-dot" />
                Lesson 01 &middot; AI Fundamentals
              </span>
              <h2 className="ai-h1">{LESSON_TITLE}</h2>
              <div className="ai-lesson-meta">
                <span>Lesson 01</span>
                <span>&middot;</span>
                <span>Est. 4 min read</span>
                <span>&middot;</span>
                <span>Voice by ElevenLabs</span>
              </div>
              <p className="ai-lead">{lessonContent}</p>
              {speakError && (
                <div className="ai-error">{speakError}</div>
              )}
              <button
                className="ai-btn-play ai-btn-primary"
                onClick={() => speak(lessonContent)}
                disabled={isLoading}
              >
                <span className="ai-btn-play-icon">
                  {isLoading ? "⟳" : "▶"}
                </span>
                {isLoading ? "Loading…" : "Listen to the lesson"}
              </button>
            </section>
          )}

          {currentStep === "quiz" && (
            <section className="ai-card">
              <span className="ai-kicker ai-kicker-navy">
                <span className="ai-kicker-dot" />
                Check your understanding
              </span>
              <h3 className="ai-h3">{QUIZ_QUESTION}</h3>
              <div className="ai-quiz-options">
                {QUIZ_OPTIONS.map((option) => {
                  const isSelected = quizSelected === option.id;
                  const isRevealed = quizAnswered;
                  const isCorrectOption = option.correct;
                  let status: "default" | "correct" | "incorrect" = "default";
                  if (isRevealed) {
                    if (isCorrectOption) status = "correct";
                    else if (isSelected) status = "incorrect";
                  }
                  return (
                    <button
                      key={option.id}
                      className={`ai-quiz-option ${status !== "default" ? `ai-quiz-option-${status}` : ""}`}
                      onClick={() => handleQuizSelect(option.id)}
                      disabled={quizAnswered}
                      aria-pressed={isSelected}
                    >
                      <span className="ai-quiz-option-letter">{option.id.toUpperCase()}</span>
                      <span className="ai-quiz-option-text">{option.text}</span>
                      {isRevealed && isCorrectOption && (
                        <span className="ai-quiz-option-check">✓</span>
                      )}
                      {isRevealed && isSelected && !isCorrectOption && (
                        <span className="ai-quiz-option-check">✗</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {quizAnswered && (
                <div className={`ai-quiz-feedback ${isCorrect ? "ai-quiz-feedback-correct" : "ai-quiz-feedback-incorrect"}`}>
                  <span className="ai-quiz-feedback-icon">
                    {isCorrect ? "✓" : "✗"}
                  </span>
                  <span className="ai-quiz-feedback-message">
                    {isCorrect ? "Correct! That's right." : "Not quite. Here's why:"}
                  </span>
                </div>
              )}
              {quizAnswered && (
                <div className="ai-quiz-explanation">
                  {QUIZ_EXPLANATION}
                </div>
              )}
              {quizAnswered && !isCorrect && (
                <button
                  className="ai-btn ai-btn-ghost"
                  onClick={resetQuiz}
                >
                  Try again
                </button>
              )}
              {quizPassed && !quizContinued && (
                <button
                  className="ai-btn ai-btn-primary"
                  onClick={continueQuiz}
                >
                  Continue
                </button>
              )}
            </section>
          )}

          {currentStep === "badge" && (
            <section className="ai-card">
              <span className="ai-kicker ai-kicker-purple">
                <span className="ai-kicker-dot" />
                Earn your badge
              </span>
              <h2 className="ai-h2">All lessons complete</h2>
              <p className="ai-lead">
                You&apos;ve listened to the lesson and passed the quiz.
                Claim your Solana Devnet learning badge below.
              </p>
            </section>
          )}

          {/* Badge card: always visible below current step */}
          {quizDone ? (
            <LessonBadge />
          ) : (
            <section className="ai-card ai-rewards-locked">
              <span className="ai-badge-locked">🔒</span>
              <div className="ai-badge-info">
                <h3 className="ai-badge-title">Learning badge</h3>
                <p className="ai-badge-caption">
                  Complete the quiz to unlock your verifiable on-chain learning record.
                </p>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Mobile: Floating Ask button + bottom sheet drawer */}
      <button
        className="ai-fab-ask"
        onClick={() => setAskDrawerOpen(true)}
        aria-label="Ask AI Tutor"
      >
        ?
      </button>

      {askDrawerOpen && (
        <div className="ai-ask-drawer-overlay" onClick={() => setAskDrawerOpen(false)}>
          <div className={`ai-ask-drawer ${askDrawerOpen ? "open" : ""}`}>
            <div className="ai-ask-drawer-handle" />
            <button
              className="ai-ask-drawer-close"
              onClick={() => setAskDrawerOpen(false)}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Close
            </button>
            <AskPanel
              question={question}
              setQuestion={setQuestion}
              isAsking={isAsking}
              askError={askError}
              tutorResponse={tutorResponse}
              askQuestion={askQuestion}
              handleSuggestedQuestion={handleSuggestedQuestion}
            />
          </div>
        </div>
      )}

      <footer className="ai-footer">
        <div className="ai-footer-inner">
          <span>Built for the Dev3pack Global Hackathon</span>
          <span aria-hidden="true">&middot;</span>
          <a
            className="ai-footer-link"
            href="https://github.com/amaregese/ai-tutor"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
