export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chunk_annotations: {
        Row: {
          chunk_id: string
          condense_strategy: string | null
          created_at: string
          id: string
          label: Database["public"]["Enums"]["primary_label"]
          override_justification: string | null
          remove_reason: string | null
          scope: Database["public"]["Enums"]["label_scope"]
          updated_at: string
          user_id: string
        }
        Insert: {
          chunk_id: string
          condense_strategy?: string | null
          created_at?: string
          id?: string
          label: Database["public"]["Enums"]["primary_label"]
          override_justification?: string | null
          remove_reason?: string | null
          scope?: Database["public"]["Enums"]["label_scope"]
          updated_at?: string
          user_id: string
        }
        Update: {
          chunk_id?: string
          condense_strategy?: string | null
          created_at?: string
          id?: string
          label?: Database["public"]["Enums"]["primary_label"]
          override_justification?: string | null
          remove_reason?: string | null
          scope?: Database["public"]["Enums"]["label_scope"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunk_annotations_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "document_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_documents: {
        Row: {
          created_at: string
          id: string
          note_type: string | null
          original_text: string
          service: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_type?: string | null
          original_text: string
          service?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_type?: string | null
          original_text?: string
          service?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          chunk_type: Database["public"]["Enums"]["chunk_type"]
          confidence: number | null
          created_at: string
          critical_type: string | null
          document_id: string
          end_index: number
          id: string
          is_critical: boolean
          start_index: number
          suggested_label: Database["public"]["Enums"]["primary_label"] | null
          text: string
        }
        Insert: {
          chunk_index: number
          chunk_type?: Database["public"]["Enums"]["chunk_type"]
          confidence?: number | null
          created_at?: string
          critical_type?: string | null
          document_id: string
          end_index: number
          id?: string
          is_critical?: boolean
          start_index: number
          suggested_label?: Database["public"]["Enums"]["primary_label"] | null
          text: string
        }
        Update: {
          chunk_index?: number
          chunk_type?: Database["public"]["Enums"]["chunk_type"]
          confidence?: number | null
          created_at?: string
          critical_type?: string | null
          document_id?: string
          end_index?: number
          id?: string
          is_critical?: boolean
          start_index?: number
          suggested_label?: Database["public"]["Enums"]["primary_label"] | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "clinical_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      learned_rules: {
        Row: {
          chunk_type: Database["public"]["Enums"]["chunk_type"] | null
          condense_strategy: string | null
          created_at: string
          id: string
          label: Database["public"]["Enums"]["primary_label"]
          note_type: string | null
          pattern_text: string
          remove_reason: string | null
          scope: Database["public"]["Enums"]["label_scope"]
          service: string | null
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          chunk_type?: Database["public"]["Enums"]["chunk_type"] | null
          condense_strategy?: string | null
          created_at?: string
          id?: string
          label: Database["public"]["Enums"]["primary_label"]
          note_type?: string | null
          pattern_text: string
          remove_reason?: string | null
          scope: Database["public"]["Enums"]["label_scope"]
          service?: string | null
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          chunk_type?: Database["public"]["Enums"]["chunk_type"] | null
          condense_strategy?: string | null
          created_at?: string
          id?: string
          label?: Database["public"]["Enums"]["primary_label"]
          note_type?: string | null
          pattern_text?: string
          remove_reason?: string | null
          scope?: Database["public"]["Enums"]["label_scope"]
          service?: string | null
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      chunk_type:
        | "section_header"
        | "paragraph"
        | "bullet_list"
        | "imaging_report"
        | "lab_values"
        | "medication_list"
        | "vital_signs"
        | "attestation"
        | "unknown"
      label_scope: "this_document" | "note_type" | "service" | "global"
      primary_label: "KEEP" | "CONDENSE" | "REMOVE"
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
  public: {
    Enums: {
      chunk_type: [
        "section_header",
        "paragraph",
        "bullet_list",
        "imaging_report",
        "lab_values",
        "medication_list",
        "vital_signs",
        "attestation",
        "unknown",
      ],
      label_scope: ["this_document", "note_type", "service", "global"],
      primary_label: ["KEEP", "CONDENSE", "REMOVE"],
    },
  },
} as const
