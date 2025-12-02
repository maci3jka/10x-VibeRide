import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { z } from "zod";
import {
  OpenRouterService,
  OpenRouterConfigError,
  OpenRouterClientError,
  OpenRouterServerError,
  OpenRouterNetworkError,
  OpenRouterParseError,
  OpenRouterValidationError,
} from "./openRouterService";
import type { ChatParams, ChatStreamChunk } from "../../types";
import { HttpClient } from "../http";

// Mock HttpClient
vi.mock("../http", () => ({
  HttpClient: vi.fn().mockImplementation(() => ({
    fetch: vi.fn(),
  })),
}));

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

describe("OpenRouterService", () => {
  let service: OpenRouterService;
  let mockHttpClient: { fetch: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpClient = {
      fetch: vi.fn(),
    };

    service = new OpenRouterService({
      apiKey: "test-api-key",
      httpClient: mockHttpClient as unknown as HttpClient,
      logger: mockLogger,
    });
  });

  describe("constructor", () => {
    it("should throw OpenRouterConfigError when API key is missing", () => {
      expect(() => {
        new OpenRouterService({
          apiKey: "",
        });
      }).toThrow(OpenRouterConfigError);
    });

    it("should use default base URL when not provided", () => {
      const defaultService = new OpenRouterService({
        apiKey: "test-key",
        httpClient: mockHttpClient as unknown as HttpClient,
      });

      expect(defaultService).toBeDefined();
    });

    it("should use custom base URL when provided", () => {
      const customService = new OpenRouterService({
        apiKey: "test-key",
        baseUrl: "https://custom.api.com",
        httpClient: mockHttpClient as unknown as HttpClient,
      });

      expect(customService).toBeDefined();
    });
  });

  describe("getDefaultHeaders", () => {
    it("should return correct headers with API key", () => {
      const headers = service.getDefaultHeaders();

      expect(headers).toEqual({
        Authorization: "Bearer test-api-key",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://viberide.app",
        "X-Title": "VibeRide",
      });
    });
  });

  describe("chat", () => {
    it("should successfully complete a chat request", async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            model: "gpt-4",
            choices: [
              {
                message: { content: "Hello, world!" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          })
        ),
      };

      mockHttpClient.fetch.mockResolvedValue(mockResponse);

      const params: ChatParams = {
        userMessage: "Hello",
        model: "gpt-4",
      };

      const result = await service.chat(params);

      expect(result).toEqual({
        content: "Hello, world!",
        model: "gpt-4",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        finish_reason: "stop",
      });

      expect(mockHttpClient.fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
          }),
        })
      );
    });

    it("should include system message when provided", async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            model: "gpt-4",
            choices: [{ message: { content: "Response" }, finish_reason: "stop" }],
          })
        ),
      };

      mockHttpClient.fetch.mockResolvedValue(mockResponse);

      const params: ChatParams = {
        systemMessage: "You are a helpful assistant",
        userMessage: "Hello",
        model: "gpt-4",
      };

      await service.chat(params);

      const callArgs = mockHttpClient.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.messages).toHaveLength(2);
      expect(body.messages[0]).toEqual({
        role: "system",
        content: "You are a helpful assistant",
      });
      expect(body.messages[1]).toEqual({
        role: "user",
        content: "Hello",
      });
    });

    it("should include response_format when provided", async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            model: "gpt-4",
            choices: [
              {
                message: { content: '{"name":"John","age":30}' },
                finish_reason: "stop",
              },
            ],
          })
        ),
      };

      mockHttpClient.fetch.mockResolvedValue(mockResponse);

      const params: ChatParams = {
        userMessage: "Generate a person",
        model: "gpt-4",
        responseFormat: {
          name: "Person",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
            required: ["name", "age"],
          },
        },
      };

      await service.chat(params);

      const callArgs = mockHttpClient.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.response_format).toEqual({
        type: "json_schema",
        json_schema: {
          name: "Person",
          strict: true,
          schema: params.responseFormat?.schema,
        },
      });
    });

    it("should include model parameters when provided", async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            model: "gpt-4",
            choices: [{ message: { content: "Response" }, finish_reason: "stop" }],
          })
        ),
      };

      mockHttpClient.fetch.mockResolvedValue(mockResponse);

      const params: ChatParams = {
        userMessage: "Hello",
        model: "gpt-4",
        modelParams: {
          temperature: 0.7,
          max_tokens: 100,
          top_p: 0.9,
          frequency_penalty: 0.5,
          presence_penalty: 0.5,
        },
      };

      await service.chat(params);

      const callArgs = mockHttpClient.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(100);
      expect(body.top_p).toBe(0.9);
      expect(body.frequency_penalty).toBe(0.5);
      expect(body.presence_penalty).toBe(0.5);
    });

    it("should throw OpenRouterClientError on 4xx response", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue("Bad request"),
      };

      mockHttpClient.fetch.mockResolvedValue(mockResponse);

      const params: ChatParams = {
        userMessage: "Hello",
        model: "gpt-4",
      };

      await expect(service.chat(params)).rejects.toThrow(OpenRouterClientError);
    });

    it("should throw OpenRouterServerError on 5xx response", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Internal server error"),
      };

      mockHttpClient.fetch.mockResolvedValue(mockResponse);

      const params: ChatParams = {
        userMessage: "Hello",
        model: "gpt-4",
      };

      await expect(service.chat(params)).rejects.toThrow(OpenRouterServerError);
    });

    it("should handle network errors", async () => {
      mockHttpClient.fetch.mockRejectedValue(new Error("Network failure"));

      const params: ChatParams = {
        userMessage: "Hello",
        model: "gpt-4",
      };

      await expect(service.chat(params)).rejects.toThrow("Network failure");
    });
  });

  describe("chatStream", () => {
    it("should stream chat chunks", async () => {
      const chunks = [
        'data: {"model":"gpt-4","choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"!"},"finish_reason":"stop"}]}\n\n',
        "data: [DONE]\n\n",
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          chunks.forEach((chunk) => {
            controller.enqueue(encoder.encode(chunk));
          });
          controller.close();
        },
      });

      const mockResponse = {
        ok: true,
        body: stream,
      };

      mockHttpClient.fetch.mockResolvedValue(mockResponse);

      const params: ChatParams = {
        userMessage: "Hello",
        model: "gpt-4",
      };

      const result: ChatStreamChunk[] = [];
      for await (const chunk of service.chatStream(params)) {
        result.push(chunk);
        // Process chunk
      }

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe("Hello");
      expect(result[1].content).toBe(" world");
      expect(result[2].content).toBe("!");
      expect(result[2].finish_reason).toBe("stop");
    });

    it("should throw OpenRouterNetworkError when response body is null", async () => {
      const mockResponse = {
        ok: true,
        body: null,
      };

      mockHttpClient.fetch.mockResolvedValue(mockResponse);

      const params: ChatParams = {
        userMessage: "Hello",
        model: "gpt-4",
      };

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of service.chatStream(params)) {
          // Should not reach here
        }
      }).rejects.toThrow(OpenRouterNetworkError);
    });

    it("should handle stream errors gracefully", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Server error"),
      };

      mockHttpClient.fetch.mockResolvedValue(mockResponse);

      const params: ChatParams = {
        userMessage: "Hello",
        model: "gpt-4",
      };

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of service.chatStream(params)) {
          // Should not reach here
        }
      }).rejects.toThrow(OpenRouterServerError);
    });
  });

  describe("validateJson", () => {
    it("should successfully validate valid JSON against schema", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const json = '{"name":"John","age":30}';
      const result = service.validateJson(json, schema);

      expect(result).toEqual({ name: "John", age: 30 });
    });

    it("should throw OpenRouterParseError for invalid JSON", () => {
      const schema = z.object({
        name: z.string(),
      });

      const json = "{invalid json}";

      expect(() => service.validateJson(json, schema)).toThrow(OpenRouterParseError);
    });

    it("should throw OpenRouterValidationError for schema mismatch", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const json = '{"name":"John","age":"thirty"}'; // age should be number

      expect(() => service.validateJson(json, schema)).toThrow(OpenRouterValidationError);
    });

    it("should include Zod issues in validation error", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const json = '{"name":"John"}'; // missing age

      try {
        service.validateJson(json, schema);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(OpenRouterValidationError);
        expect((error as OpenRouterValidationError).issues).toBeDefined();
        expect((error as OpenRouterValidationError).issues?.length).toBeGreaterThan(0);
      }
    });
  });

  describe("error handling", () => {
    it("should log errors on chat failure", async () => {
      mockHttpClient.fetch.mockRejectedValue(new Error("Test error"));

      const params: ChatParams = {
        userMessage: "Hello",
        model: "gpt-4",
      };

      await expect(service.chat(params)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should log errors on stream failure", async () => {
      mockHttpClient.fetch.mockRejectedValue(new Error("Test error"));

      const params: ChatParams = {
        userMessage: "Hello",
        model: "gpt-4",
      };

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of service.chatStream(params)) {
          // Should not reach here
        }
      }).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
