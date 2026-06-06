import { useState, useEffect, useRef } from "react";
import { backendApi, healthApi } from "../../api/client";
import "./BackendToggle.css";

export default function BackendToggle() {
  const [backend, setBackend] = useState<string>("mlx");
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [mlxOk, setMlxOk] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    backendApi.get().then((d) => setBackend(d.backend)).catch(() => {});
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const h = await healthApi.checkAll() as {
          ollama: { available: boolean; model_loaded: boolean };
          mlx: { available: boolean; model_loaded: boolean };
        };
        setOllamaOk(h.ollama.available && h.ollama.model_loaded);
        setMlxOk(h.mlx.available && h.mlx.model_loaded);
      } catch {
        setOllamaOk(false);
        setMlxOk(false);
      }
    };
    check();
    const i = setInterval(check, 10000);
    return () => clearInterval(i);
  }, [backend]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSwitch = async (b: string) => {
    if (b === backend || switching) return;
    setSwitching(true);
    try {
      const r = await backendApi.switch(b);
      setBackend(r.backend);
    } catch { /* ignore */ }
    setSwitching(false);
    setOpen(false);
  };

  const activeOk = backend === "mlx" ? mlxOk : ollamaOk;

  return (
    <div className="backend-toggle" ref={ref}>
      <button className="backend-toggle-main" onClick={() => setOpen(!open)}>
        <span className={`backend-dot ${activeOk === true ? "backend-dot--online" : activeOk === false ? "backend-dot--offline" : "backend-dot--unknown"}`} />
        <span>{backend === "mlx" ? "MLX" : "Ollama"}</span>
        <span className={`backend-toggle-arrow ${open ? "backend-toggle-arrow--open" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="backend-toggle-panel">
          <button
            className={`backend-toggle-option ${backend === "ollama" ? "backend-toggle-option--active" : ""}`}
            onClick={() => handleSwitch("ollama")}
            disabled={switching}
          >
            <span className="backend-toggle-option-name">
              <span className={`backend-dot ${ollamaOk === true ? "backend-dot--online" : ollamaOk === false ? "backend-dot--offline" : "backend-dot--unknown"}`} />
              Ollama
            </span>
            {backend === "ollama" && <span className="backend-toggle-check">✓</span>}
          </button>
          <button
            className={`backend-toggle-option ${backend === "mlx" ? "backend-toggle-option--active" : ""}`}
            onClick={() => handleSwitch("mlx")}
            disabled={switching}
          >
            <span className="backend-toggle-option-name">
              <span className={`backend-dot ${mlxOk === true ? "backend-dot--online" : mlxOk === false ? "backend-dot--offline" : "backend-dot--unknown"}`} />
              MLX
            </span>
            {backend === "mlx" && <span className="backend-toggle-check">✓</span>}
          </button>
          <div className="backend-toggle-hint">
            {backend === "ollama" ? "Using Ollama for OCR" : "Using Apple Silicon MLX"}
          </div>
        </div>
      )}
    </div>
  );
}
