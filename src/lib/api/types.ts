export type ApiError = {
  code?: string;
  title?: string;
  status?: number;
  detail?: string;
  traceId?: string;
};

export type AuthPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  token?: string;
  Token?: string;
  expiresAt?: string;
  ExpiresAt?: string;
};
