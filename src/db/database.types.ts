export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  viberide: {
    Tables: {
      itineraries: {
        Row: {
          created_at: string
          deleted_at: string | null
          itinerary_id: string
          note_id: string
          request_id: string
          route_geojson: Json
          status: Database["viberide"]["Enums"]["itinerary_status"]
          title: string | null
          total_distance_km: number | null
          total_duration_h: number | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          itinerary_id?: string
          note_id: string
          request_id: string
          route_geojson: Json
          status?: Database["viberide"]["Enums"]["itinerary_status"]
          title?: string | null
          total_distance_km?: number | null
          total_duration_h?: number | null
          updated_at?: string
          user_id: string
          version: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          itinerary_id?: string
          note_id?: string
          request_id?: string
          route_geojson?: Json
          status?: Database["viberide"]["Enums"]["itinerary_status"]
          title?: string | null
          total_distance_km?: number | null
          total_duration_h?: number | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["note_id"]
          },
        ]
      }
      notes: {
        Row: {
          ai_summary: Json | null
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          distance_km: number | null
          duration_h: number | null
          note_id: string
          note_text: string
          road_type: Database["viberide"]["Enums"]["road_type"] | null
          search_vector: unknown
          terrain: Database["viberide"]["Enums"]["terrain"] | null
          title: string
          trip_prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: Json | null
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          distance_km?: number | null
          duration_h?: number | null
          note_id?: string
          note_text: string
          road_type?: Database["viberide"]["Enums"]["road_type"] | null
          search_vector?: unknown
          terrain?: Database["viberide"]["Enums"]["terrain"] | null
          title: string
          trip_prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: Json | null
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          distance_km?: number | null
          duration_h?: number | null
          note_id?: string
          note_text?: string
          road_type?: Database["viberide"]["Enums"]["road_type"] | null
          search_vector?: unknown
          terrain?: Database["viberide"]["Enums"]["terrain"] | null
          title?: string
          trip_prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          road_type: Database["viberide"]["Enums"]["road_type"]
          terrain: Database["viberide"]["Enums"]["terrain"]
          typical_distance_km: number
          typical_duration_h: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          road_type: Database["viberide"]["Enums"]["road_type"]
          terrain: Database["viberide"]["Enums"]["terrain"]
          typical_distance_km: number
          typical_duration_h: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          road_type?: Database["viberide"]["Enums"]["road_type"]
          terrain?: Database["viberide"]["Enums"]["terrain"]
          typical_distance_km?: number
          typical_duration_h?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      latest_itinerary: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          itinerary_id: string | null
          note_id: string | null
          request_id: string | null
          route_geojson: Json | null
          status: Database["viberide"]["Enums"]["itinerary_status"] | null
          title: string | null
          total_distance_km: number | null
          total_duration_h: number | null
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["note_id"]
          },
        ]
      }
    }
    Functions: {
      refresh_latest_itinerary: { Args: never; Returns: undefined }
      validate_route_geojson: { Args: { geojson: Json }; Returns: boolean }
    }
    Enums: {
      itinerary_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      road_type: "scenic" | "twisty" | "highway"
      terrain: "paved" | "gravel" | "mixed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  viberide: {
    Enums: {
      itinerary_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      road_type: ["scenic", "twisty", "highway"],
      terrain: ["paved", "gravel", "mixed"],
    },
  },
} as const

