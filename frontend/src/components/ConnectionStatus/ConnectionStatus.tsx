import { useState, useEffect } from "react";
import { healthApi } from "../../api/client";
import "./ConnectionStatus.css";

interface HealthData {
  available: boolean;
  model: string;
  model_loaded: boolean;
  ocr_available?: boolean;
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

  const markitdownOcrAvailable = health?.ocr_available === true;

  const modelLabel = backendLabel === "Markitdown"
    ? markitdownOcrAvailable ? "with OCR" : "basic (no ocr)"
    : (isConnected || isPartial) && health?.model && health.model !== "unknown"
    ? health.model
    : "";

  const infoMessage = backendLabel === "Markitdown"
    ? isConnected
      ? markitdownOcrAvailable
        ? "Markitdown with OCR is active. It can convert and extract text from scanned PDFs."
        : "Markitdown is active but OCR is not available. Install the markitdown-ocr package to enable OCR for scanned PDFs."
      : isPartial
      ? "Markitdown is reachable but OCR support (markitdown-ocr) is not installed."
      : "Markitdown is installed without OCR support. Install the markitdown-ocr package to enable OCR."
    : !checking && !isConnected
    ? backendLabel === "MLX"
      ? "MLX is not reachable. Ensure the MLX server is running and the configured model is available."
      : "Ollama is not reachable. Make sure Ollama is running and the selected model is loaded."
    : isPartial
    ? `${backendLabel} is reachable but the model is not loaded yet.`
    : "";

  return (
    <div className={`conn-status ${checking ? "conn-status--checking" : ""} ${isConnected ? "conn-status--connected" : ""} ${isPartial ? "conn-status--partial" : ""} ${!checking && !isConnected && !isPartial ? "conn-status--error" : ""}`}>
      <span className="conn-label">
        {checking ? "Checking…" : isConnected ? backendLabel : isPartial ? backendLabel : backendLabel === "Markitdown" ? "Markitdown" : "OCR disabled"}
      </span>
      {modelLabel && (
        <span className="conn-model">{modelLabel}</span>
      )}
      {infoMessage && (
        <span className="conn-tooltip-wrapper" aria-label={infoMessage}>
          <span className="conn-tooltip-icon">?</span>
          <span className="conn-tooltip">{infoMessage}</span>
        </span>
      )}
    </div>
  );
}
