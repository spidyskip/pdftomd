import { useState, useEffect } from "react";
import { healthApi } from "../../api/client";
import type { HealthResponse } from "../../types/job";
import "./ConnectionStatus.css";

export default function ConnectionStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const h = await healthApi.check();
        setHealth(h);
      } catch {
        setHealth({ ollama_available: false, model: "glm-ocr", model_loaded: false });
      } finally {
        setChecking(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = health?.ollama_available && health?.model_loaded;
  const isPartial = health?.ollama_available && !health?.model_loaded;

  return (
    <div className={`conn-status ${checking ? "conn-status--checking" : ""} ${isConnected ? "conn-status--connected" : ""} ${isPartial ? "conn-status--partial" : ""} ${!checking && !isConnected && !isPartial ? "conn-status--error" : ""}`}>
      <div className="conn-dot" />
      <span className="conn-label">
        {checking ? "Checking…" : isConnected ? "Ollama connected" : isPartial ? "Model not loaded" : "Ollama offline"}
      </span>
      {health && (
        <span className="conn-model">{health.model}</span>
      )}
    </div>
  );
}
