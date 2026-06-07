import { useState } from "react";
import { Job } from "../../types/job";
import { useJobs } from "../../context/JobContext";
import { jobsApi } from "../../api/client";
import { showToast } from "../Toast/Toast";
import { statusConfig } from "../JobList/JobList";
import LivePreview from "../LivePreview/LivePreview";

interface Props { job: Job }

const STEPS = [
  { key: "model", label: "Loading model" },
  { key: "convert", label: "Converting PDF" },
  { key: "ocr", label: "Extracting text" },
  { key: "save", label: "Saving result" },
];

function getActiveStep(statusText: string): number {
  if (!statusText) return 0;
  const lower = statusText.toLowerCase();
  if (lower.includes("model") || lower.includes("check")) return 0;
  if (lower.includes("conver") || lower.includes("image")) return 1;
  if (lower.includes("ocr") || lower.includes("page") || lower.includes("extract")) return 2;
  if (lower.includes("sav") || lower.includes("writ") || lower.includes("done")) return 3;
  return 0;
}

export default function JobRow({ job }: Props) {
  const { removeJob, showPreview } = useJobs();
  const [showLivePreview, setShowLivePreview] = useState(false);
  const isProcessing = job.status === "processing";
  const activeStep = getActiveStep(job.status_text);

  const handleDownload = async () => {
    try {
      const text = await jobsApi.getResult(job.id);
      const blob = new Blob([text], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${job.filename.replace(".pdf", "")}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Download failed", "error");
    }
  };

  const handleView = async () => {
    try {
      // Fetch final result once and open preview with the full content.
      const text = await jobsApi.getResult(job.id, true);
      showPreview(text, job.filename);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Preview failed", "error");
    }
  };

  const cfg = statusConfig[job.status] || { label: job.status, color: "var(--text-muted)" };

  return (
    <div className={`job-row ${isProcessing ? "job-row--processing" : ""}`}>
      <div className="job-row-main">
        <div className="job-info">
          <span className="job-name">{job.filename}</span>
          {job.page_count != null && job.page_count > 0 && (
            <span className="job-pages">{job.page_count} {job.page_count === 1 ? "page" : "pages"}</span>
          )}
        </div>
        <span className="job-status" style={{ color: cfg.color }}>
          <span className="status-dot" />
          {cfg.label}
        </span>
      </div>

      {isProcessing && (
        <div className="job-progress">
          <div className="progress-steps">
            {STEPS.map((step, i) => (
              <div
                key={step.key}
                className={`progress-step ${i < activeStep ? "step-done" : ""} ${i === activeStep ? "step-active" : ""} ${i > activeStep ? "step-pending" : ""}`}
              >
                <div className="step-indicator">
                  {i < activeStep ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  ) : i === activeStep ? (
                    <div className="step-spinner" />
                  ) : (
                    <span className="step-number">{i + 1}</span>
                  )}
                </div>
                <span className="step-label">{step.label}</span>
                {i < STEPS.length - 1 && <div className="step-connector" />}
              </div>
            ))}
          </div>

          <div className="progress-bar">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.max(job.progress, 2)}%` }}
              />
            </div>
            <span className="progress-pct">{job.progress}%</span>
          </div>

          <p className="progress-status">{job.status_text}…</p>
        </div>
      )}

      {job.status === "failed" && job.error && (
        <div className="job-error">
          <div className="job-error-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="job-error-content">
            <span className="job-error-title">Conversion failed</span>
            <span className="job-error-text">{job.error}</span>
          </div>
        </div>
      )}

      <div className="job-actions">
        {isProcessing && (
          <button className="job-btn btn-live" onClick={() => setShowLivePreview(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Live Preview
          </button>
        )}
        {job.status === "finished" && (
          <>
            <button className="job-btn" onClick={handleView}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview
            </button>
            <button className="job-btn" onClick={handleDownload}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </button>
          </>
        )}
        {job.status === "failed" && (
          <button className="job-btn" onClick={() => showToast(job.error || "Unknown error", "error")}>
            Show details
          </button>
        )}
        <button className="job-btn job-btn-danger" onClick={() => removeJob(job.id)}>
          Remove
        </button>
      </div>

      {showLivePreview && (
        <LivePreview job={job} onClose={() => setShowLivePreview(false)} />
      )}
    </div>
  );
}
