export type ApiPageMeta = {
  limit: number;
  next_cursor: string | null;
  current_cursor?: string | null;
  total_count?: number | null;
};

export type ApiPagePayload<T> = {
  data: T;
  page: ApiPageMeta;
};

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
    details?: Record<string, unknown>;
  };
  request_id?: string;
};

export type ApiRawResponse = {
  response: Response;
  payload: unknown;
};

