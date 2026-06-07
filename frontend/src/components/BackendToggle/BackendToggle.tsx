import { useState, useEffect, useRef, useCallback } from "react";
import { backendApi, healthApi } from "../../api/client";
import "./BackendToggle.css";

type Engine = "ollama" | "mlx" | "custom";

interface EngineInfo {
  label: string;
  url: string;
  icon: string;
}

const ENGINES: Record<Engine, EngineInfo> = {
  ollama: { label: "Ollama", url: "http://localhost:11434", icon: "layers" },
  mlx: { label: "MLX", url: "http://localhost:8080", icon: "monitor" },
  custom: { label: "Custom", url: "", icon: "globe" },
};

export default function BackendToggle() {
  const [backend, setBackend] = useState<Engine>("ollama");
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [mlxOk, setMlxOk] = useState<boolean | null>(null);
  const [customUrl, setCustomUrl] = useState("http://localhost:8080");
  const [customOk, setCustomOk] = useState<boolean | null>(null);
  const [customChecking, setCustomChecking] = useState(false);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load current backend config
  useEffect(() => {
    backendApi.get().then((d) => {
      setBackend(d.backend as Engine);
      if (d.backend === "ollama") setCustomUrl(d.ollama_url);
      else if (d.backend === "mlx") setCustomUrl(d.mlx_url);
    }).catch(() => {});
  }, []);

  // Poll health for Ollama and MLX
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

  // Live check custom endpoint when URL changes
  const checkCustomEndpoint = useCallback(async (url: string) => {
    if (!url) { setCustomOk(null); return; }
    setCustomChecking(true);
    try {
      const r = await fetch(`${url.replace(/\/$/, "")}/api/tags`, { signal: AbortSignal.timeout(3000) });
      setCustomOk(r.ok);
    } catch {
      // Try /v1/chat/completions as fallback (MLX)
      try {
        const body = JSON.stringify({ model: "test", messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }], max_tokens: 1 });
        const r = await fetch(`${url.replace(/\/$/, "")}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(3000),
        });
        setCustomOk(r.ok || r.status === 400);
      } catch {
        setCustomOk(false);
      }
    }
    setCustomChecking(false);
  }, []);

  // Debounce custom URL check
  useEffect(() => {
    const timer = setTimeout(() => checkCustomEndpoint(customUrl), 500);
    return () => clearTimeout(timer);
  }, [customUrl, checkCustomEndpoint]);

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
      await backendApi.switch(engine);
      setBackend(engine);
      setOpen(false);
    } catch { /* ignore */ }
    setSwitching(false);
  };

  const activeOk = backend === "ollama" ? ollamaOk : backend === "mlx" ? mlxOk : customOk;
  const activeInfo = ENGINES[backend];

  return (
    <div className="engine-selector" ref={ref}>
      <button className="engine-btn" onClick={() => setOpen(!open)}>
        <span className={`engine-btn-dot ${activeOk === true ? "engine-btn-dot--online" : activeOk === false ? "engine-btn-dot--offline" : "engine-btn-dot--unknown"}`} />
        <span>{activeInfo.label}</span>
        <span className={`engine-btn-arrow ${open ? "engine-btn-arrow--open" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="engine-panel">
          {/* Ollama */}
          <button className={`engine-option ${backend === "ollama" ? "engine-option--active" : ""}`} onClick={() => handleSwitch("ollama")} disabled={switching}>
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
          <button className={`engine-option ${backend === "mlx" ? "engine-option--active" : ""}`} onClick={() => handleSwitch("mlx")} disabled={switching}>
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

          {/* Status bar */}
          <div className="engine-status">
            <span className="engine-status-left">
              <span className={`engine-btn-dot ${activeOk === true ? "engine-btn-dot--online" : activeOk === false ? "engine-btn-dot--offline" : "engine-btn-dot--unknown"}`} style={{width:5,height:5}} />
              <span className="engine-status-text">
                {activeOk === true ? "Connected" : activeOk === false ? "Offline" : "Checking…"}
              </span>
            </span>
            <span className="engine-status-url">{backend === "custom" ? customUrl : ENGINES[backend].url}</span>
          </div>
        </div>
      )}
    </div>
  );
}
