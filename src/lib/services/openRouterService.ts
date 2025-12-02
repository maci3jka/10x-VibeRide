import { z, type ZodSchema } from "zod";
import type { ChatParams, ChatResponse, ChatStreamChunk, OpenRouterPayload } from "../../types";
import { HttpClient } from "../http";
import { logger } from "../logger";

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base error class for all OpenRouter errors
 */
export class OpenRouterBaseError extends Error {
  constructor(
    message: string,
    public readonly meta?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Configuration error (e.g., missing API key)
 */
export class OpenRouterConfigError extends OpenRouterBaseError {}

/**
 * Network error (e.g., timeout, connection failure)
 */
export class OpenRouterNetworkError extends OpenRouterBaseError {}

/**
 * Client error (4xx responses)
 */
export class OpenRouterClientError extends OpenRouterBaseError {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
    meta?: Record<string, unknown>
  ) {
    super(message, meta);
  }
}

/**
 * Server error (5xx responses)
 */
export class OpenRouterServerError extends OpenRouterBaseError {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
    meta?: Record<string, unknown>
  ) {
    super(message, meta);
  }
}

/**
 * JSON parsing error
 */
export class OpenRouterParseError extends OpenRouterBaseError {}

/**
 * JSON schema validation error
 */
export class OpenRouterValidationError extends OpenRouterBaseError {
  constructor(
    message: string,
    public readonly issues?: z.ZodIssue[],
    meta?: Record<string, unknown>
  ) {
    super(message, meta);
  }
}

// ============================================================================
// SERVICE OPTIONS
// ============================================================================

export interface OpenRouterServiceOptions {
  apiKey: string;
  baseUrl?: string;
  httpClient?: HttpClient;
  logger?: typeof logger;
}

// ============================================================================
// OPENROUTER SERVICE
// ============================================================================

/**
 * OpenRouter Service
 * Wraps all communication with the OpenRouter API for LLM chat completions
 */
export class OpenRouterService {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #client: HttpClient;
  readonly #logger: typeof logger;

  constructor(options: OpenRouterServiceOptions) {
    // Validate required options
    if (!options.apiKey) {
      throw new OpenRouterConfigError("API key is required");
    }

    // Initialize private fields
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl ?? "https://openrouter.ai/api/v1/chat/completions";
    this.#client = options.httpClient ?? new HttpClient();
    this.#logger = options.logger ?? logger;

    this.#logger.info({ service: "OpenRouterService" }, "Service initialized");
  }

  /**
   * Get default headers for OpenRouter API requests
   */
  getDefaultHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.#apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://viberide.app", // Optional but recommended
      "X-Title": "VibeRide", // Optional but recommended
    };
  }

  /**
   * Single, non-streamed chat completion
   */
  async chat(params: ChatParams): Promise<ChatResponse> {
    this.#logger.debug(
      {
        model: params.model,
        hasSystemMessage: !!params.systemMessage,
        hasResponseFormat: !!params.responseFormat,
        stream: false,
      },
      "Initiating chat completion"
    );

    try {
      // Build request body
      const body = this.#buildRequestBody({ ...params, stream: false });

      // Execute request
      const response = await this.#client.fetch(this.#baseUrl, {
        method: "POST",
        headers: this.getDefaultHeaders(),
        body: JSON.stringify(body),
      });

      // Handle response
      const responseText = await this.#handleResponse(response);

      // Parse response
      const data = JSON.parse(responseText);

      // Extract content from OpenRouter response format
      const content = data.choices?.[0]?.message?.content ?? "";

      // If response_format is specified, validate the JSON
      let validatedContent = content;
      if (params.responseFormat) {
        // Content should be valid JSON matching the schema
        validatedContent = content;
      }

      const chatResponse: ChatResponse = {
        content: validatedContent,
        model: data.model ?? params.model,
        usage: data.usage,
        finish_reason: data.choices?.[0]?.finish_reason,
      };

      this.#logger.debug(
        {
          model: chatResponse.model,
          contentLength: chatResponse.content.length,
          finishReason: chatResponse.finish_reason,
          usage: chatResponse.usage,
        },
        "Chat completion successful"
      );

      return chatResponse;
    } catch (error) {
      this.#logger.error(
        {
          err: error,
          model: params.model,
        },
        "Chat completion failed"
      );
      throw error;
    }
  }

  /**
   * Streaming chat completion
   * Returns an async iterator of chat chunks
   */
  async *chatStream(params: ChatParams): AsyncIterable<ChatStreamChunk> {
    this.#logger.debug(
      {
        model: params.model,
        hasSystemMessage: !!params.systemMessage,
        hasResponseFormat: !!params.responseFormat,
        stream: true,
      },
      "Initiating streaming chat completion"
    );

    try {
      // Build request body with streaming enabled
      const body = this.#buildRequestBody({ ...params, stream: true });

      // Execute request
      const response = await this.#client.fetch(this.#baseUrl, {
        method: "POST",
        headers: this.getDefaultHeaders(),
        body: JSON.stringify(body),
      });

      // Check for errors
      if (!response.ok) {
        const errorText = await response.text();
        throw this.#createErrorFromResponse(response.status, errorText);
      }

      // Get reader from response body
      if (!response.body) {
        throw new OpenRouterNetworkError("Response body is null");
      }

      const reader = response.body.getReader();

      // Transform stream and yield chunks
      yield* this.#transformStream(reader);

      this.#logger.debug({ model: params.model }, "Streaming chat completion finished");
    } catch (error) {
      this.#logger.error(
        {
          err: error,
          model: params.model,
        },
        "Streaming chat completion failed"
      );
      throw error;
    }
  }

  /**
   * Validate and parse JSON string against a Zod schema
   */
  validateJson<T>(raw: string, schema: ZodSchema<T>): T {
    try {
      const parsed = JSON.parse(raw);
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new OpenRouterValidationError("Response JSON does not match expected schema", error.issues, { raw });
      }
      if (error instanceof SyntaxError) {
        throw new OpenRouterParseError("Invalid JSON in response", { raw }, error);
      }
      throw error;
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Build OpenRouter API request body from chat parameters
   */
  #buildRequestBody(params: ChatParams): OpenRouterPayload {
    const messages: OpenRouterPayload["messages"] = [];

    // Add system message if provided
    if (params.systemMessage) {
      messages.push({
        role: "system",
        content: params.systemMessage,
      });
    }

    // Add user message
    messages.push({
      role: "user",
      content: params.userMessage,
    });

    // Build base payload
    const payload: OpenRouterPayload = {
      model: params.model,
      messages,
      stream: params.stream,
    };

    // Add response_format if specified
    if (params.responseFormat) {
      payload.response_format = {
        type: "json_schema",
        json_schema: {
          name: params.responseFormat.name,
          strict: params.responseFormat.strict,
          schema: params.responseFormat.schema,
        },
      };
    }

    // Add model parameters if specified
    if (params.modelParams) {
      if (params.modelParams.temperature !== undefined) {
        payload.temperature = params.modelParams.temperature;
      }
      if (params.modelParams.max_tokens !== undefined) {
        payload.max_tokens = params.modelParams.max_tokens;
      }
      if (params.modelParams.top_p !== undefined) {
        payload.top_p = params.modelParams.top_p;
      }
      if (params.modelParams.frequency_penalty !== undefined) {
        payload.frequency_penalty = params.modelParams.frequency_penalty;
      }
      if (params.modelParams.presence_penalty !== undefined) {
        payload.presence_penalty = params.modelParams.presence_penalty;
      }
    }

    return payload;
  }

  /**
   * Handle HTTP response, throwing appropriate errors for non-200 status
   */
  async #handleResponse(response: Response): Promise<string> {
    if (!response.ok) {
      const body = await response.text();
      throw this.#createErrorFromResponse(response.status, body);
    }

    return response.text();
  }

  /**
   * Create appropriate error from HTTP response status and body
   */
  #createErrorFromResponse(status: number, body: string): OpenRouterBaseError {
    if (status >= 400 && status < 500) {
      return new OpenRouterClientError(`Client error: ${status}`, status, body);
    }
    if (status >= 500) {
      return new OpenRouterServerError(`Server error: ${status}`, status, body);
    }
    return new OpenRouterBaseError(`Unexpected status: ${status}`, { status, body });
  }

  /**
   * Transform SSE/NDJSON stream into async iterable of chat chunks
   */
  async *#transformStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncIterable<ChatStreamChunk> {
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();

          // Skip empty lines and comments
          if (!trimmed || trimmed.startsWith(":")) {
            continue;
          }

          // Parse SSE format: "data: {...}"
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);

            // OpenRouter sends "[DONE]" as final message
            if (data === "[DONE]") {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              if (delta?.content) {
                const chunk: ChatStreamChunk = {
                  content: delta.content,
                  finish_reason: parsed.choices?.[0]?.finish_reason,
                  model: parsed.model,
                };
                yield chunk;
              }
            } catch (error) {
              this.#logger.warn({ err: error, data }, "Failed to parse stream chunk");
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
