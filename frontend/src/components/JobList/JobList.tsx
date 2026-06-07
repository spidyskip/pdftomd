import { useState } from "react";
import { useJobs } from "../../context/JobContext";
import JobRow from "../JobRow/JobRow";
import "./JobList.css";

const statusConfig: Record<string, { label: string; color: string }> = {
  queued: { label: "Queued", color: "var(--text-muted)" },
  processing: { label: "Processing", color: "var(--warning)" },
  finished: { label: "Done", color: "var(--success)" },
  failed: { label: "Failed", color: "var(--error)" },
};

export { statusConfig };

function JobSection({ title, jobs, defaultCollapsed = false }: { title: string; jobs: any[]; defaultCollapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  if (jobs.length === 0) return null;
  return (
    <div className="jobs-section">
      <div className="jobs-section-header" onClick={() => setCollapsed(!collapsed)}>
        <h3>{title} ({jobs.length})</h3>
        <span className={`jobs-section-toggle ${collapsed ? "collapsed" : ""}`}>▼</span>
      </div>
      {!collapsed && (
        <div className="jobs-list">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobList() {
  const { jobs } = useJobs();

  if (jobs.length === 0) {
    return (
      <div className="jobs-empty">
        <p>No documents yet</p>
        <span>Drop a PDF above to convert it to Markdown</span>
      </div>
    );
  }

  const active = jobs.filter((j) => j.status === "queued" || j.status === "processing");
  const done = jobs.filter((j) => j.status === "finished" || j.status === "failed");

  return (
    <div className="jobs">
      <JobSection title="In progress" jobs={active} defaultCollapsed={false} />
      <JobSection title="Completed" jobs={done} defaultCollapsed={true} />
    </div>
  );
}
