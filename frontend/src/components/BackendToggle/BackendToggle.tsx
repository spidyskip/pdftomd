import { useState, useEffect } from "react";
import { backendApi, healthApi } from "../../api/client";
import "./BackendToggle.css";

export default function BackendToggle() {
  const [backend, setBackend] = useState<string>("mlx");
  const [switching, setSwitching] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);
  const [mlxAvailable, setMlxAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    backendApi.get().then((data) => setBackend(data.backend)).catch(() => {});
  }, []);

  // Poll health for both backends to show availability dots
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const h = await healthApi.checkAll() as {
          ollama: { available: boolean; model_loaded: boolean };
          mlx: { available: boolean; model_loaded: boolean };
        };
        setOllamaAvailable(h.ollama.available && h.ollama.model_loaded);
        setMlxAvailable(h.mlx.available && h.mlx.model_loaded);
      } catch {
        setOllamaAvailable(false);
        setMlxAvailable(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, [backend]);

  const handleSwitch = async (newBackend: string) => {
    if (newBackend === backend || switching) return;
    setSwitching(true);
    try {
      const result = await backendApi.switch(newBackend);
      setBackend(result.backend);
    } catch {
      // ignore
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="backend-toggle">
      <span className="backend-toggle-label">Engine</span>
      <div className="backend-toggle-options">
        <button
          className={`backend-toggle-btn ${backend === "ollama" ? "backend-toggle-btn--active" : ""}`}
          onClick={() => handleSwitch("ollama")}
          disabled={switching}
        >
          <span className={`backend-dot ${ollamaAvailable === true ? "backend-dot--online" : ollamaAvailable === false ? "backend-dot--offline" : "backend-dot--unknown"}`} />
          Ollama
        </button>
        <button
          className={`backend-toggle-btn ${backend === "mlx" ? "backend-toggle-btn--active" : ""}`}
          onClick={() => handleSwitch("mlx")}
          disabled={switching}
        >
          <span className={`backend-dot ${mlxAvailable === true ? "backend-dot--online" : mlxAvailable === false ? "backend-dot--offline" : "backend-dot--unknown"}`} />
          MLX
        </button>
      </div>
    </div>
  );
}
