import type { ErrorResponse } from "../types";

/**
 * Creates a standardized JSON response
 * @param status HTTP status code
 * @param data Response data
 */
export function jsonResponse<T>(status: number, data: T): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Creates a standardized error response
 * @param status HTTP status code
 * @param error Short error code
 * @param message Human-readable error message
 * @param details Optional field-specific error details
 */
export function errorResponse(
  status: number,
  error: string,
  message: string,
  details?: Record<string, string[] | string>
): Response {
  const errorBody: ErrorResponse = {
    error,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };

  return jsonResponse(status, errorBody);
}

