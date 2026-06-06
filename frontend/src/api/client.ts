import { Job, HealthResponse, ApiError } from "../types/job";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (options?.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (err as { detail?: string }).detail || "Request failed");
  }
  return res.json() as Promise<T>;
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (err as { detail?: string }).detail || "Request failed");
  }
  return res.text();
}

export const jobsApi = {
  list: () => request<Job[]>("/jobs"),
  get: (id: string) => request<Job>(`/jobs/${id}`),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<Job>("/jobs", { method: "POST", body: formData });
  },
  getResult: (id: string) => fetchText(`/jobs/${id}/result`),
  delete: (id: string) => request<{ deleted: string }>(`/jobs/${id}`, { method: "DELETE" }),
};

export const healthApi = {
  check: () => request<HealthResponse>("/health"),
};
