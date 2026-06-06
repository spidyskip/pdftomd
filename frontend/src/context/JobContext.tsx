import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Job } from "../types/job";
import { jobsApi } from "../api/client";

const ACTIVE_STATUSES = ["queued", "processing"] as const;

interface JobContextValue {
  jobs: Job[];
  previewJob: { content: string; title: string } | null;
  addJob: (job: Job) => void;
  removeJob: (id: string) => void;
  showPreview: (content: string, title: string) => void;
  closePreview: () => void;
}

const JobContext = createContext<JobContextValue | null>(null);

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [previewJob, setPreviewJob] = useState<{ content: string; title: string } | null>(null);
  const intervalRef = useRef<number | null>(null);

  const addJob = useCallback((job: Job) => {
    setJobs((prev) => [...prev, job]);
  }, []);

  const removeJob = useCallback(async (id: string) => {
    await jobsApi.delete(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const showPreview = useCallback((content: string, title: string) => {
    setPreviewJob({ content, title });
  }, []);

  const closePreview = useCallback(() => {
    setPreviewJob(null);
  }, []);

  useEffect(() => {
    const poll = async () => {
      const active = jobs.filter(
        (j) => ACTIVE_STATUSES.includes(j.status as typeof ACTIVE_STATUSES[number])
      );
      if (active.length === 0) return;
      try {
        const latest = await jobsApi.list();
        setJobs(latest);
      } catch { /* ignore */ }
    };
    intervalRef.current = window.setInterval(poll, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobs]);

  return (
    <JobContext.Provider value={{ jobs, previewJob, addJob, removeJob, showPreview, closePreview }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobs() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error("useJobs must be used within JobProvider");
  return ctx;
}
