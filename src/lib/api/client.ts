import axios, { AxiosError } from "axios";
import {
  clearAuthSession,
  getStoredExpiry,
  getStoredToken,
  isSessionExpired,
} from "../auth/tokenStorage";
import type { ApiError } from "./types";

const defaultBaseUrl = "http://localhost:5104";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  const expiry = getStoredExpiry();

  if (token && !isSessionExpired(expiry)) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      clearAuthSession();
    }

    return Promise.reject(error);
  },
);

export function toApiError(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    if (!error.response) {
      return `Cannot connect to API at ${apiClient.defaults.baseURL}. Ensure FinancialTracker.API is running.`;
    }

    return (
      error.response?.data?.detail ||
      error.response?.data?.title ||
      error.message
    );
  }

  return "Unexpected error. Please try again.";
}
