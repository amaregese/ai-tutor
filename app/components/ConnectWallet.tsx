"use client";
import { useState } from "react";
import { useWallet } from "./WalletProvider";

function shortenAddress(address: string): string {
  if (!address) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

interface ConnectWalletProps {
  compact?: boolean;
}

export default function ConnectWallet({ compact = false }: ConnectWalletProps) {
  const { isInstalled, publicKey, connect, disconnect } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setError(null);
    setIsConnecting(true);
    try {
      await connect();
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
      await disconnect();
    } catch {
      // Ignore disconnect errors
    }
    setError(null);
  }

  if (compact) {
    if (!isInstalled) {
      return (
        <a
          className="ai-btn ai-btn-primary ai-btn-sm"
          href="https://phantom.app/download"
          target="_blank"
          rel="noopener noreferrer"
        >
          Install Phantom
        </a>
      );
    }
    if (!publicKey) {
      return (
        <button
          className="ai-btn ai-btn-primary ai-btn-sm"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </button>
      );
    }
    return (
      <button
        className="ai-btn ai-btn-secondary ai-btn-sm ai-wallet-connected"
        onClick={handleDisconnect}
        title="Disconnect wallet"
        aria-label={`Connected wallet ${shortenAddress(publicKey)}. Click to disconnect.`}
      >
        <span className="ai-network-dot" />
        {shortenAddress(publicKey)}
      </button>
    );
  }

  if (!isInstalled) {
    return (
      <section className="ai-card wallet">
        <h2 className="ai-h2">Connect Phantom Wallet</h2>
        <p className="ai-lead">
          Phantom wallet extension is not installed. Install it to connect your
          wallet.
        </p>
        <a className="ai-btn ai-btn-primary ai-btn-lg"
          href="https://phantom.app/download"
          target="_blank"
          rel="noopener noreferrer"
        >
          Install Phantom
        </a>
      </section>
    );
  }

  return (
    <section className="ai-card wallet">
      <h2 className="ai-h2">Connect Phantom Wallet</h2>

      {!publicKey ? (
        <button
          className="ai-btn ai-btn-primary ai-btn-lg ai-btn-full"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </button>
      ) : (
        <>
          <p className="ai-lead ai-mb-0">
            Connected: <code>{shortenAddress(publicKey)}</code>
          </p>
          <button
            className="ai-btn ai-btn-secondary ai-btn-lg"
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
        </>
      )}

      {error && <div className="ai-error">{error}</div>}
    </section>
  );
}