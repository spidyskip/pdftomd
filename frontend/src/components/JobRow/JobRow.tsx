import { Job } from "../../types/job";
import { useJobs } from "../../context/JobContext";
import { jobsApi } from "../../api/client";
import { showToast } from "../Toast/Toast";
import { statusConfig } from "../JobList/JobList";

interface Props { job: Job }

export default function JobRow({ job }: Props) {
  const { removeJob, showPreview } = useJobs();

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
      const text = await jobsApi.getResult(job.id);
      showPreview(text, job.filename);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Preview failed", "error");
    }
  };

  const cfg = statusConfig[job.status] || { label: job.status, color: "var(--text-muted)" };

  return (
    <div className="job-row">
      <div className="job-row-main">
        <span className="job-name">{job.filename}</span>
        <div className="job-meta">
          {job.page_count != null && <span className="job-pages">{job.page_count} pages</span>}
          <span className="job-status" style={{ color: cfg.color }}>
            <span className="status-dot" />
            {cfg.label}
          </span>
        </div>
      </div>
      {job.status === "processing" && (
        <div className="job-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${job.progress}%` }} />
          </div>
          <span className="progress-text">{job.status_text || `${job.progress}%`}</span>
        </div>
      )}
      {job.status === "failed" && job.error && (
        <div className="job-error">{job.error}</div>
      )}
      <div className="job-actions">
        {job.status === "finished" && (
          <>
            <button className="job-btn" onClick={handleView}>Preview</button>
            <button className="job-btn" onClick={handleDownload}>Download</button>
          </>
        )}
        <button className="job-btn job-btn-danger" onClick={() => removeJob(job.id)}>Remove</button>
      </div>
    </div>
  );
}
