# AI Tutor

**Learn with a voice tutor. Prove it on Solana.**

Live demo: https://ai-tutor-nine-jade.vercel.app

![Built for Dev3pack Global Hackathon](https://img.shields.io/badge/Built%20for-Dev3pack%20Global%20Hackathon-9945FF)

## Problem

Reading a lesson is passive, and it is hard to prove that a learner actually finished the material. Most completion signals live inside a single app and cannot be verified anywhere else.

## Solution

AI Tutor turns a short lesson into a voice-led experience with an AI tutor for questions and a quick quiz. Passing the quiz lets the learner mint a verifiable on-chain learning record on Solana Devnet.

## How it works

1. **Listen** to the lesson with live ElevenLabs narration when available, or the bundled recorded narration generated with ElevenLabs if live generation is unavailable.
2. **Ask the AI tutor** follow-up questions from the floating chat dialog, answered from the lesson content by Groq.
3. **Pass the quiz** — a single question with immediate feedback and an explanation.
4. **Connect Phantom** on Solana Devnet.
5. **Mint a verifiable on-chain learning record** — a Memo transaction, viewable on Solana Explorer.

## Sponsor tools

- **ElevenLabs** — voice narration. The player first posts lesson text to `/api/speak`, which calls the ElevenLabs text-to-speech API and streams back audio. If live generation is unavailable (for example, no API credit), the player falls back to the bundled `public/audio/intro-to-ai.mp3` and shows a status message. The API key stays on the server.
- **Solana** — the wallet is Phantom on Devnet. A shared wallet context keeps the top-bar wallet button and badge card in sync. Earning the badge submits one Memo transaction to the Memo program on Devnet, then shows a link to the transaction on Solana Explorer.
- **Vercel** — the app is deployed on Vercel (live demo above).
- **Groq** — powers the "Ask AI Tutor" Q&A. The server route `/api/ask` calls Groq with the lesson content and the student's question; the key stays on the server.

## Honest note

The on-chain record is a **Solana Memo transaction** — a verifiable learning record. It is **not an NFT** and does not mint a token.

## Note for judges

Phantom must be set to **Testnet Mode with Solana Devnet** and the wallet needs a little free Devnet SOL (https://faucet.solana.com). If Phantom is left on Mainnet, it can show a "dApp could be malicious" or insufficient-balance warning, because the app builds a Devnet transaction. A brand-new domain can also trigger the warning. This app requests only **one Memo transaction on Devnet** and performs **no token transfers**. After inspecting the transaction you can choose "Proceed anyway".

Source code: https://github.com/amaregese/ai-tutor

## Tech stack

- Next.js `16.4.6` (App Router)
- React `19.3.0`, React DOM `19.3.0`
- TypeScript `^5`
- Tailwind CSS `4.3.3`, `@tailwindcss/turbopack` `4.3.3`
- `@solana/web3.js` `^1.99.0`
- ESLint `^9`, `eslint-config-next` `16.4.6`
- `@types/node` `^20`, `@types/react` `^19`, `@types/react-dom` `^19`
- ElevenLabs API (server route) and Groq API (server route)

## Local setup

Prerequisites: Node.js 20+, npm, and the Phantom browser extension.

1. Install dependencies: `npm install`
2. Copy the example env file: `cp .env.example .env.local`
3. Fill in these variable names in `.env.local` (values are not included here):
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_ID`
   - `GROQ_API_KEY`

   The bundled recorded narration works without these keys. Live ElevenLabs narration and the Ask AI Tutor dialog need them.
4. Start the dev server: `npm run dev`
5. Prepare Phantom: enable Testnet Mode in Phantom's settings, select Solana Devnet, and get free Devnet SOL from https://faucet.solana.com (or `solana airdrop 2 <your-address> --url devnet`).

## Security notes

- API keys are read only in server routes and are never sent to the client.
- Input length limits: `/api/speak` caps text at 1500 characters; `/api/ask` caps the question at 1000 and lesson text at 5000 characters.
- Rate limiting is best-effort and in-memory (per server instance): 10 requests/minute for `/api/speak` and 15 requests/minute for `/api/ask`.

## Hackathon build log

### Before the hackathon

Core voice tutor, Groq Q&A, quiz, wallet connect, and memo badge. All commits dated 2026-11-26 and earlier.

### Added during the hackathon (Nov 27 - Dec 1)

- On-chain Memo now includes the lesson ID and a completion timestamp (device clock).

## How this was built

Built with the help of AI coding assistants (ChatGPT, Kilo, and Claude).

## Roadmap

- Add more lessons and a lesson picker.
- Persist quiz attempts and progress across sessions.
- Add automated tests and CI.

## License

MIT — see [LICENSE](LICENSE).