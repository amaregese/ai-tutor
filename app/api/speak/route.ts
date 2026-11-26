import { clientIp, rateLimit } from "../../../lib/rateLimit";

const MAX_TEXT_LENGTH = 1500;

export async function POST(req: Request) {
  let text: unknown;

  try {
    ({ text } = await req.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return Response.json({ error: "Text is required." }, { status: 400 });
  }

  const trimmed = text.trim();

  if (trimmed.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const limit = rateLimit(clientIp(req), 10, 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (
    !apiKey ||
    !voiceId ||
    apiKey === "your_key_here" ||
    voiceId === "your_bella_voice_id_here"
  ) {
    return Response.json(
      { error: "ElevenLabs credentials are not configured" },
      { status: 503 }
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: trimmed,
        model_id: "eleven_multilingual_v2",
      }),
    }
  );

  if (!res.ok) {
    console.error("ElevenLabs error status:", res.status);
    return Response.json(
      { error: "Text-to-speech request failed" },
      { status: res.status === 401 || res.status === 403 ? 502 : 500 }
    );
  }

  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}