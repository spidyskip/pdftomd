import { useState, useEffect, useRef } from "react";
import { backendApi, healthApi } from "../../api/client";
import "./BackendToggle.css";

type Engine = "ollama" | "mlx" | "custom";

export default function BackendToggle() {
  const [backend, setBackend] = useState<Engine>("ollama");
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [mlxOk, setMlxOk] = useState<boolean | null>(null);
  const [customUrl, setCustomUrl] = useState("http://localhost:8080");
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load current backend config
  useEffect(() => {
    backendApi.get().then((d) => {
      setBackend(d.backend as Engine);
    }).catch(() => {});
  }, []);

  // Poll health for all backends
  useEffect(() => {
    const check = async () => {
      try {
        const h = await healthApi.checkAll() as {
          ollama: { available: boolean; model_loaded: boolean; url: string };
          mlx: { available: boolean; model_loaded: boolean; url: string };
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

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSwitch = async (engine: Engine) => {
    if (switching) return;
    setSwitching(true);
    try {
      const result = await backendApi.switch(engine);
      setBackend(result.backend as Engine);
      setOpen(false);
    } catch { /* ignore */ }
    setSwitching(false);
  };

  const activeOk = backend === "ollama" ? ollamaOk : backend === "mlx" ? mlxOk : null;

  return (
    <div className="engine-selector" ref={ref}>
      <button className="engine-btn" onClick={() => setOpen(!open)}>
        <span className={`engine-btn-dot ${activeOk === true ? "engine-btn-dot--online" : activeOk === false ? "engine-btn-dot--offline" : "engine-btn-dot--unknown"}`} />
        <span>{backend === "ollama" ? "Ollama" : backend === "mlx" ? "MLX" : "Custom"}</span>
        <span className={`engine-btn-arrow ${open ? "engine-btn-arrow--open" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="engine-panel">
          {/* Ollama */}
          <button
            className={`engine-option ${backend === "ollama" ? "engine-option--active" : ""}`}
            onClick={() => handleSwitch("ollama")}
            disabled={switching}
          >
            <span className="engine-option-left">
              <svg className="engine-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <span className="engine-option-info">
                <span className="engine-option-name">Ollama</span>
                <span className="engine-option-url">localhost:11434</span>
              </span>
            </span>
            <span className={`engine-btn-dot ${ollamaOk === true ? "engine-btn-dot--online" : ollamaOk === false ? "engine-btn-dot--offline" : "engine-btn-dot--unknown"}`} style={{width:6,height:6}} />
          </button>

          {/* MLX */}
          <button
            className={`engine-option ${backend === "mlx" ? "engine-option--active" : ""}`}
            onClick={() => handleSwitch("mlx")}
            disabled={switching}
          >
            <span className="engine-option-left">
              <svg className="engine-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <span className="engine-option-info">
                <span className="engine-option-name">MLX</span>
                <span className="engine-option-url">localhost:8080</span>
              </span>
            </span>
            <span className={`engine-btn-dot ${mlxOk === true ? "engine-btn-dot--online" : mlxOk === false ? "engine-btn-dot--offline" : "engine-btn-dot--unknown"}`} style={{width:6,height:6}} />
          </button>

          <div className="engine-divider" />

          {/* Custom */}
          <div className="engine-custom">
            <div className="engine-custom-label">Custom Endpoint</div>
            <div className="engine-custom-form">
              <input
                className="engine-custom-input"
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="http://host:port"
              />
              <button
                className="engine-custom-btn"
                onClick={() => handleSwitch("custom")}
                disabled={switching || !customUrl}
              >
                Connect
              </button>
            </div>
            <p className="engine-custom-hint">Ollama or MLX-vlm compatible endpoint</p>
          </div>

          {/* Status bar */}
          <div className="engine-status">
            <span className="engine-status-left">
              <span className={`engine-btn-dot ${activeOk === true ? "engine-btn-dot--online" : activeOk === false ? "engine-btn-dot--offline" : "engine-btn-dot--unknown"}`} style={{width:5,height:5}} />
              <span className="engine-status-text">
                {activeOk === true ? "Connected" : activeOk === false ? "Offline" : "Checking…"}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
