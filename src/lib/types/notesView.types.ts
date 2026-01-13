/**
 * View-specific types for Notes View
 * Extends base DTOs from src/types.ts with client-side view models
 */

import type { NoteListItemResponse } from "@/types";

/**
 * Query parameters for notes list API
 * Derived from API endpoint /api/notes query params
 */
export interface NotesQueryParams {
  page: number; // default 1
  limit: number; // default 20
  search?: string; // ≤250 chars
  archived?: boolean; // default false
  sort?: "updated_at" | "created_at" | "title";
  order?: "asc" | "desc";
}

/**
 * Client-side view model extending API response
 * Adds computed fields for UI convenience
 */
export interface NoteVM extends NoteListItemResponse {
  // Derived fields for convenience
  isArchived: boolean; // archived_at !== null
  hasItinerary: boolean; // has_itinerary
  statusLabel: string; // e.g. "Archived", "3 itineraries"
}

/**
 * Local component state for NotesPage
 */
export interface NotesPageState {
  query: string; // search string
  includeArchived: boolean; // show archived notes
}

/**
 * Confirm dialog action types
 */
export type ConfirmAction = "delete" | "archive" | "unarchive";

/**
 * Confirm dialog state
 */
export interface ConfirmDialogState {
  isOpen: boolean;
  action: ConfirmAction | null;
  noteId: string | null;
  noteTitle: string | null;
}
