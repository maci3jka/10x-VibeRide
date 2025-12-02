/**
 * OpenRouter Service Usage Examples
 *
 * This file demonstrates various ways to use the OpenRouterService
 * for LLM chat completions with the OpenRouter API.
 */

import { z } from "zod";
import { OpenRouterService } from "./openRouterService";

// ============================================================================
// EXAMPLE 1: Simple Chat Completion
// ============================================================================

async function simpleChat() {
  const service = new OpenRouterService({
    apiKey: import.meta.env.OPENROUTER_API_KEY,
  });

  const response = await service.chat({
    userMessage: "What is the capital of France?",
    model: "openai/gpt-4o",
    modelParams: {
      temperature: 0.7,
    },
  });

  console.log(response.content);
  // Output: "The capital of France is Paris."
}

// ============================================================================
// EXAMPLE 2: Chat with System Message
// ============================================================================

async function chatWithSystemMessage() {
  const service = new OpenRouterService({
    apiKey: import.meta.env.OPENROUTER_API_KEY,
  });

  const response = await service.chat({
    systemMessage: "You are a helpful motorcycle route planning assistant.",
    userMessage: "Suggest a scenic 200km route starting from Zurich.",
    model: "openai/gpt-4o",
    modelParams: {
      temperature: 0.8,
      max_tokens: 500,
    },
  });

  console.log(response.content);
}

// ============================================================================
// EXAMPLE 3: Structured JSON Response with Schema
// ============================================================================

async function structuredResponse() {
  const service = new OpenRouterService({
    apiKey: import.meta.env.OPENROUTER_API_KEY,
  });

  // Define the expected response schema
  const routeSchema = {
    type: "object",
    properties: {
      start: { type: "string" },
      end: { type: "string" },
      distance_km: { type: "number" },
      duration_h: { type: "number" },
      highlights: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["start", "end", "distance_km", "duration_h", "highlights"],
    additionalProperties: false,
  } as const;

  const response = await service.chat({
    systemMessage: "You are a motorcycle route planner. Always respond with valid JSON.",
    userMessage: "Plan a scenic 200 km loop starting and ending in Zurich.",
    responseFormat: {
      name: "BikeRoute",
      strict: true,
      schema: routeSchema,
    },
    model: "openai/gpt-4o",
    modelParams: {
      temperature: 0.2,
    },
  });

  // Parse and validate the JSON response
  const zodSchema = z.object({
    start: z.string(),
    end: z.string(),
    distance_km: z.number(),
    duration_h: z.number(),
    highlights: z.array(z.string()),
  });

  const route = service.validateJson(response.content, zodSchema);
  console.log(route);
  // Output: { start: "Zurich", end: "Zurich", distance_km: 200, ... }
}

// ============================================================================
// EXAMPLE 4: Streaming Chat Completion
// ============================================================================

async function streamingChat() {
  const service = new OpenRouterService({
    apiKey: import.meta.env.OPENROUTER_API_KEY,
  });

  console.log("Streaming response:");

  for await (const chunk of service.chatStream({
    systemMessage: "You are a helpful assistant.",
    userMessage: "Write a short poem about motorcycles.",
    model: "openai/gpt-4o",
    modelParams: {
      temperature: 0.9,
    },
  })) {
    // Print each chunk as it arrives
    process.stdout.write(chunk.content);

    // Check if this is the final chunk
    if (chunk.finish_reason) {
      console.log(`\n\nFinished: ${chunk.finish_reason}`);
    }
  }
}

// ============================================================================
// EXAMPLE 5: Error Handling
// ============================================================================

async function errorHandling() {
  const service = new OpenRouterService({
    apiKey: import.meta.env.OPENROUTER_API_KEY,
  });

  try {
    const response = await service.chat({
      userMessage: "Hello",
      model: "invalid-model",
    });
    console.log(response.content);
  } catch (error) {
    if (error instanceof OpenRouterClientError) {
      console.error(`Client error (${error.status}):`, error.message);
      console.error("Response body:", error.body);
    } else if (error instanceof OpenRouterServerError) {
      console.error(`Server error (${error.status}):`, error.message);
      // Implement retry logic here
    } else if (error instanceof OpenRouterNetworkError) {
      console.error("Network error:", error.message);
      // Check internet connection
    } else {
      console.error("Unexpected error:", error);
    }
  }
}

// ============================================================================
// EXAMPLE 6: Itinerary Generation (VibeRide Use Case)
// ============================================================================

async function generateItinerary() {
  const service = new OpenRouterService({
    apiKey: import.meta.env.OPENROUTER_API_KEY,
  });

  // User's trip note
  const noteText = `
    Weekend trip from Zurich to the Alps.
    Want to see mountain passes and scenic lakes.
    Prefer twisty roads over highways.
    2 days, around 400km total.
  `;

  // User preferences
  const preferences = {
    terrain: "paved",
    road_type: "twisty",
    typical_duration_h: 6,
    typical_distance_km: 200,
  };

  // Define itinerary schema
  const itinerarySchema = {
    type: "object",
    properties: {
      title: { type: "string" },
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: { type: "number" },
            segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  distance_km: { type: "number" },
                  duration_h: { type: "number" },
                },
                required: ["name", "description", "distance_km", "duration_h"],
              },
            },
          },
          required: ["day", "segments"],
        },
      },
      total_distance_km: { type: "number" },
      total_duration_h: { type: "number" },
      highlights: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["title", "days", "total_distance_km", "total_duration_h", "highlights"],
  } as const;

  const response = await service.chat({
    systemMessage: `You are a motorcycle route planning expert. Generate detailed itineraries based on user notes and preferences.
    
User preferences:
- Terrain: ${preferences.terrain}
- Road type: ${preferences.road_type}
- Typical duration: ${preferences.typical_duration_h} hours
- Typical distance: ${preferences.typical_distance_km} km`,
    userMessage: `Generate a detailed motorcycle itinerary based on this note:\n\n${noteText}`,
    responseFormat: {
      name: "MotorcycleItinerary",
      strict: true,
      schema: itinerarySchema,
    },
    model: "openai/gpt-4o",
    modelParams: {
      temperature: 0.3,
      max_tokens: 2000,
    },
  });

  // Validate and parse the response
  const zodSchema = z.object({
    title: z.string(),
    days: z.array(
      z.object({
        day: z.number(),
        segments: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            distance_km: z.number(),
            duration_h: z.number(),
          })
        ),
      })
    ),
    total_distance_km: z.number(),
    total_duration_h: z.number(),
    highlights: z.array(z.string()),
  });

  const itinerary = service.validateJson(response.content, zodSchema);
  console.log("Generated itinerary:", JSON.stringify(itinerary, null, 2));

  return itinerary;
}

// ============================================================================
// EXAMPLE 7: Custom HTTP Client Configuration
// ============================================================================

async function customHttpClient() {
  const { HttpClient } = await import("../http");

  // Create HTTP client with custom timeout and retry settings
  const httpClient = new HttpClient({
    timeout: 60000, // 60 seconds
    maxRetries: 5,
    retryDelay: 2000, // 2 seconds base delay
  });

  const service = new OpenRouterService({
    apiKey: import.meta.env.OPENROUTER_API_KEY,
    httpClient,
  });

  const response = await service.chat({
    userMessage: "Generate a very long response...",
    model: "openai/gpt-4o",
    modelParams: {
      max_tokens: 4000,
    },
  });

  console.log(response.content);
}

// Export examples for testing/documentation
export {
  simpleChat,
  chatWithSystemMessage,
  structuredResponse,
  streamingChat,
  errorHandling,
  generateItinerary,
  customHttpClient,
};
