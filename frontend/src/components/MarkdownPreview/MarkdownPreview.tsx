import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useJobs } from "../../context/JobContext";
import "./MarkdownPreview.css";

export default function MarkdownPreview() {
  const { previewJob, closePreview } = useJobs();
  const [copied, setCopied] = useState(false);

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

  if (!previewJob) return null;

  const handleDownload = () => {
    const blob = new Blob([previewJob.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${previewJob.title.replace(".pdf", "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewJob.content);
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
            <button className="btn" onClick={handleCopy}>{copied ? "Copied" : "Copy"}</button>
            <button className="btn" onClick={handleDownload}>Download</button>
            <button className="btn btn-close" onClick={closePreview}>Close</button>
          </div>
        </div>
        <div className="preview-body">
          <ReactMarkdown>{previewJob.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
