/**
 * AppexQuant Markets Global - API Response & Error Contracts
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  requestId: string; // Correlation ID (e.g., APX-8F29K)
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function createCorrelationId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'APX-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createSuccessResponse<T>(data: T, requestId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    requestId: requestId || createCorrelationId(),
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(message: string, code = 'INTERNAL_ERROR', details?: Record<string, unknown>, requestId?: string): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    requestId: requestId || createCorrelationId(),
    timestamp: new Date().toISOString(),
  };
}
