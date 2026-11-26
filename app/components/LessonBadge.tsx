"use client";
import { Buffer } from "buffer";
import { useState, useEffect } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);
const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const DEVNET_EXPLORER_URL = "https://explorer.solana.com/tx";

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString?: () => string };
  connect?: (
    opts?: { onlyIfTrusted?: boolean }
  ) => Promise<{ publicKey?: { toString?: () => string } }>;
  disconnect?: () => void;
  signAndSendTransaction?: (
    transaction: Transaction
  ) => Promise<{ signature: string }>;
}

function getProvider(): PhantomProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window.phantom?.solana ?? window.solana) as
    | PhantomProvider
    | undefined;
}

function shortenAddress(address: string): string {
  if (!address) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export default function LessonBadge() {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInstalled(Boolean(getProvider()?.isPhantom));
      const provider = getProvider();
      const pk = provider?.publicKey?.toString?.();
      if (typeof pk === "string") {
        setPublicKey(pk);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function handleEarnBadge() {
    setError(null);
    setCancelled(null);
    let stage = "START";

    try {
      const provider = getProvider();
      stage = "CONNECT_WALLET";
      if (!provider?.isPhantom) {
        setError("Phantom extension not installed.");
        return;
      }

      let walletAddress = publicKey;
      if (!walletAddress) {
        const response = await provider.connect?.();
        const addr =
          response?.publicKey?.toString?.() ?? response?.publicKey;
        if (typeof addr === "string") {
          walletAddress = addr;
          setPublicKey(addr);
        }
      }

      if (!walletAddress) {
        setError("Wallet not connected.");
        return;
      }

      setIsSubmitting(true);

      const connection = new Connection(DEVNET_RPC_URL, "confirmed");

      stage = "CREATE_TRANSACTION";
      const memoInstruction = new TransactionInstruction({
        keys: [
          {
            pubkey: new PublicKey(walletAddress),
            isSigner: true,
            isWritable: true,
          },
        ],
        data: Buffer.from(
          "Badge: Introduction to Artificial Intelligence\nAchievement: Lesson completed",
          "utf-8"
        ),
        programId: MEMO_PROGRAM_ID,
      });

      const transaction = new Transaction();
      transaction.add(memoInstruction);

      stage = "FETCH_BLOCKHASH";
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(walletAddress);

      if (!provider.signAndSendTransaction) {
        setError("Phantom provider does not support signAndSendTransaction.");
        return;
      }

      stage = "PHANTOM_REQUEST";
      const result = await provider.signAndSendTransaction?.(transaction);
      const sig = result?.signature;
      if (!sig) {
        setError("No signature returned from Phantom.");
        return;
      }

      setSignature(sig);

      stage = "CONFIRM_TRANSACTION";
      const confirmation = await connection.confirmTransaction(
        sig,
        "confirmed"
      );
      if (confirmation.value.err) {
        setError(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
        return;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: number })?.code;
      const isRejection =
        code === 4001 ||
        /user rejected/i.test(errMsg) ||
        /rejected the request/i.test(errMsg);

      if (isRejection) {
        setCancelled(
          "Transaction cancelled. No problem, you can try again when you're ready."
        );
        return;
      }

      const stageLabel = stage;
      console.error(`Badge error at stage [${stageLabel}]:`, errMsg);

      let classifiedError = errMsg;
      if (
        /insufficient/i.test(errMsg) ||
        /insufficient funds/i.test(errMsg) ||
        /insufficient SOL/i.test(errMsg)
      ) {
        classifiedError =
          "Insufficient SOL in wallet to cover transaction fees on Devnet.";
      }

      setError(`[${stageLabel}] ${classifiedError}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!signature) return;
    try {
      await navigator.clipboard.writeText(signature);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (!isInstalled) {
    return (
      <section className="ai-card badge">
        <h2 className="ai-h2">Earn your on-chain badge</h2>
        <p className="ai-lead">
          Phantom wallet extension is not installed. Install it to earn a badge.
        </p>
        <a className="ai-btn ai-btn-primary ai-btn-lg"
          href="https://phantom.app/download"
          target="_blank"
          rel="noopener noreferrer"
        >
          Install Phantom
        </a>
        <details className="ai-info ai-phantom-help">
          <summary>Using Phantom? Devnet setup help</summary>
          <p>
            Enable Testnet Mode and select Solana Devnet in Phantom. You need a
            little free Devnet SOL to pay the fee; get some at{" "}
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
      </section>
    );
  }

  return (
    <section className="ai-card badge">
      <h2 className="ai-h2">Earn your on-chain badge</h2>
      <p className="ai-lead">
        Complete the lesson to earn a verifiable on-chain learning record. A
        Memo transaction will be submitted to Solana Devnet for your approval.
      </p>

      {!publicKey ? (
        <button
          className="ai-btn ai-btn-primary ai-btn-lg ai-btn-full"
          onClick={handleEarnBadge}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Connecting…" : "Connect & Earn Badge"}
        </button>
      ) : (
        <>
          <div className="ai-address-pill">
            Wallet: <code>{shortenAddress(publicKey)}</code>
          </div>
          {!signature ? (
            <button
              className="ai-btn ai-btn-primary ai-btn-lg ai-btn-full"
              onClick={handleEarnBadge}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Earning badge…" : "Earn Badge"}
            </button>
          ) : (
            <div className="ai-badge-earned">
              <div className="ai-badge-earned-head">
                <span className="ai-badge-earned-icon">✓</span>
                <div>
                  <p className="ai-badge-earned-title">Badge earned</p>
                  <p className="ai-badge-earned-label">
                    Verifiable on-chain learning record (Solana Devnet Memo)
                  </p>
                </div>
              </div>
              <p className="ai-badge-earned-meta">
                Your lesson completion is recorded on Solana Devnet.
              </p>
              <div className="ai-badge-sig">
                <span className="ai-badge-sig-label">Transaction</span>
                <code className="ai-badge-sig-value">
                  {shortenAddress(signature)}
                </code>
                <button
                  type="button"
                  className={`ai-copy-btn ${copied ? "is-copied" : ""}`}
                  onClick={handleCopy}
                  aria-label="Copy transaction signature"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <a
                className="ai-btn ai-btn-primary ai-btn-sm"
                href={`${DEVNET_EXPLORER_URL}/${signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Solana Explorer
              </a>
            </div>
          )}
        </>
      )}

      <details className="ai-info ai-phantom-help">
        <summary>Using Phantom? Devnet setup help</summary>
        <p>
          Enable Testnet Mode and select Solana Devnet in Phantom. You need a
          little free Devnet SOL to pay the fee; get some at{" "}
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

      {cancelled && <div className="ai-info">{cancelled}</div>}
      {error && <div className="ai-error">{error}</div>}
    </section>
  );
}
