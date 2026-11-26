"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString?: () => string };
  connect?: (
    opts?: { onlyIfTrusted?: boolean }
  ) => Promise<{ publicKey?: { toString?: () => string } }>;
  disconnect?: () => void;
  on?: (event: string, handler: (arg?: unknown) => void) => void;
  removeListener?: (event: string, handler: (arg?: unknown) => void) => void;
}

declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  }
}

function getProvider(): PhantomProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return window.phantom?.solana ?? window.solana;
}

function toPublicKey(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toString" in value) {
    const address = (value as { toString?: () => string }).toString?.();
    return typeof address === "string" ? address : null;
  }
  return null;
}

interface WalletContextValue {
  isInstalled: boolean;
  publicKey: string | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let removeListeners: () => void = () => {};

    const timer = setTimeout(() => {
      const provider = getProvider();
      if (!active) return;
      setIsInstalled(Boolean(provider?.isPhantom));
      if (!provider?.isPhantom) return;

      const applyKey = (value: unknown) => {
        if (!active) return;
        const address = toPublicKey(value);
        if (address) setPublicKey(address);
      };
      const handleConnect = (value?: unknown) => applyKey(value);
      const handleDisconnect = () => {
        if (active) setPublicKey(null);
      };
      const handleAccountChanged = (value?: unknown) => {
        if (!active) return;
        if (!value) setPublicKey(null);
        else applyKey(value);
      };

      provider.on?.("connect", handleConnect);
      provider.on?.("disconnect", handleDisconnect);
      provider.on?.("accountChanged", handleAccountChanged);
      removeListeners = () => {
        provider.removeListener?.("connect", handleConnect);
        provider.removeListener?.("disconnect", handleDisconnect);
        provider.removeListener?.("accountChanged", handleAccountChanged);
      };

      applyKey(provider.publicKey);
      provider
        .connect?.({ onlyIfTrusted: true })
        .then((response) => applyKey(response?.publicKey))
        .catch(() => undefined);
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
      removeListeners();
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider?.isPhantom) {
      throw new Error("Phantom extension not installed.");
    }
    const response = await provider.connect?.();
    const address = toPublicKey(response?.publicKey);
    if (!address) throw new Error("Wallet not connected.");
    setPublicKey(address);
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await getProvider()?.disconnect?.();
    } finally {
      setPublicKey(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      isInstalled,
      publicKey,
      connected: Boolean(publicKey),
      connect,
      disconnect,
    }),
    [isInstalled, publicKey, connect, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}