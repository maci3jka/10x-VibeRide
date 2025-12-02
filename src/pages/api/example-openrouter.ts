/**
 * Example API endpoint demonstrating OpenRouter service integration
 *
 * This shows how to use the OpenRouterService in an Astro API route
 * to generate AI-powered responses.
 *
 * DELETE THIS FILE - it's just an example for reference.
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { OpenRouterService } from "@/lib/services/openRouterService";
import { errorResponse, jsonResponse } from "@/lib/http";

export const prerender = false;

// Request validation schema
const requestSchema = z.object({
  message: z.string().min(1).max(1000),
  systemMessage: z.string().optional(),
  stream: z.boolean().optional().default(false),
});

/**
 * POST /api/example-openrouter
 *
 * Example endpoint that uses OpenRouter to generate responses
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(400, "VALIDATION_ERROR", "Invalid request body", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { message, systemMessage, stream } = validation.data;

    // Initialize OpenRouter service
    const service = new OpenRouterService({
      apiKey: import.meta.env.OPENROUTER_API_KEY,
    });

    // Handle streaming response
    if (stream) {
      // Create a readable stream for SSE
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of service.chatStream({
              systemMessage,
              userMessage: message,
              model: "openai/gpt-4o-mini",
              modelParams: {
                temperature: 0.7,
              },
            })) {
              // Send SSE formatted chunk
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }

            // Send done message
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            const errorData = `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Handle non-streaming response
    const response = await service.chat({
      systemMessage,
      userMessage: message,
      model: "openai/gpt-4o-mini",
      modelParams: {
        temperature: 0.7,
        max_tokens: 500,
      },
    });

    return jsonResponse(200, {
      content: response.content,
      model: response.model,
      usage: response.usage,
    });
  } catch (error) {
    console.error("OpenRouter API error:", error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, "VALIDATION_ERROR", "Invalid request", {
        errors: error.flatten().fieldErrors,
      });
    }

    return errorResponse(500, "INTERNAL_ERROR", "Failed to generate response");
  }
};

/**
 * Example of structured JSON response generation
 */
export const generateStructuredResponse = async (noteText: string) => {
  const service = new OpenRouterService({
    apiKey: import.meta.env.OPENROUTER_API_KEY,
  });

  // Define the schema for the AI response
  const summarySchema = {
    type: "object",
    properties: {
      highlights: {
        type: "array",
        items: { type: "string" },
        description: "Key highlights from the trip note",
      },
      estimated_duration: {
        type: "number",
        description: "Estimated trip duration in hours",
      },
      estimated_distance: {
        type: "number",
        description: "Estimated trip distance in kilometers",
      },
    },
    required: ["highlights", "estimated_duration", "estimated_distance"],
    additionalProperties: false,
  } as const;

  const response = await service.chat({
    systemMessage: "You are a motorcycle trip planning assistant. Analyze trip notes and provide structured summaries.",
    userMessage: `Analyze this trip note and provide a summary:\n\n${noteText}`,
    responseFormat: {
      name: "TripSummary",
      strict: true,
      schema: summarySchema,
    },
    model: "openai/gpt-4o",
    modelParams: {
      temperature: 0.3,
    },
  });

  // Validate the response with Zod
  const zodSchema = z.object({
    highlights: z.array(z.string()),
    estimated_duration: z.number(),
    estimated_distance: z.number(),
  });

  return service.validateJson(response.content, zodSchema);
};
