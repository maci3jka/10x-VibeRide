import type { APIRoute } from "astro";
import { check } from "../../lib/services/healthService";
import { jsonResponse, errorResponse } from "../../lib/http";
import { logger } from "../../lib/logger";

/**
 * GET /api/health
 * Health check endpoint for uptime monitoring
 *
 * @public No authentication required
 * @returns 200 HealthCheckResponse | 500 ErrorResponse
 *
 * This endpoint verifies connectivity to core subsystems:
 * - PostgreSQL database (via Supabase)
 * - Supabase Auth service
 *
 * Returns 200 OK even when subsystems are degraded to allow monitoring
 * tools to distinguish between API layer failures and subsystem failures.
 * Only returns 500 if the health check itself fails catastrophically.
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Perform health check using service
    const healthStatus = await check(locals.supabase);

    // Always return 200 with health status
    // This allows monitoring tools to parse the response and determine
    // which specific subsystems are failing
    return jsonResponse(200, healthStatus);
  } catch (err) {
    // Catastrophic failure - unable to construct health check response
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, errorMessage: errorMsg }, "Health check endpoint failed");

    return errorResponse(500, "server_error", "Health check failed");
  }
};

export const prerender = false;
