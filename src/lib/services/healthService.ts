import type { SupabaseClient } from "../../db/supabase.client";
import type { HealthCheckResponse } from "../../types";
import { logger } from "../logger";

/**
 * Service for health check operations
 * Verifies connectivity to core subsystems (Database and Auth)
 */

/**
 * Timeout for individual subsystem health checks (milliseconds)
 */
const HEALTH_CHECK_TIMEOUT = 50;

/**
 * Ping database connectivity
 * Uses a lightweight head-only query to minimize latency
 * @param supabase Supabase client instance
 * @returns Promise resolving to connection status
 */
async function pingDatabase(supabase: SupabaseClient): Promise<"connected" | "disconnected" | "error"> {
  let timeoutId: NodeJS.Timeout | undefined;
  let isResolved = false;

  try {
    // Create a timeout promise that respects resolution state
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          reject(new Error("Database ping timeout"));
        }
      }, HEALTH_CHECK_TIMEOUT);
    });

    // Perform lightweight head-only query to check DB connectivity
    const queryPromise = supabase.from("notes").select("note_id", { head: true, count: "exact" }).limit(1);

    // Race between query and timeout
    const { error } = await Promise.race([queryPromise, timeoutPromise]);

    // Mark as resolved and clear timeout
    isResolved = true;
    if (timeoutId) clearTimeout(timeoutId);

    if (error) {
      logger.error({ err: error }, "Database health check failed");
      return "error";
    }

    return "connected";
  } catch (err) {
    // Ensure timeout is cleared even on exception
    isResolved = true;
    if (timeoutId) clearTimeout(timeoutId);

    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, errorMessage: errorMsg }, "Database health check exception");

    // Distinguish between timeout and other errors
    if (errorMsg.includes("timeout")) {
      return "disconnected";
    }
    return "error";
  }
}

/**
 * Ping auth service connectivity
 * Uses admin API to verify auth subsystem is operational
 * @param supabase Supabase client instance (must have service_role access)
 * @returns Promise resolving to auth status
 */
async function pingAuth(supabase: SupabaseClient): Promise<"operational" | "degraded" | "down"> {
  let timeoutId: NodeJS.Timeout | undefined;
  let isResolved = false;

  try {
    // Create a timeout promise that respects resolution state
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          reject(new Error("Auth ping timeout"));
        }
      }, HEALTH_CHECK_TIMEOUT);
    });

    // Perform lightweight auth check - list users with minimal results
    const queryPromise = supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Race between query and timeout
    const { error } = await Promise.race([queryPromise, timeoutPromise]);

    // Mark as resolved and clear timeout
    isResolved = true;
    if (timeoutId) clearTimeout(timeoutId);

    if (error) {
      logger.error({ err: error }, "Auth health check failed");
      return "degraded";
    }

    return "operational";
  } catch (err) {
    // Ensure timeout is cleared even on exception
    isResolved = true;
    if (timeoutId) clearTimeout(timeoutId);

    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, errorMessage: errorMsg }, "Auth health check exception");

    // Distinguish between timeout and other errors
    if (errorMsg.includes("timeout")) {
      return "down";
    }
    return "degraded";
  }
}

/**
 * Determine overall system health status based on subsystem statuses
 * @param database Database connection status
 * @param auth Auth service status
 * @returns Overall health status
 */
function determineOverallStatus(
  database: "connected" | "disconnected" | "error",
  auth: "operational" | "degraded" | "down"
): "healthy" | "degraded" | "unhealthy" {
  // System is healthy only if both subsystems are fully operational
  if (database === "connected" && auth === "operational") {
    return "healthy";
  }

  // System is unhealthy if both subsystems are down
  if ((database === "disconnected" || database === "error") && (auth === "down" || auth === "degraded")) {
    return "unhealthy";
  }

  // Otherwise, system is degraded (one subsystem failing)
  return "degraded";
}

/**
 * Perform comprehensive health check of all subsystems
 * Executes database and auth checks concurrently for optimal performance
 * @param supabase Supabase client instance
 * @returns Health check response with status of all subsystems
 */
export async function check(supabase: SupabaseClient): Promise<HealthCheckResponse> {
  const timestamp = new Date().toISOString();

  try {
    // Execute health checks concurrently using Promise.allSettled
    // This ensures both checks complete even if one fails
    const [databaseResult, authResult] = await Promise.allSettled([pingDatabase(supabase), pingAuth(supabase)]);

    // Extract results or use fallback values on rejection
    const database = databaseResult.status === "fulfilled" ? databaseResult.value : "error";
    const auth = authResult.status === "fulfilled" ? authResult.value : "down";

    // Determine overall system status
    const status = determineOverallStatus(database, auth);

    // Log health check result
    if (status === "healthy") {
      logger.info({ database, auth, status }, "Health check completed");
    } else {
      logger.warn({ database, auth, status }, "Health check completed with degraded status");
    }

    return {
      status,
      database,
      auth,
      timestamp,
    };
  } catch (err) {
    // Catastrophic failure - unable to complete health check
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, errorMessage: errorMsg }, "Health check failed catastrophically");

    return {
      status: "unhealthy",
      database: "error",
      auth: "down",
      timestamp,
    };
  }
}
