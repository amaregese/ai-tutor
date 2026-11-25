# AI Voice Tutor with Solana Learning Badges

An AI-powered learning application that combines spoken lessons, an AI tutor Q&A interface, and blockchain-verifiable learning achievements on Solana Devnet.

## Features

- **AI-powered lesson content** — Interactive lesson on Artificial Intelligence with spoken narration
- **ElevenLabs text-to-speech** — High-quality voice narration of lesson content using the Sarah voice
- **Gemini AI tutor** — Ask questions about the lesson and receive answers based on the supplied lesson material
- **Phantom wallet connection** — Connect your Phantom wallet to authenticate and sign transactions
- **Solana Devnet learning badges** — Earn a blockchain-recorded Memo transaction as a learning achievement (not an NFT or SPL token)

## Technology Stack

- **Next.js 16** — React framework with App Router
- **React 19** — UI library
- **TypeScript** — Type-safe JavaScript
- **Google Gemini** — Generative AI for tutor Q&A
- **ElevenLabs** — Text-to-speech API for spoken lessons
- **Solana Devnet** — Blockchain for learning badge transactions
- **Phantom** — Browser wallet for Solana transactions

## Prerequisites

- Node.js and npm installed
- Phantom browser extension installed
- Devnet SOL in your Phantom wallet (for badge transaction fees)
- API keys for Gemini and ElevenLabs

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-tutor

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local  # or create .env.local manually
# Add your API keys to .env.local (see Environment Variables section)

# Start the development server
npm run dev

# Open http://localhost:3000 in your browser
```

## Environment Variables

Create a `.env.local` file in the project root with the following variables (replace placeholder values with your actual keys):

```
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id_here
```

Never commit `.env.local` to version control. It is already excluded via `.gitignore`.

## Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Solana Devnet Learning Badges

When you click "Earn Badge," the application submits a Memo transaction to Solana Devnet containing the lesson name and achievement text. This transaction is cryptographically signed by your Phantom wallet and recorded on the Devnet blockchain.

**Important:** This is a Memo transaction only — it is **not** an NFT, SPL token, or any other tradable asset. It serves as a verifiable record that you completed the lesson.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
