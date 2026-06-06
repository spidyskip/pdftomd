import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { jobsApi } from "../../api/client";
import type { Job } from "../../types/job";
import "./LivePreview.css";

interface Props {
  job: Job;
  onClose: () => void;
}

export default function LivePreview({ job, onClose }: Props) {
  const [content, setContent] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const totalPages = job.page_count || 0;

  useEffect(() => {
    let cancelled = false;

    const fetchContent = async () => {
      try {
        const text = await jobsApi.getResult(job.id);
        if (!cancelled) {
          setContent(text);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchContent();

    // Poll for updates while processing
    const interval = setInterval(async () => {
      if (job.status === "finished") {
        clearInterval(interval);
        return;
      }
      try {
        const text = await jobsApi.getResult(job.id);
        if (!cancelled && text) {
          setContent(text);
          // Count how many pages have been processed
          const matches = text.match(/## Page \d+/g);
          if (matches) setCurrentPage(matches.length);
        }
      } catch { /* not ready yet */ }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [job.id, job.status]);

  // Parse content into pages
  const pages = content.split(/(?=## Page \d+)/).filter(Boolean);
  const activePage = Math.min(currentPage, pages.length - 1);
  const currentContent = pages[activePage] || content;

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="live-preview" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <div className="preview-header-left">
            <span className="preview-title">{job.filename}</span>
            {job.status === "processing" && (
              <span className="live-badge">
                <span className="live-dot" />
                Live
              </span>
            )}
          </div>
          <div className="preview-actions">
            <button className="btn btn-close" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="live-preview-body">
          {/* Page navigation sidebar */}
          {totalPages > 1 && (
            <div className="page-nav">
              <div className="page-nav-header">Pages</div>
              <div className="page-nav-list">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`page-nav-btn ${i === activePage ? "page-nav-btn--active" : ""} ${i < currentPage ? "page-nav-btn--done" : ""} ${i > currentPage && job.status === "processing" ? "page-nav-btn--pending" : ""}`}
                    onClick={() => setCurrentPage(i)}
                  >
                    <span className="page-nav-num">{i + 1}</span>
                    {i < currentPage && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 6 5 9 10 3" />
                      </svg>
                    )}
                    {i === currentPage && job.status === "processing" && (
                      <div className="page-nav-spinner" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="preview-content-area">
            {isLoading && !content ? (
              <div className="preview-loading">
                <div className="preview-loading-spinner" />
                <span>Waiting for output…</span>
              </div>
            ) : content ? (
              <div className="preview-markdown">
                <ReactMarkdown>{currentContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="preview-empty">
                <span>No content yet</span>
                <p>Extracted text will appear here as pages are processed</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer with page info */}
        <div className="preview-footer">
          <span className="preview-footer-info">
            {job.status === "processing"
              ? `Processing page ${Math.min(currentPage + 1, totalPages)} of ${totalPages}`
              : `${totalPages} ${totalPages === 1 ? "page" : "pages"} extracted`}
          </span>
          <span className="preview-footer-progress">{job.progress}%</span>
        </div>
      </div>
    </div>
  );
}
