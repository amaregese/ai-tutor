"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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

type StepId = (typeof STEPS)[number]["id"];

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
  onClose?: () => void;
}

function AskPanel({
  question,
  setQuestion,
  isAsking,
  askError,
  tutorResponse,
  askQuestion,
  handleSuggestedQuestion,
  onClose,
}: AskPanelProps) {
  return (
    <section className="ai-card ai-ask-panel">
      <div className="ai-ask-panel-header">
        <div className="ai-ask-panel-heading">
          <h2 className="ai-ask-panel-title">Ask AI Tutor</h2>
          <p className="ai-ask-panel-caption">
            Ask a question about the lesson and get an answer from your AI tutor.
          </p>
        </div>
        {onClose && (
          <button
            className="ai-ask-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
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
        autoFocus
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

type AudioStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "error";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function LessonAudio({
  lessonText,
  onEnded,
}: {
  lessonText: string;
  onEnded: () => void;
}) {
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const loadedTextRef = useRef<string | null>(null);
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const cleanupAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      audio.onplay = null;
      audio.onpause = null;
      audio.onerror = null;
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  useEffect(() => {
    if (loadedTextRef.current !== null && loadedTextRef.current !== lessonText) {
      cleanupAudio();
      loadedTextRef.current = null;
      setStatus("idle");
      setError(null);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [lessonText, cleanupAudio]);

  async function loadAudio() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lessonText }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          res.status === 429
            ? "Too many requests. Please wait a minute and try again."
            : body?.error ?? "Something went wrong"
        );
        setStatus("error");
        return;
      }
      const blob = await res.blob();
      cleanupAudio();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.playbackRate = speed;
      audioRef.current = audio;
      loadedTextRef.current = lessonText;

      audio.onloadedmetadata = () => {
        setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      };
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onplay = () => setStatus("playing");
      audio.onpause = () =>
        setStatus((prev) => (prev === "ended" ? "ended" : "paused"));
      audio.onended = () => {
        setStatus("ended");
        setCurrentTime(Number.isFinite(audio.duration) ? audio.duration : 0);
        onEndedRef.current();
      };
      audio.onerror = () => {
        setError("Audio playback failed. Please try again.");
        setStatus("error");
      };

      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setCurrentTime(0);
      setStatus("ready");
      audio.play().catch(() => {
        // Autoplay may be blocked; the controls remain available.
      });
    } catch {
      setError("Audio playback failed. Please try again.");
      setStatus("error");
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (status === "playing") {
      audio.pause();
      return;
    }
    if (audio.ended) audio.currentTime = 0;
    audio.play().catch(() => {
      setError("Audio playback failed. Please try again.");
      setStatus("error");
    });
  }

  function restart() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play().catch(() => {
      setError("Audio playback failed. Please try again.");
      setStatus("error");
    });
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  function changeSpeed(value: number) {
    setSpeed(value);
    if (audioRef.current) audioRef.current.playbackRate = value;
  }

  const showControls =
    status === "ready" ||
    status === "playing" ||
    status === "paused" ||
    status === "ended";
  const isPlaying = status === "playing";

  return (
    <div className="ai-audio">
      {status === "idle" && (
        <button
          className="ai-btn-play ai-btn-primary"
          onClick={loadAudio}
          aria-label="Listen to the lesson"
        >
          <span className="ai-btn-play-icon" aria-hidden="true">
            ▶
          </span>
          Listen to the lesson
        </button>
      )}

      {status === "loading" && (
        <button
          className="ai-btn-play ai-btn-primary"
          disabled
          aria-label="Loading audio"
        >
          <span className="ai-btn-play-icon" aria-hidden="true">
            ⟳
          </span>
          Loading…
        </button>
      )}

      {status === "error" && (
        <div className="ai-audio-error">
          <p className="ai-error" role="alert">
            {error}
          </p>
          <button
            className="ai-btn ai-btn-primary"
            onClick={loadAudio}
            aria-label="Retry loading audio"
          >
            Retry
          </button>
        </div>
      )}

      {showControls && (
        <div className="ai-audio-controls">
          <button
            className="ai-btn ai-btn-primary ai-audio-toggle"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause narration" : "Play narration"}
          >
            <span className="ai-btn-play-icon" aria-hidden="true">
              {isPlaying ? "❚❚" : "▶"}
            </span>
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            className="ai-btn ai-btn-secondary ai-audio-restart"
            onClick={restart}
            aria-label="Restart narration from the beginning"
          >
            <span aria-hidden="true">↺</span> Restart
          </button>

          <div className="ai-audio-seek">
            <input
              className="ai-audio-range"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Seek narration"
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            />
            <div className="ai-audio-time">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <label className="ai-audio-speed">
            <span className="ai-audio-speed-label">Speed</span>
            <select
              className="ai-audio-select"
              value={speed}
              onChange={(event) => changeSpeed(Number(event.target.value))}
              aria-label="Playback speed"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [lessonContent] = useState(LESSON_TEXT);
  const [isAsking, setIsAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [tutorResponse, setTutorResponse] = useState("");
  const [askError, setAskError] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [showAskHint, setShowAskHint] = useState(true);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  const [hasListened, setHasListened] = useState(false);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizContinued, setQuizContinued] = useState(false);
  const [viewedStep, setViewedStep] = useState<StepId>("listen");
  const [practiceSelected, setPracticeSelected] = useState<string | null>(null);
  const [practiceAnswered, setPracticeAnswered] = useState(false);

  const isCorrect = quizSelected
    ? QUIZ_OPTIONS.find((o) => o.id === quizSelected)?.correct ?? false
    : false;
  const quizPassed = quizAnswered && isCorrect;
  const quizDone = quizPassed && quizContinued;
  const progress = Math.round(((hasListened ? 1 : 0) + (quizDone ? 1 : 0)) / 2 * 100);

  let currentStep: StepId = "listen";
  if (hasListened && !quizDone) currentStep = "quiz";
  if (quizDone) currentStep = "badge";

  const practiceMode = quizDone;
  const activeQuizSelected = practiceMode ? practiceSelected : quizSelected;
  const activeQuizAnswered = practiceMode ? practiceAnswered : quizAnswered;
  const activeQuizCorrect = activeQuizSelected
    ? QUIZ_OPTIONS.find((o) => o.id === activeQuizSelected)?.correct ?? false
    : false;

  useEffect(() => {
    const timer = setTimeout(() => setShowAskHint(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!askOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setAskOpen(false);
      requestAnimationFrame(() => fabRef.current?.focus());
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [askOpen]);

  function openAsk() {
    setAskOpen(true);
    setShowAskHint(false);
  }

  function closeAsk() {
    setAskOpen(false);
    setShowAskHint(false);
    requestAnimationFrame(() => fabRef.current?.focus());
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
    if (quizDone) return;
    setQuizContinued(true);
    setViewedStep("badge");
  }

  function handleAudioEnded() {
    if (hasListened) return;
    setHasListened(true);
    setViewedStep("quiz");
  }

  function handlePracticeSelect(optionId: string) {
    if (practiceAnswered) return;
    setPracticeSelected(optionId);
    setPracticeAnswered(true);
  }

  function resetPractice() {
    setPracticeSelected(null);
    setPracticeAnswered(false);
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
                  onClick={() => setViewedStep(step.id)}
                  disabled={isLocked}
                  aria-disabled={isLocked}
                  aria-current={viewedStep === step.id ? "step" : undefined}
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

          {viewedStep !== currentStep && (
            <button
              className="ai-btn ai-btn-ghost ai-back-step"
              onClick={() => setViewedStep(currentStep)}
            >
              <span aria-hidden="true">&larr;</span> Back to current step
            </button>
          )}

          <section
            className="ai-card"
            hidden={viewedStep !== "listen"}
          >
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
            <LessonAudio
              lessonText={lessonContent}
              onEnded={handleAudioEnded}
            />
          </section>

          {viewedStep === "quiz" && (
            <section className="ai-card">
              <span className="ai-kicker ai-kicker-navy">
                <span className="ai-kicker-dot" />
                Check your understanding
              </span>
              {practiceMode && (
                <p className="ai-practice-note">
                  Practice mode, your progress is saved
                </p>
              )}
              <h3 className="ai-h3">{QUIZ_QUESTION}</h3>
              <div className="ai-quiz-options">
                {QUIZ_OPTIONS.map((option) => {
                  const isSelected = activeQuizSelected === option.id;
                  const isRevealed = activeQuizAnswered;
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
                      onClick={() =>
                        practiceMode
                          ? handlePracticeSelect(option.id)
                          : handleQuizSelect(option.id)
                      }
                      disabled={activeQuizAnswered}
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
              {activeQuizAnswered && (
                <div className={`ai-quiz-feedback ${activeQuizCorrect ? "ai-quiz-feedback-correct" : "ai-quiz-feedback-incorrect"}`}>
                  <span className="ai-quiz-feedback-icon">
                    {activeQuizCorrect ? "✓" : "✗"}
                  </span>
                  <span className="ai-quiz-feedback-message">
                    {activeQuizCorrect ? "Correct! That's right." : "Not quite. Here's why:"}
                  </span>
                </div>
              )}
              {activeQuizAnswered && (
                <div className="ai-quiz-explanation">
                  {QUIZ_EXPLANATION}
                </div>
              )}
              {activeQuizAnswered && !activeQuizCorrect && (
                <button
                  className="ai-btn ai-btn-ghost"
                  onClick={practiceMode ? resetPractice : resetQuiz}
                >
                  Try again
                </button>
              )}
              {!practiceMode && quizPassed && !quizContinued && (
                <button
                  className="ai-btn ai-btn-primary"
                  onClick={continueQuiz}
                >
                  Continue
                </button>
              )}
            </section>
          )}

          {viewedStep === "badge" && (
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
                <details className="ai-info ai-phantom-help">
                  <summary>Using Phantom? Devnet setup help</summary>
                  <p>
                    Enable Testnet Mode and select Solana Devnet in Phantom. You
                    need a little free Devnet SOL to pay the fee; get some at{" "}
                    <a
                      href="https://faucet.solana.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      faucet.solana.com
                    </a>
                    .
                  </p>
                </details>
              </div>
            </section>
          )}
        </main>
      </div>

      {showAskHint && !askOpen && (
        <div className="ai-fab-hint" role="status">
          Questions? Ask the AI tutor
        </div>
      )}

      <button
        ref={fabRef}
        className="ai-fab-ask"
        onClick={() => (askOpen ? closeAsk() : openAsk())}
        aria-label="Ask AI Tutor"
        aria-expanded={askOpen}
        aria-controls="ai-ask-dialog"
      >
        <span className="ai-fab-icon" aria-hidden="true">💬</span>
        <span className="ai-fab-label">
          Ask<span className="ai-fab-label-extra"> AI Tutor</span>
        </span>
      </button>

      {askOpen && (
        <div
          className="ai-ask-dialog"
          id="ai-ask-dialog"
          role="dialog"
          aria-label="Ask AI Tutor"
        >
          <div className="ai-ask-dialog-handle" aria-hidden="true" />
          <AskPanel
            question={question}
            setQuestion={setQuestion}
            isAsking={isAsking}
            askError={askError}
            tutorResponse={tutorResponse}
            askQuestion={askQuestion}
            handleSuggestedQuestion={handleSuggestedQuestion}
            onClose={closeAsk}
          />
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
