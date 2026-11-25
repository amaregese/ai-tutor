"use client";
import { useState, useEffect } from "react";

interface PhantomProvider {
  isPhantom?: boolean;
  connect?: () => Promise<{ publicKey?: { toString?: () => string } }>;
  disconnect?: () => void;
  on?: (event: string, handler: () => void) => void;
}

declare global {
  interface Window {
    phantom?: {
      solana?: PhantomProvider;
    };
    solana?: PhantomProvider;
  }
}

function isPhantomInstalled(): boolean {
  return typeof window !== "undefined"
    ? Boolean(window.phantom?.solana?.isPhantom)
    : false;
}

function getProvider(): PhantomProvider | undefined {
  return typeof window !== "undefined"
    ? window.phantom?.solana ?? window.solana
    : undefined;
}

function shortenAddress(address: string): string {
  if (!address) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export default function ConnectWallet() {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInstalled(isPhantomInstalled());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function handleConnect() {
    setError(null);
    setIsConnecting(true);
    try {
      const provider = getProvider();
      if (!provider?.isPhantom) {
        setError("Phantom extension not installed.");
        return;
      }
      const response = await provider.connect?.();
      const publicKeyStr =
        response?.publicKey?.toString?.() ?? response?.publicKey;
      if (typeof publicKeyStr === "string") {
        setPublicKey(publicKeyStr);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if ((err as { code?: number })?.code === 4001 || /user rejected/i.test(errMsg)) {
        setError("Connection was rejected. Please try again.");
      } else {
        setError("Failed to connect to Phantom. Please try again.");
      }
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      const provider = getProvider();
      if (provider?.disconnect) {
        provider.disconnect();
      }
    } catch {
      // Ignore disconnect errors
    }
    setPublicKey(null);
    setError(null);
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
            letterSpacing: "-0.01em",
          }}
        >
          Connect Phantom Wallet
        </h2>
        <p style={{ fontSize: 16, color: "#334155", marginBottom: 20 }}>
          Phantom wallet extension is not installed. Install it to connect your
          wallet.
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
          marginBottom: 20,
          color: "#0f172a",
          letterSpacing: "-0.01em",
        }}
      >
        Connect Phantom Wallet
      </h2>

      {!publicKey ? (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          style={{
            padding: "12px 24px",
            fontSize: 16,
            fontWeight: 600,
            cursor: isConnecting ? "not-allowed" : "pointer",
            backgroundColor: isConnecting ? "#94a3b8" : "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            opacity: isConnecting ? 0.6 : 1,
            transition: "background-color 0.2s, transform 0.1s",
            boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          }}
        >
          {isConnecting ? "Connecting…" : "Connect Wallet"}
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
            Connected:{" "}
            <code style={{ color: "#0f172a" }}>{shortenAddress(publicKey)}</code>
          </p>
          <button
            onClick={handleDisconnect}
            style={{
              padding: "10px 20px",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: "#f8fafc",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: 10,
              transition: "background-color 0.2s",
            }}
          >
            Disconnect
          </button>
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
