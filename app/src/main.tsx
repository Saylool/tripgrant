import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { WalletProvider } from "./wallet";
import { Plane, RefreshCw } from "lucide-react";
import type { AppConfig } from "../../shared/types";
import App from "./App";
import "./styles.css";

function Boot() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let stopped = false;
    fetch("/api/config")
      .then((r) => {
        if (!r.ok) throw new Error("Unable to connect to TripGrant.");
        return r.json();
      })
      .then((data) => {
        if (!stopped) setConfig(data);
      })
      .catch((e) => {
        if (!stopped) setError(e.message);
      });
    return () => {
      stopped = true;
    };
  }, [retry]);
  if (!config)
    return (
      <div className="boot">
        <div className="brand-icon">
          <Plane size={27} />
        </div>
        <h1>TripGrant</h1>
        <p>{error || "Getting your workspace ready…"}</p>
        {error && (
          <button
            className="btn primary"
            onClick={() => {
              setError("");
              setRetry((n) => n + 1);
            }}
          >
            <RefreshCw size={16} />
            Try again
          </button>
        )}
      </div>
    );
  return (
    <WalletProvider endpoint={config.endpoint}>
      <App config={config} />
    </WalletProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Boot />
  </React.StrictMode>,
);
