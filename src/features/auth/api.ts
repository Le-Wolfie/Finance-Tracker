import { apiClient } from "../../lib/api/client";
import type { AuthPayload, AuthResponse } from "../../lib/api/types";

function normalizeAuthResponse(payload: AuthResponse): {
  token: string;
  expiresAt: string;
} {
  const token = payload.token ?? payload.Token;
  const expiresAt = payload.expiresAt ?? payload.ExpiresAt;

  if (!token || !expiresAt) {
    throw new Error("Authentication response is missing required fields.");
  }

  return { token, expiresAt };
}

export async function login(
  payload: AuthPayload,
): Promise<{ token: string; expiresAt: string }> {
  const response = await apiClient.post<AuthResponse>("/auth/login", payload);
  return normalizeAuthResponse(response.data);
}

export async function register(
  payload: AuthPayload,
): Promise<{ token: string; expiresAt: string }> {
  const response = await apiClient.post<AuthResponse>(
    "/auth/register",
    payload,
  );
  return normalizeAuthResponse(response.data);
}
