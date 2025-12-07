import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./health";
import type { APIContext } from "astro";
import type { SupabaseClient } from "../../db/supabase.client";

// Mock the health service
vi.mock("../../lib/services/healthService", () => ({
  check: vi.fn(),
}));

// Mock logger
vi.mock("../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import mocked check function
import { check } from "../../lib/services/healthService";

describe("GET /api/health", () => {
  let mockContext: APIContext;
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {} as SupabaseClient;

    // Create mock Astro context
    mockContext = {
      locals: {
        supabase: mockSupabase,
      },
    } as unknown as APIContext;
  });

  it("should return 200 with healthy status when all subsystems are operational", async () => {
    // Mock successful health check
    const mockHealthResponse = {
      status: "healthy" as const,
      database: "connected" as const,
      auth: "operational" as const,
      timestamp: new Date().toISOString(),
    };
    vi.mocked(check).mockResolvedValue(mockHealthResponse);

    const response = await GET(mockContext);

    expect(response.status).toBe(200);
    expect(check).toHaveBeenCalledWith(mockSupabase);

    const body = await response.json();
    expect(body).toEqual(mockHealthResponse);
    expect(body.status).toBe("healthy");
    expect(body.database).toBe("connected");
    expect(body.auth).toBe("operational");
  });

  it("should return 200 with degraded status when database fails", async () => {
    // Mock degraded health check
    const mockHealthResponse = {
      status: "degraded" as const,
      database: "error" as const,
      auth: "operational" as const,
      timestamp: new Date().toISOString(),
    };
    vi.mocked(check).mockResolvedValue(mockHealthResponse);

    const response = await GET(mockContext);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("degraded");
    expect(body.database).toBe("error");
  });

  it("should return 200 with degraded status when auth fails", async () => {
    // Mock degraded health check
    const mockHealthResponse = {
      status: "degraded" as const,
      database: "connected" as const,
      auth: "down" as const,
      timestamp: new Date().toISOString(),
    };
    vi.mocked(check).mockResolvedValue(mockHealthResponse);

    const response = await GET(mockContext);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("degraded");
    expect(body.auth).toBe("down");
  });

  it("should return 200 with unhealthy status when both subsystems fail", async () => {
    // Mock unhealthy health check
    const mockHealthResponse = {
      status: "unhealthy" as const,
      database: "error" as const,
      auth: "down" as const,
      timestamp: new Date().toISOString(),
    };
    vi.mocked(check).mockResolvedValue(mockHealthResponse);

    const response = await GET(mockContext);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("unhealthy");
  });

  it("should return 500 when health check throws an exception", async () => {
    // Mock health check throwing an error
    vi.mocked(check).mockRejectedValue(new Error("Catastrophic failure"));

    const response = await GET(mockContext);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("server_error");
    expect(body.message).toBe("Health check failed");
  });

  it("should include timestamp in response", async () => {
    const timestamp = "2025-01-16T15:30:00.000Z";
    const mockHealthResponse = {
      status: "healthy" as const,
      database: "connected" as const,
      auth: "operational" as const,
      timestamp,
    };
    vi.mocked(check).mockResolvedValue(mockHealthResponse);

    const response = await GET(mockContext);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.timestamp).toBe(timestamp);
  });
});
