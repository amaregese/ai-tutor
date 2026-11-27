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

const USER_DISCONNECTED_KEY = "aitutor:wallet:userDisconnected";

function readUserDisconnected(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(USER_DISCONNECTED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeUserDisconnected(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      localStorage.setItem(USER_DISCONNECTED_KEY, "1");
    } else {
      localStorage.removeItem(USER_DISCONNECTED_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

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

      const userExplicitlyDisconnected = readUserDisconnected();

      const applyKey = (value: unknown) => {
        if (!active) return;
        // If user explicitly disconnected, ignore all external key adoption
        if (readUserDisconnected()) return;
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

      if (!userExplicitlyDisconnected) {
        // Normal path: attach listeners and adopt existing key
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
      } else {
        // User explicitly disconnected: don't adopt key, don't attach listeners,
        // skip silent connect, and call provider.disconnect() once to sync Phantom
        try {
          provider.disconnect?.();
        } catch {
          // ignore
        }
      }
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
    // Clear the userDisconnected flag BEFORE calling provider.connect()
    // so the user's own connect and its events are accepted
    writeUserDisconnected(false);
    const response = await provider.connect?.();
    const address = toPublicKey(response?.publicKey);
    if (!address) throw new Error("Wallet not connected.");
    setPublicKey(address);
  }, []);

  const disconnect = useCallback(async () => {
    // 1. Synchronously clear app state so UI shows "Connect Wallet" immediately
    setPublicKey(null);
    writeUserDisconnected(true);

    // 2. Call provider.disconnect() in background with timeout + retry
    const provider = getProvider();
    const providerDisconnect = provider?.disconnect;
    if (!providerDisconnect) return;

    const attemptDisconnect = async (attempt: number) => {
      try {
        await Promise.race([
          providerDisconnect(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 3000)
          ),
        ]);
      } catch {
        if (attempt < 1) {
          // retry once
          await attemptDisconnect(attempt + 1);
        }
        // ignore failure; UI already disconnected
      }
    };

    await attemptDisconnect(0);
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