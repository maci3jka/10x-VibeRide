import type { SupabaseClient } from "../../db/supabase.client";
import type { UserStatsResponse, GenerationStatsResponse } from "../../types";
import type { StatsQueryInput } from "../validators/analytics";

/**
 * Service for analytics and statistics operations
 * These functions are restricted to service_role access only
 */

/**
 * Date range helper type for internal use
 */
interface DateRange {
  from?: string;
  to?: string;
}

/**
 * Get aggregated user statistics
 * @param supabase Supabase client instance (must be service_role)
 * @param range Optional date range filter
 * @returns User statistics
 * @throws Error if database operation fails
 */
export async function getUserStats(
  supabase: SupabaseClient,
  range: DateRange = {}
): Promise<UserStatsResponse> {
  // Build date filter for new users
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  // Query 1: Total users count
  const { count: totalUsers, error: totalUsersError } = await supabase
    .schema("auth")
    .from("users")
    .select("*", { count: "exact", head: true });

  if (totalUsersError) {
    throw new Error(`Failed to count total users: ${totalUsersError.message}`);
  }

  // Query 2: Users with completed profiles (have preferences)
  const { count: usersWithProfiles, error: profilesError } = await supabase
    .from("user_preferences")
    .select("*", { count: "exact", head: true });

  if (profilesError) {
    throw new Error(`Failed to count users with profiles: ${profilesError.message}`);
  }

  // Query 3: Active users (last_sign_in_at within last 30 days)
  const { count: activeUsers, error: activeUsersError } = await supabase
    .schema("auth")
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("last_sign_in_at", thirtyDaysAgoISO);

  if (activeUsersError) {
    throw new Error(`Failed to count active users: ${activeUsersError.message}`);
  }

  // Query 4: New users in last 30 days (or within date range if provided)
  let newUsersQuery = supabase.schema("auth").from("users").select("*", { count: "exact", head: true });

  if (range.from) {
    newUsersQuery = newUsersQuery.gte("created_at", range.from);
  } else {
    newUsersQuery = newUsersQuery.gte("created_at", thirtyDaysAgoISO);
  }

  if (range.to) {
    newUsersQuery = newUsersQuery.lte("created_at", range.to);
  }

  const { count: newUsers, error: newUsersError } = await newUsersQuery;

  if (newUsersError) {
    throw new Error(`Failed to count new users: ${newUsersError.message}`);
  }

  // Calculate profile completion rate
  const profileCompletionRate = totalUsers && totalUsers > 0 ? (usersWithProfiles ?? 0) / totalUsers : 0;

  return {
    total_users: totalUsers ?? 0,
    users_with_completed_profiles: usersWithProfiles ?? 0,
    profile_completion_rate: profileCompletionRate,
    active_users_30d: activeUsers ?? 0,
    new_users_30d: newUsers ?? 0,
  };
}

/**
 * Get aggregated generation statistics
 * @param supabase Supabase client instance (must be service_role)
 * @param range Optional date range filter
 * @returns Generation statistics
 * @throws Error if database operation fails
 */
export async function getGenerationStats(
  supabase: SupabaseClient,
  range: DateRange = {}
): Promise<GenerationStatsResponse> {
  // Build base query for itineraries
  let baseQuery = supabase.from("itineraries").select("*", { count: "exact" });

  if (range.from) {
    baseQuery = baseQuery.gte("created_at", range.from);
  }

  if (range.to) {
    baseQuery = baseQuery.lte("created_at", range.to);
  }

  // Query 1: Total generations
  const { count: totalGenerations, error: totalError } = await baseQuery;

  if (totalError) {
    throw new Error(`Failed to count total generations: ${totalError.message}`);
  }

  // Query 2: Completed generations
  let completedQuery = supabase
    .from("itineraries")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  if (range.from) {
    completedQuery = completedQuery.gte("created_at", range.from);
  }
  if (range.to) {
    completedQuery = completedQuery.lte("created_at", range.to);
  }

  const { count: completedGenerations, error: completedError } = await completedQuery;

  if (completedError) {
    throw new Error(`Failed to count completed generations: ${completedError.message}`);
  }

  // Query 3: Failed generations
  let failedQuery = supabase
    .from("itineraries")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed");

  if (range.from) {
    failedQuery = failedQuery.gte("created_at", range.from);
  }
  if (range.to) {
    failedQuery = failedQuery.lte("created_at", range.to);
  }

  const { count: failedGenerations, error: failedError } = await failedQuery;

  if (failedError) {
    throw new Error(`Failed to count failed generations: ${failedError.message}`);
  }

  // Query 4: Cancelled generations
  let cancelledQuery = supabase
    .from("itineraries")
    .select("*", { count: "exact", head: true })
    .eq("status", "cancelled");

  if (range.from) {
    cancelledQuery = cancelledQuery.gte("created_at", range.from);
  }
  if (range.to) {
    cancelledQuery = cancelledQuery.lte("created_at", range.to);
  }

  const { count: cancelledGenerations, error: cancelledError } = await cancelledQuery;

  if (cancelledError) {
    throw new Error(`Failed to count cancelled generations: ${cancelledError.message}`);
  }

  // Calculate failure rate
  const failureRate = totalGenerations && totalGenerations > 0 ? (failedGenerations ?? 0) / totalGenerations : 0;

  // Query 5: Get generation times for completed itineraries
  let timingQuery = supabase
    .from("itineraries")
    .select("created_at, updated_at")
    .eq("status", "completed");

  if (range.from) {
    timingQuery = timingQuery.gte("created_at", range.from);
  }
  if (range.to) {
    timingQuery = timingQuery.lte("created_at", range.to);
  }

  const { data: timingData, error: timingError } = await timingQuery;

  if (timingError) {
    throw new Error(`Failed to fetch generation timing data: ${timingError.message}`);
  }

  // Calculate average and p95 generation times
  const durations = (timingData ?? [])
    .map((row) => {
      const start = new Date(row.created_at).getTime();
      const end = new Date(row.updated_at).getTime();
      return (end - start) / 1000; // Convert to seconds
    })
    .filter((d) => d > 0); // Filter out invalid durations

  const avgGenerationTime = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // Calculate p95 (95th percentile)
  const sortedDurations = [...durations].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedDurations.length * 0.95);
  const p95GenerationTime = sortedDurations.length > 0 ? sortedDurations[p95Index] ?? 0 : 0;

  // Query 6: Generations per user statistics
  let perUserQuery = supabase.from("itineraries").select("user_id");

  if (range.from) {
    perUserQuery = perUserQuery.gte("created_at", range.from);
  }
  if (range.to) {
    perUserQuery = perUserQuery.lte("created_at", range.to);
  }

  const { data: perUserData, error: perUserError } = await perUserQuery;

  if (perUserError) {
    throw new Error(`Failed to fetch per-user generation data: ${perUserError.message}`);
  }

  // Count generations per user
  const userGenerationCounts = new Map<string, number>();
  (perUserData ?? []).forEach((row) => {
    const count = userGenerationCounts.get(row.user_id) ?? 0;
    userGenerationCounts.set(row.user_id, count + 1);
  });

  const counts = Array.from(userGenerationCounts.values());
  const meanPerUser = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;

  // Calculate median
  const sortedCounts = [...counts].sort((a, b) => a - b);
  const medianPerUser =
    sortedCounts.length > 0
      ? sortedCounts.length % 2 === 0
        ? (sortedCounts[sortedCounts.length / 2 - 1]! + sortedCounts[sortedCounts.length / 2]!) / 2
        : sortedCounts[Math.floor(sortedCounts.length / 2)]!
      : 0;

  const usersWith3Plus = counts.filter((c) => c >= 3).length;

  // Estimate cost (placeholder calculation: $0.01 per generation)
  const estimatedCostUsd = (completedGenerations ?? 0) * 0.01;

  return {
    total_generations: totalGenerations ?? 0,
    completed_generations: completedGenerations ?? 0,
    failed_generations: failedGenerations ?? 0,
    cancelled_generations: cancelledGenerations ?? 0,
    failure_rate: failureRate,
    avg_generation_time_seconds: avgGenerationTime,
    p95_generation_time_seconds: p95GenerationTime,
    generations_per_user: {
      mean: meanPerUser,
      median: medianPerUser,
      users_with_3_plus: usersWith3Plus,
    },
    estimated_cost_usd: estimatedCostUsd,
  };
}

