import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { jobsApi } from "../../api/client";
import type { Job } from "../../types/job";
import "./LivePreview.css";

interface Props {
  job: Job;
  onClose: () => void;
}

type ViewMode = "rendered" | "raw";

export default function LivePreview({ job, onClose }: Props) {
  const [content, setContent] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("rendered");
  const [error, setError] = useState<string | null>(null);
  const totalPages = job.page_count || 0;

  const fetchContent = useCallback(async () => {
    try {
      const text = await jobsApi.getResult(job.id);
      if (text) {
        setContent(text);
        setIsLoading(false);
        setError(null);
        const matches = text.match(/## Page \d+/g);
        if (matches) setCurrentPage(matches.length - 1);
      }
    } catch (err: unknown) {
      // jobsApi.getResult throws ApiError with a `status` field for non-OK responses
      const apiErr: any = err as any;
      if (apiErr && typeof apiErr.status === "number") {
        if (apiErr.status === 202) {
          setError("Processing in progress — output will appear here as pages are extracted…");
        } else if (apiErr.status === 404) {
          setError("Waiting for output…");
        } else {
          setError(null);
        }
      } else {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("no output yet")) {
          setError("Processing in progress — output will appear here as pages are extracted…");
        } else {
          setError(null);
        }
      }
      setIsLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    let cancelled = false;
    let pollInterval: number;

    const run = async () => {
      await fetchContent();
      if (cancelled) return;
      if (job.status === "processing") {
        pollInterval = window.setInterval(async () => {
          await fetchContent();
        }, 3000);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [job.id, job.status, fetchContent]);

  const pages = content.split(/(?=## Page \d+)/).filter(Boolean);
  const activePage = Math.min(currentPage, Math.max(0, pages.length - 1));
  const currentContent = pages[activePage] || content;

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.filename.replace(".pdf", "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="live-preview" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <div className="preview-header-left">
            <span className="preview-title">{job.filename}</span>
            {job.status === "processing" && (
              <span className="live-badge"><span className="live-dot" />Live</span>
            )}
            {job.status === "finished" && (
              <span className="done-badge">Done</span>
            )}
          </div>
          <div className="preview-actions">
            {content && (
              <button className="btn" onClick={handleDownload}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download
              </button>
            )}
            <button className="btn btn-close" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="live-preview-body">
          {totalPages > 1 && (
            <div className="page-nav">
              <div className="page-nav-header">Pages</div>
              <div className="page-nav-list">
                {Array.from({ length: totalPages }, (_, i) => {
                  const isDone = i < currentPage;
                  const isActive = i === currentPage;
                  const isPending = i > currentPage && job.status === "processing";
                  return (
                    <button key={i} className={`page-nav-btn ${isActive ? "page-nav-btn--active" : ""} ${isDone ? "page-nav-btn--done" : ""} ${isPending ? "page-nav-btn--pending" : ""}`} onClick={() => setCurrentPage(i)}>
                      <span className="page-nav-num">{i + 1}</span>
                      {isDone && (<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3" /></svg>)}
                      {isActive && job.status === "processing" && (<div className="page-nav-spinner" />)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="preview-content-area">
            {content && (
              <div className="preview-tabs">
                <button className={`preview-tab ${viewMode === "rendered" ? "preview-tab--active" : ""}`} onClick={() => setViewMode("rendered")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                  Preview
                </button>
                <button className={`preview-tab ${viewMode === "raw" ? "preview-tab--active" : ""}`} onClick={() => setViewMode("raw")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                  Raw Markdown
                </button>
              </div>
            )}

            {isLoading && !content ? (
              <div className="preview-loading">
                <div className="preview-loading-spinner" />
                <span>Waiting for output…</span>
              </div>
            ) : error && !content ? (
              <div className="preview-empty">
                <div className="preview-empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </div>
                <span>{error}</span>
              </div>
            ) : content ? (
              viewMode === "rendered" ? (
                <div className="preview-markdown"><ReactMarkdown>{currentContent}</ReactMarkdown></div>
              ) : (
                <div className="preview-raw"><pre><code>{content}</code></pre></div>
              )
            ) : (
              <div className="preview-empty">
                <div className="preview-empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <span>No content yet</span>
                <p>Extracted text will appear here as pages are processed</p>
              </div>
            )}
          </div>
        </div>

        <div className="preview-footer">
          <span className="preview-footer-info">
            {job.status === "processing"
              ? `Processing page ${Math.min(currentPage + 1, totalPages)} of ${totalPages}`
              : `${totalPages} ${totalPages === 1 ? "page" : "pages"} extracted`}
          </span>
          <div className="preview-footer-right">
            {content && (<span className="preview-footer-pages">{pages.length} {pages.length === 1 ? "page" : "pages"} shown</span>)}
            <span className="preview-footer-progress">{job.progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
