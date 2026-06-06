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

  return (
    <div className="jobs">
      <div className="jobs-list">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
