import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useJobs } from "../../context/JobContext";
import { jobsApi } from "../../api/client";
import { showToast } from "../Toast/Toast";
import "./UploadForm.css";

export default function UploadForm() {
  const [isUploading, setIsUploading] = useState(false);
  const { addJob } = useJobs();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    for (const file of acceptedFiles) {
      try {
        const result = await jobsApi.upload(file);
        addJob(result);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Upload failed";
        showToast(`${file.name}: ${msg}`, "error");
      }
    }
    const label = acceptedFiles.length === 1 ? acceptedFiles[0].name : `${acceptedFiles.length} files`;
    showToast(`${label} queued`, "success");
    setIsUploading(false);
  }, [addJob]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    maxSize: 50 * 1024 * 1024,
    disabled: isUploading,
  });

  return (
    <div className="upload">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "dropzone--active" : ""} ${isUploading ? "dropzone--disabled" : ""}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="dropzone-loading">
            <div className="dropzone-spinner" />
            <span className="dropzone-label">Processing…</span>
          </div>
        ) : (
          <div className="dropzone-content">
            <svg className="dropzone-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
            <span className="dropzone-label">
              {isDragActive ? "Drop files here" : "Drop PDFs here or click to upload"}
            </span>
            <span className="dropzone-hint">PDF files, up to 50 MB each</span>
          </div>
        )}
      </div>
    </div>
  );
}
