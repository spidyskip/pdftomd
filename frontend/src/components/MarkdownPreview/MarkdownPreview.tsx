import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useJobs } from "../../context/JobContext";
import { jobsApi } from "../../api/client";
import "./MarkdownPreview.css";

type ViewMode = "rendered" | "raw";

export default function MarkdownPreview() {
  const { previewJob, closePreview } = useJobs();
  const [copied, setCopied] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("rendered");

  const fetchContent = useCallback(async (id?: string) => {
    if (!id) return;
    try {
      const text = await jobsApi.getResult(id);
      setContent(text);
      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      // ignore; content may not be ready yet
    }
  }, []);

  useEffect(() => {
    if (!previewJob) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") closePreview(); };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [previewJob, closePreview]);

  useEffect(() => {
    if (!previewJob) return;
    // If previewJob already has content, show it immediately
    if (previewJob.content) {
      setContent(previewJob.content);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let poll: number | undefined;

    const run = async () => {
      setIsLoading(true);
      if (previewJob.id) {
        await fetchContent(previewJob.id);
        if (cancelled) return;
        // Poll while processing
        poll = window.setInterval(() => fetchContent(previewJob.id), 3000);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
    };
  }, [previewJob, fetchContent]);

  if (!previewJob) return null;

  const handleDownload = () => {
    const blob = new Blob([content || ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${previewJob.title.replace(".pdf", "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="preview-overlay" onClick={closePreview}>
      <div className="preview" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <span className="preview-title">{previewJob.title}</span>
          <div className="preview-actions">
            {content && (
              <>
                <div className="preview-tabs">
                  <button className={`preview-tab ${viewMode === "rendered" ? "preview-tab--active" : ""}`} onClick={() => setViewMode("rendered")}>Preview</button>
                  <button className={`preview-tab ${viewMode === "raw" ? "preview-tab--active" : ""}`} onClick={() => setViewMode("raw")}>Raw Markdown</button>
                </div>
              </>
            )}
            <button className="btn" onClick={handleCopy}>{copied ? "Copied" : "Copy"}</button>
            <button className="btn" onClick={handleDownload}>Download</button>
            <button className="btn btn-close" onClick={closePreview}>Close</button>
          </div>
        </div>
        <div className="preview-body">
          {isLoading && !content ? (
            <div className="preview-loading">Waiting for output…</div>
          ) : content ? (
            viewMode === "rendered" ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <pre className="preview-raw"><code>{content}</code></pre>
            )
          ) : (
            <div className="preview-empty">No content yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
