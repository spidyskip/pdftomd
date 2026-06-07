export type JobStatus = "queued" | "processing" | "finished" | "failed";

export interface Job {
  id: string;
  filename: string;
  status: JobStatus;
  progress: number;
  status_text: string;
  page_count: number | null;
  error: string | null;
  created: string;
  engine?: string;
}

export interface HealthResponse {
  ollama_available: boolean;
  model: string;
  model_loaded: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}
