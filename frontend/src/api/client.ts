import { Job, ApiError } from "../types/job";

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
  getResult: (id: string, final = false) => fetchText(`/jobs/${id}/result${final ? '?final=1' : ''}`),
  delete: (id: string) => request<{ deleted: string }>(`/jobs/${id}`, { method: "DELETE" }),
};

export const healthApi = {
  check: () => request("/health"),
  checkAll: () => request("/health/all"),
};

export const backendApi = {
  get: () => request<{ backend: string; ollama_url: string; mlx_url: string; mlx_model: string; markitdown_path: string }>("/backend"),
  switch: (backend: string) =>
    request<{ backend: string; status: string; model: string }>("/backend", {
      method: "POST",
      body: JSON.stringify({ backend }),
    }),
  checkCustom: (url: string) => request<{ url: string; reachable: boolean; ollama: { available: boolean; model_loaded: boolean }; mlx: { available: boolean; model_loaded: boolean } }>(
    "/backend/check",
    {
      method: "POST",
      body: JSON.stringify({ url }),
    }
  ),
  setUrl: (backend: string, url: string) =>
    request<{ backend: string; url: string }>("/backend/url", {
      method: "POST",
      body: JSON.stringify({ backend, url }),
    }),
};
