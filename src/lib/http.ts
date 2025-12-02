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
  details?: Record<string, string>
): Response {
  const errorBody: ErrorResponse = {
    error,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };

  return jsonResponse(status, errorBody);
}

/**
 * HTTP Client with retry logic and timeout support
 */
export interface HttpClientOptions {
  timeout?: number; // Request timeout in milliseconds (default: 30000)
  maxRetries?: number; // Maximum number of retry attempts (default: 3)
  retryDelay?: number; // Base delay between retries in ms (default: 1000)
  retryableStatuses?: number[]; // HTTP status codes to retry (default: [408, 429, 500, 502, 503, 504])
}

export class HttpClient {
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;
  private retryableStatuses: number[];

  constructor(options: HttpClientOptions = {}) {
    this.timeout = options.timeout ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
    this.retryableStatuses = options.retryableStatuses ?? [408, 429, 500, 502, 503, 504];
  }

  /**
   * Execute a fetch request with timeout and retry logic
   */
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // If response is successful or non-retryable error, return it
        if (response.ok || !this.retryableStatuses.includes(response.status)) {
          return response;
        }

        // Store response for potential retry
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          return response;
        }

        // Wait before retrying (exponential backoff)
        await this.#sleep(this.retryDelay * Math.pow(2, attempt));
      } catch (error) {
        clearTimeout(timeoutId);

        // Handle abort/timeout
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error(`Request timeout after ${this.timeout}ms`);
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        await this.#sleep(this.retryDelay * Math.pow(2, attempt));
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError ?? new Error("Request failed after retries");
  }

  /**
   * Helper to sleep for a given duration
   */
  #sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
