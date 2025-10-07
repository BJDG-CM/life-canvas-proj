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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: number
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: never
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: never
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          end_date: string | null
          id: number
          is_active: boolean
          start_date: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: never
          is_active?: boolean
          start_date?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: never
          is_active?: boolean
          start_date?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: number
          id: number
          joined_at: string
          user_id: string
        }
        Insert: {
          challenge_id: number
          id?: never
          joined_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: number
          id?: never
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          description: string
          frequency: string
          id: number
          is_active: boolean
          name: string
          target_value: number
          tracker_type: string
        }
        Insert: {
          created_at?: string
          description: string
          frequency?: string
          id?: never
          is_active?: boolean
          name: string
          target_value: number
          tracker_type: string
        }
        Update: {
          created_at?: string
          description?: string
          frequency?: string
          id?: never
          is_active?: boolean
          name?: string
          target_value?: number
          tracker_type?: string
        }
        Relationships: []
      }
      community_insights: {
        Row: {
          content: string
          id: number
          insight_data: Json
          published_at: string
          title: string
        }
        Insert: {
          content: string
          id?: never
          insight_data: Json
          published_at?: string
          title: string
        }
        Update: {
          content?: string
          id?: never
          insight_data?: Json
          published_at?: string
          title?: string
        }
        Relationships: []
      }
      custom_logs: {
        Row: {
          created_at: string
          id: number
          log_id: number
          tracker_id: number
          value: string
        }
        Insert: {
          created_at?: string
          id?: never
          log_id: number
          tracker_id: number
          value: string
        }
        Update: {
          created_at?: string
          id?: never
          log_id?: number
          tracker_id?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_logs_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_logs_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          coffee_cups: number | null
          created_at: string
          exercised: boolean | null
          id: number
          log_date: string
          memo: string | null
          mood_score: number | null
          photo_url: string | null
          sleep_hours: number | null
          user_id: string
        }
        Insert: {
          coffee_cups?: number | null
          created_at?: string
          exercised?: boolean | null
          id?: number
          log_date: string
          memo?: string | null
          mood_score?: number | null
          photo_url?: string | null
          sleep_hours?: number | null
          user_id: string
        }
        Update: {
          coffee_cups?: number | null
          created_at?: string
          exercised?: boolean | null
          id?: number
          log_date?: string
          memo?: string | null
          mood_score?: number | null
          photo_url?: string | null
          sleep_hours?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_message: string
          error_stack: string | null
          id: number
          page_url: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_stack?: string | null
          id?: never
          page_url?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_stack?: string | null
          id?: never
          page_url?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          id: number
          is_enabled: boolean
          name: string
          rollout_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          is_enabled?: boolean
          name: string
          rollout_percentage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          is_enabled?: boolean
          name?: string
          rollout_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          linked_tracker_id: number | null
          name: string
          target_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          linked_tracker_id?: number | null
          name: string
          target_value: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          linked_tracker_id?: number | null
          name?: string
          target_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_linked_tracker_id_fkey"
            columns: ["linked_tracker_id"]
            isOneToOne: false
            referencedRelation: "trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ban_reason: string | null
          created_at: string
          id: string
          last_active_at: string | null
          status: Database["public"]["Enums"]["user_status"]
          streak_tracker_id: number | null
          suspended_until: string | null
        }
        Insert: {
          ban_reason?: string | null
          created_at?: string
          id: string
          last_active_at?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          streak_tracker_id?: number | null
          suspended_until?: string | null
        }
        Update: {
          ban_reason?: string | null
          created_at?: string
          id?: string
          last_active_at?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          streak_tracker_id?: number | null
          suspended_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_streak_tracker_id_fkey"
            columns: ["streak_tracker_id"]
            isOneToOne: false
            referencedRelation: "trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_integrations: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          id: number
          is_active: boolean
          service_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: never
          is_active?: boolean
          service_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: never
          is_active?: boolean
          service_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          created_at: string
          id: number
          message: string
          priority: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: never
          message: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: never
          message?: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      template_items: {
        Row: {
          id: number
          item_name: string
          item_type: string
          template_id: number
        }
        Insert: {
          id?: never
          item_name: string
          item_type: string
          template_id: number
        }
        Update: {
          id?: never
          item_name?: string
          item_type?: string
          template_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "tracker_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_templates: {
        Row: {
          approval_status: string
          category: string
          clone_count: number
          created_at: string
          creator_id: string
          description: string
          id: number
          is_featured: boolean
          name: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          approval_status?: string
          category: string
          clone_count?: number
          created_at?: string
          creator_id: string
          description: string
          id?: never
          is_featured?: boolean
          name: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          approval_status?: string
          category?: string
          clone_count?: number
          created_at?: string
          creator_id?: string
          description?: string
          id?: never
          is_featured?: boolean
          name?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
      trackers: {
        Row: {
          created_at: string
          id: number
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          created_at: string
          id: number
          report_data: Json
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: never
          report_data: Json
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: never
          report_data?: Json
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_service_integration: {
        Args: {
          p_access_token?: string
          p_is_active: boolean
          p_service_name: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          id: number
          is_active: boolean
          service_name: string
          updated_at: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      user_status: "active" | "suspended" | "banned"
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
      app_role: ["admin", "user"],
      user_status: ["active", "suspended", "banned"],
    },
  },
} as const
