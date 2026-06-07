import { useState, useEffect } from "react";
import { healthApi } from "../../api/client";
import "./ConnectionStatus.css";

interface HealthData {
  available: boolean;
  model: string;
  model_loaded: boolean;
  backend: string;
}

export default function ConnectionStatus() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const h = await healthApi.check();
        setHealth(h as unknown as HealthData);
      } catch {
        setHealth({ available: false, model: "unknown", model_loaded: false, backend: "unknown" });
      } finally {
        setChecking(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = health?.available && health?.model_loaded;
  const isPartial = health?.available && !health?.model_loaded;
  const backendLabel = health?.backend === "mlx"
    ? "MLX"
    : health?.backend === "markitdown"
    ? "Markitdown"
    : "Ollama";

  return (
    <div className={`conn-status ${checking ? "conn-status--checking" : ""} ${isConnected ? "conn-status--connected" : ""} ${isPartial ? "conn-status--partial" : ""} ${!checking && !isConnected && !isPartial ? "conn-status--error" : ""}`}>
      <div className="conn-dot" />
      <span className="conn-label">
        {checking ? "Checking…" : isConnected ? `${backendLabel} connected` : isPartial ? `${backendLabel} model not loaded` : `${backendLabel} offline`}
      </span>
      {health && isConnected && (
        <span className="conn-model">{health.model}</span>
      )}
    </div>
  );
}
