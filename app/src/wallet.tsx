import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  Connection,
  PublicKey,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";
import { Wallet, LogOut, LoaderCircle } from "lucide-react";
import { shortAddress } from "../../shared/amounts";

type WalletState = {
  connection: Connection;
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  error: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  sendTransaction: (
    tx: Transaction | VersionedTransaction,
    connection: Connection,
  ) => Promise<string>;
};
const context = createContext<WalletState | null>(null);
export function WalletProvider({
  endpoint,
  children,
}: {
  endpoint: string;
  children: ReactNode;
}) {
  const adapter = useMemo(() => new PhantomWalletAdapter(), []);
  const connection = useMemo(
    () => new Connection(endpoint, "confirmed"),
    [endpoint],
  );
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const connected = (key: PublicKey) => setPublicKey(key);
    const disconnected = () => setPublicKey(null);
    const failed = (e: Error) =>
      setError(e.message || "The wallet request could not be completed.");
    adapter.on("connect", connected);
    adapter.on("disconnect", disconnected);
    adapter.on("error", failed);
    return () => {
      adapter.off("connect", connected);
      adapter.off("disconnect", disconnected);
      adapter.off("error", failed);
    };
  }, [adapter]);
  const value: WalletState = {
    connection,
    publicKey,
    connected: !!publicKey,
    connecting,
    error,
    async connect() {
      setError("");
      // Do not trigger the adapter's mobile browser redirect automatically.
      if (adapter.readyState !== "Installed") {
        setError(
          "Open this site in Phantom’s browser or install the Phantom extension, then reload.",
        );
        return;
      }
      setConnecting(true);
      try {
        await adapter.connect();
        setPublicKey(adapter.publicKey);
      } catch (e) {
        setError((e as Error).message || "Wallet connection was cancelled.");
      } finally {
        setConnecting(false);
      }
    },
    async disconnect() {
      await adapter.disconnect();
      setPublicKey(null);
    },
    signMessage: (message) => adapter.signMessage(message),
    sendTransaction: (tx, rpc) => adapter.sendTransaction(tx, rpc),
  };
  return <context.Provider value={value}>{children}</context.Provider>;
}
export function useWallet() {
  const wallet = useContext(context);
  if (!wallet) throw new Error("WalletProvider is missing.");
  return wallet;
}
export function useConnection() {
  return { connection: useWallet().connection };
}
export function WalletButton() {
  const wallet = useWallet();
  return (
    <div className="wallet-control">
      <button
        className="btn primary"
        onClick={() =>
          void (wallet.connected ? wallet.disconnect() : wallet.connect())
        }
        disabled={wallet.connecting}
        title={
          wallet.connected ? "Disconnect wallet" : "Connect Phantom wallet"
        }
      >
        {wallet.connecting ? (
          <LoaderCircle className="spin" size={15} />
        ) : wallet.connected ? (
          <LogOut size={15} />
        ) : (
          <Wallet size={15} />
        )}
        {wallet.publicKey
          ? shortAddress(wallet.publicKey.toBase58())
          : wallet.connecting
            ? "Connecting…"
            : "Connect Phantom"}
      </button>
      {wallet.error && (
        <p className="wallet-error" role="alert">
          {wallet.error}
        </p>
      )}
    </div>
  );
}
