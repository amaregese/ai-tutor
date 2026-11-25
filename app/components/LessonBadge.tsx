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
  const [currentStage, setCurrentStage] = useState<string | null>(null);

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
    setCurrentStage(null);
    let stage = "START";

    try {
      const provider = getProvider();
      stage = "CONNECT_WALLET";
      setCurrentStage("CONNECT_WALLET");
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
      setCurrentStage("CREATE_TRANSACTION");
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
      setCurrentStage("FETCH_BLOCKHASH");
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(walletAddress);

      if (!provider.signAndSendTransaction) {
        setError("Phantom provider does not support signAndSendTransaction.");
        return;
      }

      stage = "PHANTOM_REQUEST";
      setCurrentStage("PHANTOM_REQUEST");
      const result = await provider.signAndSendTransaction?.(transaction);
      const sig = result?.signature;
      if (!sig) {
        setError("No signature returned from Phantom.");
        return;
      }

      setSignature(sig);

      stage = "CONFIRM_TRANSACTION";
      setCurrentStage("CONFIRM_TRANSACTION");
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
      const stageLabel = stage;
      console.error(`Badge error at stage [${stageLabel}]:`, errMsg);
      const code = (err as { code?: number })?.code;

      let classifiedError = errMsg;
      if (code === 4001 || /user rejected/i.test(errMsg)) {
        classifiedError = "Transaction was rejected by the user.";
      } else if (
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

  if (!isInstalled) {
    return (
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
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 16,
            color: "#0f172a",
          }}
        >
          Earn Learning Badge
        </h2>
        <p style={{ fontSize: 16, color: "#334155", marginBottom: 20 }}>
          Phantom wallet extension is not installed. Install it to earn a badge.
        </p>
        <a
          href="https://phantom.app/download"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "12px 24px",
            fontSize: 16,
            fontWeight: 600,
            color: "#2563eb",
            textDecoration: "none",
            border: "1px solid #2563eb",
            borderRadius: 10,
            transition: "background-color 0.2s",
          }}
        >
          Install Phantom
        </a>
      </section>
    );
  }

  return (
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
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 16,
          color: "#0f172a",
        }}
      >
        Earn Learning Badge
      </h2>
      <p style={{ fontSize: 16, color: "#334155", marginBottom: 24 }}>
        Complete the lesson to earn a Solana Devnet learning badge. A Memo
        transaction will be submitted to Devnet for your approval.
      </p>

      {!publicKey ? (
        <button
          onClick={handleEarnBadge}
          disabled={isSubmitting}
          style={{
            padding: "12px 24px",
            fontSize: 16,
            fontWeight: 600,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            backgroundColor: isSubmitting ? "#94a3b8" : "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            opacity: isSubmitting ? 0.6 : 1,
            transition: "background-color 0.2s, transform 0.1s",
            boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          }}
        >
          {isSubmitting ? "Earning badge…" : "Connect & Earn Badge"}
        </button>
      ) : (
        <>
          <p
            style={{
              fontSize: 16,
              color: "#334155",
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            Wallet: <code style={{ color: "#0f172a" }}>{shortenAddress(publicKey)}</code>
          </p>
          {!signature ? (
            <button
              onClick={handleEarnBadge}
              disabled={isSubmitting}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                fontWeight: 600,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                backgroundColor: isSubmitting ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 10,
                opacity: isSubmitting ? 0.6 : 1,
                transition: "background-color 0.2s, transform 0.1s",
                boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
              }}
            >
              {isSubmitting ? "Earning badge…" : "Earn Badge"}
            </button>
          ) : (
            <div
              style={{
                padding: 16,
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 10,
                color: "#166534",
                marginTop: 16,
              }}
            >
              <p style={{ fontWeight: 600, marginBottom: 8 }}>✓ Badge earned!</p>
              <p style={{ fontSize: 14, marginBottom: 8, wordBreak: "break-all" }}>
                Signature:{" "}
                <code style={{ color: "#0f172a" }}>{signature}</code>
              </p>
              <a
                href={`${DEVNET_EXPLORER_URL}/${signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#2563eb",
                  textDecoration: "none",
                  border: "1px solid #2563eb",
                  borderRadius: 8,
                }}
              >
                View on Devnet Explorer
              </a>
            </div>
          )}
        </>
      )}

      {error && (
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
          {error}
        </div>
      )}
    </section>
  );
}
