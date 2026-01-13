import type { SupabaseClient } from "../../db/supabase.client";
import type {
  NoteListItemResponse,
  NotesPaginatedResponse,
  NoteResponse,
  DeleteNoteResponse,
  ArchiveNoteResponse,
  UnarchiveNoteResponse,
  PaginationMeta,
} from "../../types";
import type { CreateNoteInput, UpdateNoteInput, ListNotesQueryInput } from "../validators/notes";

/**
 * Service for managing notes
 */

/**
 * Lists notes for a user with pagination and filtering
 * @param supabase Supabase client instance
 * @param userId User ID from authenticated session
 * @param params Query parameters for filtering and pagination
 * @returns Paginated list of notes with metadata
 * @throws Error if database operation fails
 */
export async function listNotes(
  supabase: SupabaseClient,
  userId: string,
  params: ListNotesQueryInput
): Promise<NotesPaginatedResponse> {
  const { page, limit, search, archived, sort, order } = params;
  const offset = (page - 1) * limit;

  // Build base query
  let query = supabase
    .from("notes")
    .select(
      `
      note_id,
      title,
      note_text,
      trip_prefs,
      distance_km,
      duration_h,
      terrain,
      road_type,
      created_at,
      updated_at,
      archived_at
    `,
      { count: "exact" }
    )
    .eq("user_id", userId)
    .is("deleted_at", null);

  // Apply archived filter
  if (archived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  // Apply search filter if provided
  if (search && search.length > 0) {
    // Use full-text search on search_vector column
    query = query.textSearch("search_vector", search, {
      type: "plain",
      config: "simple",
    });
  }

  // Apply sorting
  const ascending = order === "asc";
  query = query.order(sort, { ascending });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list notes: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from list operation");
  }

  // Get itinerary counts for each note
  const noteIds = data.map((note) => note.note_id);
  let itineraryCounts: Record<string, number> = {};

  if (noteIds.length > 0) {
    const { data: itineraryData, error: itineraryError } = await supabase
      .from("itineraries")
      .select("note_id")
      .in("note_id", noteIds)
      .is("deleted_at", null);

    if (itineraryError) {
      throw new Error(`Failed to fetch itinerary counts: ${itineraryError.message}`);
    }

    // Count itineraries per note
    if (itineraryData) {
      itineraryCounts = itineraryData.reduce(
        (acc, item) => {
          acc[item.note_id] = (acc[item.note_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  // Map to response format with itinerary info
  const notes: NoteListItemResponse[] = data.map((note) => ({
    note_id: note.note_id,
    title: note.title,
    note_text: note.note_text,
    trip_prefs: note.trip_prefs || {},
    distance_km: note.distance_km,
    duration_h: note.duration_h,
    terrain: note.terrain,
    road_type: note.road_type,
    has_itinerary: (itineraryCounts[note.note_id] || 0) > 0,
    itinerary_count: itineraryCounts[note.note_id] || 0,
    created_at: note.created_at,
    updated_at: note.updated_at,
    archived_at: note.archived_at,
  }));

  // Calculate pagination metadata
  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const pagination: PaginationMeta = {
    page,
    limit,
    total,
    total_pages: totalPages,
  };

  return {
    data: notes,
    pagination,
  };
}

/**
 * Creates a new note for a user
 * @param supabase Supabase client instance
 * @param userId User ID from authenticated session
 * @param input Note creation data
 * @returns Created note
 * @throws Error if database operation fails or validation fails
 */
export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  input: CreateNoteInput
): Promise<NoteResponse> {
  // First, check if user has preferences set
  const { data: prefsData, error: prefsError } = await supabase
    .from("user_preferences")
    .select("user_id")
    .eq("user_id", userId)
    .single();

  if (prefsError) {
    // If error code is PGRST116, it means no row found
    if (prefsError.code === "PGRST116") {
      throw new Error("PREFERENCES_INCOMPLETE");
    }
    throw new Error(`Failed to check user preferences: ${prefsError.message}`);
  }

  if (!prefsData) {
    throw new Error("PREFERENCES_INCOMPLETE");
  }

  // Insert the note
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      title: input.title,
      note_text: input.note_text,
      trip_prefs: input.trip_prefs || {},
    })
    .select("*")
    .single();

  if (error) {
    // Check for unique constraint violation (duplicate title)
    if (error.code === "23505" && error.message.includes("notes_user_id_title_key")) {
      throw new Error("NOTE_TITLE_CONFLICT");
    }
    throw new Error(`Failed to create note: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from insert operation");
  }

  // Map to response format (exclude deleted_at)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deleted_at: _deleted_at, ...noteResponse } = data;
  return noteResponse as NoteResponse;
}

/**
 * Retrieves a single note by ID for a specific user
 * @param supabase Supabase client instance
 * @param noteId Note ID to retrieve
 * @param userId User ID from authenticated session
 * @returns Note details
 * @throws Error if note not found, deleted, or access denied
 */
export async function getNoteById(supabase: SupabaseClient, noteId: string, userId: string): Promise<NoteResponse> {
  const { data, error } = await supabase
    .from("notes")
    .select(
      `
      note_id,
      user_id,
      title,
      note_text,
      trip_prefs,
      ai_summary,
      distance_km,
      duration_h,
      terrain,
      road_type,
      created_at,
      updated_at,
      archived_at
    `
    )
    .eq("note_id", noteId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error) {
    // PGRST116 means no rows returned
    if (error.code === "PGRST116") {
      throw new Error("NOTE_NOT_FOUND");
    }
    throw new Error(`Failed to fetch note: ${error.message}`);
  }

  if (!data) {
    throw new Error("NOTE_NOT_FOUND");
  }

  return data as NoteResponse;
}

/**
 * Updates an existing note for a user
 * @param supabase Supabase client instance
 * @param noteId Note ID to update
 * @param userId User ID from authenticated session
 * @param input Note update data
 * @returns Updated note
 * @throws Error if note not found, access denied, or validation fails
 */
export async function updateNote(
  supabase: SupabaseClient,
  noteId: string,
  userId: string,
  input: UpdateNoteInput
): Promise<NoteResponse> {
  // First verify the note exists and belongs to the user
  await getNoteById(supabase, noteId, userId);

  // Update the note
  const { data, error } = await supabase
    .from("notes")
    .update({
      title: input.title,
      note_text: input.note_text,
      trip_prefs: input.trip_prefs || {},
      updated_at: new Date().toISOString(),
    })
    .eq("note_id", noteId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    // Check for unique constraint violation (duplicate title)
    if (error.code === "23505" && error.message.includes("notes_user_id_title_key")) {
      throw new Error("NOTE_TITLE_CONFLICT");
    }
    throw new Error(`Failed to update note: ${error.message}`);
  }

  if (!data) {
    throw new Error("NOTE_NOT_FOUND");
  }

  // Map to response format (exclude deleted_at)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deleted_at: _deleted_at, ...noteResponse } = data;
  return noteResponse as NoteResponse;
}

/**
 * Soft-deletes a note for a user (sets deleted_at timestamp)
 * Cascades delete to associated itineraries via database trigger
 * @param supabase Supabase client instance
 * @param noteId Note ID to delete
 * @param userId User ID from authenticated session
 * @returns Delete confirmation with timestamp
 * @throws Error if note not found or access denied
 */
export async function deleteNote(
  supabase: SupabaseClient,
  noteId: string,
  userId: string
): Promise<DeleteNoteResponse> {
  // First verify the note exists and belongs to the user
  await getNoteById(supabase, noteId, userId);

  // Soft delete the note (database trigger will cascade to itineraries)
  const deletedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("notes")
    .update({
      deleted_at: deletedAt,
    })
    .eq("note_id", noteId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("note_id, deleted_at")
    .single();

  if (error) {
    throw new Error(`Failed to delete note: ${error.message}`);
  }

  if (!data) {
    throw new Error("NOTE_NOT_FOUND");
  }

  return {
    success: true,
    note_id: data.note_id,
    deleted_at: data.deleted_at ?? new Date().toISOString(),
  };
}

/**
 * Archives a note for a user (sets archived_at timestamp)
 * Idempotent operation - returns current state if already archived
 * @param supabase Supabase client instance
 * @param noteId Note ID to archive
 * @param userId User ID from authenticated session
 * @returns Archive confirmation with timestamp
 * @throws Error if note not found or access denied
 */
export async function archiveNote(
  supabase: SupabaseClient,
  noteId: string,
  userId: string
): Promise<ArchiveNoteResponse> {
  // First verify the note exists and belongs to the user
  const note = await getNoteById(supabase, noteId, userId);

  // If already archived, return current state (idempotent)
  if (note.archived_at) {
    return {
      note_id: note.note_id,
      archived_at: note.archived_at,
    };
  }

  // Archive the note
  const archivedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("notes")
    .update({
      archived_at: archivedAt,
    })
    .eq("note_id", noteId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("note_id, archived_at")
    .single();

  if (error) {
    throw new Error(`Failed to archive note: ${error.message}`);
  }

  if (!data) {
    throw new Error("NOTE_NOT_FOUND");
  }

  return {
    note_id: data.note_id,
    archived_at: data.archived_at ?? new Date().toISOString(),
  };
}

/**
 * Unarchives a note for a user (clears archived_at timestamp)
 * Idempotent operation - returns current state if already unarchived
 * @param supabase Supabase client instance
 * @param noteId Note ID to unarchive
 * @param userId User ID from authenticated session
 * @returns Unarchive confirmation with null archived_at
 * @throws Error if note not found or access denied
 */
export async function unarchiveNote(
  supabase: SupabaseClient,
  noteId: string,
  userId: string
): Promise<UnarchiveNoteResponse> {
  // First verify the note exists and belongs to the user
  const note = await getNoteById(supabase, noteId, userId);

  // If already unarchived, return current state (idempotent)
  if (!note.archived_at) {
    return {
      note_id: note.note_id,
      archived_at: null,
    };
  }

  // Unarchive the note
  const { data, error } = await supabase
    .from("notes")
    .update({
      archived_at: null,
    })
    .eq("note_id", noteId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("note_id, archived_at")
    .single();

  if (error) {
    throw new Error(`Failed to unarchive note: ${error.message}`);
  }

  if (!data) {
    throw new Error("NOTE_NOT_FOUND");
  }

  return {
    note_id: data.note_id,
    archived_at: null,
  };
}
