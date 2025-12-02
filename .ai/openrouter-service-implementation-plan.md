# OpenRouter Service – Implementation Guide

## 1. Service Description

`OpenRouterService` is a TypeScript class living in `src/lib/services/openRouterService.ts`. It wraps all communication with the OpenRouter API, providing a clean, typed interface for LLM chat completion requests and streaming responses. The service abstracts request construction (system/user messages, JSON-schema `response_format`, model selection, parameters) and centralises authentication, error handling, and logging.

Key responsibilities:

1. Build well-formed OpenRouter chat/completions requests.
2. Support both blocking and streaming response modes.
3. Validate and parse JSON-schema responses when `response_format` is used.
4. Expose ergonomic public methods for common call patterns.
5. Surface rich, typed errors to callers and log internally.

---

## 2. Constructor Description

```ts
constructor(options: {
  apiKey: string;                  // Secret OpenRouter key
  baseUrl?: string;                // Override for tests – defaults to "https://openrouter.ai/api/v1/chat/completions"
  httpClient?: HttpClient;         // Optional injection (e.g. for tests); defaults to fetch-based client
  logger?: Logger;                 // Optional – defaults to `lib/logger`
})
```

• Stores options in private fields.  
• Asserts `apiKey` presence.  
• Instantiates default `HttpClient` + `Logger` when not provided.

---

## 3. Public Methods & Fields

| Method | Signature | Purpose |
| --- | --- | --- |
| `chat` | `(params: ChatParams) => Promise<ChatResponse>` | Single, non-streamed completion. |
| `chatStream` | `(params: ChatParams) => AsyncIterable<ChatStreamChunk>` | Streaming completions via async iterator. |
| `validateJson` | `<T>(raw: string, schema: ZodSchema<T>) => T` | Helper to safely parse/validate JSON strings when `response_format` is used. |
| `getDefaultHeaders` | `() => Record<string,string>` | Returns auth & content headers. |

`ChatParams` shape (exported in `src/types.ts`):
```ts
export interface ChatParams {
  systemMessage?: string;
  userMessage: string;
  responseFormat?: JsonSchemaFormat;  // Optional JSON-schema enforcement
  model: string;                      // e.g. "openrouter/my-model-name"
  modelParams?: Partial<{
    temperature: number;
    max_tokens: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
  }>;
  stream?: boolean;                   // true => streamed response
}
```

`JsonSchemaFormat`:
```ts
export interface JsonSchemaFormat {
  name: string;          // human-readable name
  strict: boolean;       // true recommended
  schema: Record<string, unknown>; // JSON-Schema object
}
```

---

## 4. Private Methods & Fields

| Member | Type | Responsibility |
| ------ | ---- | -------------- |
| `#apiKey` | `string` | Secret key for `Authorization: Bearer` header |
| `#baseUrl` | `string` | Endpoint base |
| `#client` | `HttpClient` | Thin wrapper around `fetch` w/ timeout + retries |
| `#logger` | `Logger` | Centralised structured logger |
| `#buildRequestBody` | `(p: ChatParams) => OpenRouterPayload` | Compose body per API spec |
| `#handleResponse` | `(res: Response) => Promise<string>` | Throw on non-200, parse body |
| `#transformStream` | `(reader: ReadableStreamDefaultReader) => AsyncIterable<ChatStreamChunk>` | Convert SSE/ndjson → chunks |

---

## 5. Error Handling

| # | Scenario | Behaviour |
| - | -------- | --------- |
| 1 | Missing API key | Throw `OpenRouterConfigError` during construction. |
| 2 | Network failure / timeout | Retry (exponential back-off, max 3) then throw `OpenRouterNetworkError`. |
| 3 | 4xx response | Map to `OpenRouterClientError` (include status & body). |
| 4 | 5xx response | Retry (idempotent) else throw `OpenRouterServerError`. |
| 5 | Invalid JSON in response | Throw `OpenRouterParseError`. |
| 6 | `response_format` JSON doesn’t match schema | Throw `OpenRouterValidationError` (includes Zod issues). |
| 7 | Stream aborted mid-transfer | Emit `error` event on iterator and close. |

Each error extends a common `OpenRouterBaseError` with `name`, `message`, optional `cause`, and `meta`.

---

## 6. Security Considerations

1. Never log raw prompts or completions at info level – use masked logs or explicit debug flag.
2. Store `apiKey` in environment variable (`OPENROUTER_API_KEY`).
3. Enforce HTTPS and certificate validation (fetch default).
4. Respect Supabase RLS when persisting chat history (if implemented later).
5. Rate-limit outgoing requests to avoid accidental DoS.

---

## 7. Step-by-Step Implementation Plan

1. **Scaffold files**  
   • `src/types.ts` – add `ChatParams`, `JsonSchemaFormat`, `ChatResponse`, `ChatStreamChunk`.  
   • `src/lib/services/openRouterService.ts` – create class skeleton.  

2. **Add dependency wrappers**  
   • Reuse existing `lib/http.ts` for `HttpClient`; extend with retry + abort controller.  
   • Reuse `lib/logger.ts` for structured logging.

3. **Implement constructor**  
   • Validate options.  
   • Bind private fields.  
   • Derive default headers.

4. **Implement `#buildRequestBody()`**  
   • Compose `messages` array:  
     ```json
     [
       { "role": "system", "content": "..." },
       { "role": "user", "content": "..." }
     ]
     ```  
   • Inject `response_format` when provided:  
     ```json
     {
       "type": "json_schema",
       "json_schema": { "name": "BikeRoute", "strict": true, "schema": { /* … */ } }
     }
     ```  
   • Merge `modelParams` defaults.

5. **Implement `chat()`**  
   • `stream=false` → POST → await ⇒ parse text.  
   • If `responseFormat` present → `validateJson()`.  
   • Return typed `ChatResponse`.

6. **Implement `chatStream()`**  
   • `stream=true` → POST → handle `text/event-stream` or ndJSON.  
   • Pipe to `#transformStream()` returning `AsyncIterable`.

7. **Implement error classes & `#handleResponse()`**  
   • Centralised response status mapping.  
   • Retries for 5xx + network.

8. **Add unit tests** (`vitest`)  
   • Mock fetch success, 4xx, 5xx, network failure.  
   • Validate JSON schema enforcement (use `zod`).  

9. **Add documentation**  
   • JSDoc for each public method.  
   • Update README with usage snippet.

10. **Integrate with Astro pages**  
    • Inject service via dependency-injection context or import in API routes.  
    • Store key in `.env` and access via `import.meta.env.OPENROUTER_API_KEY`.

11. **Lint & format**  
    • Run `pnpm lint:fix` and `pnpm format`.
---

### Example Usage

```ts
import { OpenRouterService } from "@/lib/services/openRouterService";
import type { z } from "zod";

const routeSchema = {
  type: "object",
  properties: {
    start: { type: "string" },
    end: { type: "string" },
    distance_km: { type: "number" }
  },
  required: ["start", "end", "distance_km"]
} as const;

await new OpenRouterService({ apiKey: import.meta.env.OPENROUTER_API_KEY })
  .chat({
    systemMessage: "You are a helpful motorcycle route planner.",
    userMessage: "Plan a scenic 200 km loop starting and ending in Zurich.",
    responseFormat: {
      name: "BikeRoute",
      strict: true,
      schema: routeSchema
    },
    model: "openrouter/gpt-4o",
    modelParams: { temperature: 0.2 }
  });
```
