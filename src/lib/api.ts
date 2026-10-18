import axios, { AxiosError } from "axios";
import { auth } from "@/app/firebase/config";

export const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export type ApiErrorCode = "NO_KEY" | "INVALID_KEY" | "RATE_LIMIT" | "AUTH" | "NETWORK" | "UNKNOWN";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  constructor(message: string, status = 0, code: ApiErrorCode = "UNKNOWN") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Shared axios client: attaches the Firebase ID token to every request. */
export const api = axios.create({ baseURL: BACKEND_URL, timeout: 60_000 });

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    config.headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  return config;
});

function classify(status: number, detail: string): ApiError {
  if (detail.startsWith("NO_GEMINI_KEY")) {
    return new ApiError("Add your Gemini API key in Update Profile to use AI features.", status, "NO_KEY");
  }
  if (detail.startsWith("INVALID_GEMINI_KEY")) {
    return new ApiError("Your Gemini API key was rejected. Please update it in Update Profile.", status, "INVALID_KEY");
  }
  if (status === 429) return new ApiError(detail || "Too many requests. Please wait a moment.", status, "RATE_LIMIT");
  if (status === 401) return new ApiError("Your session expired. Please sign in again.", status, "AUTH");
  return new ApiError(detail || "Something went wrong. Please try again.", status, "UNKNOWN");
}

/** Normalises any thrown value into a user-friendly ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<{ detail?: unknown }>;
    if (!e.response) {
      return new ApiError(
        e.code === "ECONNABORTED" ? "The request timed out. Please retry." : "Can't reach the server. Check your connection.",
        0,
        "NETWORK"
      );
    }
    const detail = typeof e.response.data?.detail === "string" ? e.response.data.detail : "";
    return classify(e.response.status, detail);
  }
  return new ApiError(err instanceof Error ? err.message : "Something went wrong.", 0, "UNKNOWN");
}

export const userTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

/** Local calendar date as YYYY-MM-DD (not UTC), used for workout logs. */
export const localDate = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Authenticated fetch (for streaming, where axios in the browser can't read the body incrementally). */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new ApiError("You need to sign in.", 401, "AUTH");
  const token = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers || {}), Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("Can't reach the server. Check your connection.", 0, "NETWORK");
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.detail ?? "";
    } catch {
      /* non-JSON error body */
    }
    throw classify(res.status, typeof detail === "string" ? detail : "");
  }
  return res;
}
