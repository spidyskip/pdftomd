import { useState, useEffect, useRef, useCallback } from "react";
import { backendApi, healthApi } from "../../api/client";
import "./BackendToggle.css";

type Engine = "ollama" | "mlx" | "markitdown" | "custom";

interface BackendConfig {
  backend: string;
  ollama_url: string;
  mlx_url: string;
  mlx_model: string;
  markitdown_path: string;
}

export default function BackendToggle() {
  const [backend, setBackend] = useState<Engine>("ollama");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [mlxUrl, setMlxUrl] = useState("http://localhost:8080");
  const [markitdownPath, setMarkitdownPath] = useState("markitdown");
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [mlxOk, setMlxOk] = useState<boolean | null>(null);
  const [markitdownOk, setMarkitdownOk] = useState<boolean | null>(null);
  const [customUrl, setCustomUrl] = useState("http://localhost:8080");
  const [customOk, setCustomOk] = useState<boolean | null>(null);
  const [customChecking, setCustomChecking] = useState(false);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load backend config from server
  useEffect(() => {
    backendApi.get().then((d: BackendConfig) => {
      setBackend(d.backend as Engine);
      setOllamaUrl(d.ollama_url);
      setMlxUrl(d.mlx_url);
      setMarkitdownPath(d.markitdown_path || "markitdown");
    }).catch(() => {});
  }, []);

  // Poll health for all backends
  useEffect(() => {
    const check = async () => {
      try {
        const h = await healthApi.checkAll() as {
          ollama: { available: boolean; model_loaded: boolean };
          mlx: { available: boolean; model_loaded: boolean };
          markitdown: { available: boolean; model_loaded: boolean };
        };
        setOllamaOk(h.ollama.available && h.ollama.model_loaded);
        setMlxOk(h.mlx.available && h.mlx.model_loaded);
        setMarkitdownOk(h.markitdown.available && h.markitdown.model_loaded);
      } catch {
        setOllamaOk(false);
        setMlxOk(false);
        setMarkitdownOk(false);
      }
    };
    check();
    const i = setInterval(check, 10000);
    return () => clearInterval(i);
  }, [backend]);

  // Live check custom endpoint (via backend proxy to avoid CORS)
  const checkCustomEndpoint = useCallback(async (url: string) => {
    if (!url) { setCustomOk(null); return; }
    setCustomChecking(true);
    try {
      const res = await backendApi.checkCustom(url);
      setCustomOk(Boolean(res.reachable));
    } catch {
      setCustomOk(false);
    }
    setCustomChecking(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => checkCustomEndpoint(customUrl), 500);
    return () => clearTimeout(timer);
  }, [customUrl, checkCustomEndpoint]);

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
      if (engine === "custom") {
        // Set the MLX URL on the server, then switch the active backend to MLX.
        await backendApi.setUrl("mlx", customUrl);
        await backendApi.switch("mlx");
        setBackend("custom");
      } else {
        await backendApi.switch(engine);
        setBackend(engine);
      }

      // Refresh configured URLs and health status
      const cfg = await backendApi.get();
      setOllamaUrl(cfg.ollama_url);
      setMlxUrl(cfg.mlx_url);
      setMarkitdownPath(cfg.markitdown_path || "markitdown");

      try {
        const h = await healthApi.checkAll() as any;
        setOllamaOk(h.ollama.available && h.ollama.model_loaded);
        setMlxOk(h.mlx.available && h.mlx.model_loaded);
        setMarkitdownOk(h.markitdown.available && h.markitdown.model_loaded);
      } catch {
        setOllamaOk(false);
        setMlxOk(false);
        setMarkitdownOk(false);
      }

      // Re-check custom endpoint status
      checkCustomEndpoint(customUrl);
      setOpen(false);
    } catch (e) {
      // ignore for now
    }
    setSwitching(false);
  };

  const activeOk = backend === "ollama"
    ? ollamaOk
    : backend === "mlx"
    ? mlxOk
    : backend === "markitdown"
    ? markitdownOk
    : customOk;
  const activeUrl = backend === "ollama"
    ? ollamaUrl
    : backend === "mlx"
    ? mlxUrl
    : backend === "markitdown"
    ? markitdownPath
    : customUrl;
  const activeLabel = backend === "ollama"
    ? "Ollama"
    : backend === "mlx"
    ? "MLX"
    : backend === "markitdown"
    ? "Markitdown"
    : "Custom";

  return (
    <div className="engine-selector" ref={ref}>
      <button className="engine-btn" onClick={() => setOpen(!open)}>
        <span className={`engine-btn-dot ${activeOk === true ? "engine-btn-dot--online" : activeOk === false ? "engine-btn-dot--offline" : "engine-btn-dot--unknown"}`} />
        <span>{activeLabel}</span>
        <span className={`engine-btn-arrow ${open ? "engine-btn-arrow--open" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="engine-panel">
          <button className={`engine-option ${backend === "ollama" ? "engine-option--active" : ""}`} onClick={() => handleSwitch("ollama")} disabled={switching}>
            <span className="engine-option-left">
              <svg className="engine-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <span className="engine-option-info">
                <span className="engine-option-name">Ollama</span>
                <span className="engine-option-url">{ollamaUrl}</span>
              </span>
            </span>
            <span className={`engine-btn-dot ${ollamaOk === true ? "engine-btn-dot--online" : ollamaOk === false ? "engine-btn-dot--offline" : "engine-btn-dot--unknown"}`} style={{width:6,height:6}} />
          </button>

          <button className={`engine-option ${backend === "mlx" ? "engine-option--active" : ""}`} onClick={() => handleSwitch("mlx")} disabled={switching}>
            <span className="engine-option-left">
              <svg className="engine-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <span className="engine-option-info">
                <span className="engine-option-name">MLX</span>
                <span className="engine-option-url">{mlxUrl}</span>
              </span>
            </span>
            <span className={`engine-btn-dot ${mlxOk === true ? "engine-btn-dot--online" : mlxOk === false ? "engine-btn-dot--offline" : "engine-btn-dot--unknown"}`} style={{width:6,height:6}} />
          </button>

          <button className={`engine-option ${backend === "markitdown" ? "engine-option--active" : ""}`} onClick={() => handleSwitch("markitdown")} disabled={switching}>
            <span className="engine-option-left">
              <svg className="engine-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>
              <span className="engine-option-info">
                <span className="engine-option-name">Markitdown</span>
                <span className="engine-option-url">{markitdownPath}</span>
              </span>
            </span>
            <span className={`engine-btn-dot ${markitdownOk === true ? "engine-btn-dot--online" : markitdownOk === false ? "engine-btn-dot--offline" : "engine-btn-dot--unknown"}`} style={{width:6,height:6}} />
          </button>

          <div className="engine-divider" />

          <div className="engine-custom">
            <div className="engine-custom-label">Custom Endpoint</div>
            <div className="engine-custom-form">
              <input className="engine-custom-input" type="text" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="http://host:port" />
              <button className="engine-custom-btn" onClick={() => handleSwitch("custom")} disabled={switching || !customUrl}>Connect</button>
            </div>
            <div className="engine-custom-status">
              {customChecking ? (
                <span className="engine-custom-checking">Checking…</span>
              ) : customOk === true ? (
                <span className="engine-custom-ok">✓ Reachable</span>
              ) : customOk === false ? (
                <span className="engine-custom-fail">✗ Unreachable</span>
              ) : null}
            </div>
          </div>

          <div className="engine-status">
            <span className="engine-status-left">
              <span className={`engine-btn-dot ${activeOk === true ? "engine-btn-dot--online" : activeOk === false ? "engine-btn-dot--offline" : "engine-btn-dot--unknown"}`} style={{width:5,height:5}} />
              <span className="engine-status-text">
                {activeOk === true ? "Connected" : activeOk === false ? "Offline" : "Checking…"}
              </span>
            </span>
            <span className="engine-status-url">{activeOk === true ? activeUrl : "—"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
