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
      audit_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      in_app_notifications: {
        Row: {
          body: string
          created_at: string
          cta_url: string | null
          id: string
          is_read: boolean | null
          push_notification_id: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          cta_url?: string | null
          id?: string
          is_read?: boolean | null
          push_notification_id?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          cta_url?: string | null
          id?: string
          is_read?: boolean | null
          push_notification_id?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_push_notification_id_fkey"
            columns: ["push_notification_id"]
            isOneToOne: false
            referencedRelation: "push_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      push_campaigns: {
        Row: {
          admin_user_id: string
          body: string
          created_at: string | null
          id: string
          target_criteria: Json | null
          title: string
        }
        Insert: {
          admin_user_id: string
          body: string
          created_at?: string | null
          id?: string
          target_criteria?: Json | null
          title: string
        }
        Update: {
          admin_user_id?: string
          body?: string
          created_at?: string | null
          id?: string
          target_criteria?: Json | null
          title?: string
        }
        Relationships: []
      }
      push_notification_logs: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          notification_id: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_id: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "push_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notifications: {
        Row: {
          body: string
          click_count: number | null
          created_at: string | null
          created_by: string
          cta_url: string | null
          data_payload: Json | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          image_url: string | null
          repeat_type: string | null
          schedule_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          target_criteria: Json | null
          target_type: string
          title: string
        }
        Insert: {
          body: string
          click_count?: number | null
          created_at?: string | null
          created_by: string
          cta_url?: string | null
          data_payload?: Json | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          image_url?: string | null
          repeat_type?: string | null
          schedule_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          target_criteria?: Json | null
          target_type?: string
          title: string
        }
        Update: {
          body?: string
          click_count?: number | null
          created_at?: string | null
          created_by?: string
          cta_url?: string | null
          data_payload?: Json | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          image_url?: string | null
          repeat_type?: string | null
          schedule_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          target_criteria?: Json | null
          target_type?: string
          title?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          fcm_token: string
          id: string
          platform: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fcm_token: string
          id?: string
          platform?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fcm_token?: string
          id?: string
          platform?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referrals: {
        Row: {
          amount_given: number | null
          confirmed_at: string | null
          created_at: string | null
          date: string | null
          id: string
          manual_credit_notes: string | null
          manually_credited: boolean | null
          new_user_id: string
          referrer_id: string
          status: string | null
        }
        Insert: {
          amount_given?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          manual_credit_notes?: string | null
          manually_credited?: boolean | null
          new_user_id: string
          referrer_id: string
          status?: string | null
        }
        Update: {
          amount_given?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          manual_credit_notes?: string | null
          manually_credited?: boolean | null
          new_user_id?: string
          referrer_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_new_user_id_fkey"
            columns: ["new_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rpc_purchases: {
        Row: {
          created_at: string | null
          date: string | null
          email: string
          id: string
          phone: string
          proof_image: string | null
          rpc_code_issued: string | null
          user_id: string
          user_name: string
          user_unique_id: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          email: string
          id?: string
          phone: string
          proof_image?: string | null
          rpc_code_issued?: string | null
          user_id: string
          user_name: string
          user_unique_id: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          email?: string
          id?: string
          phone?: string
          proof_image?: string | null
          rpc_code_issued?: string | null
          user_id?: string
          user_name?: string
          user_unique_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "rpc_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          message: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          message: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          message?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_support_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string | null
          date: string | null
          id: string
          meta: Json
          proof_image: string | null
          reference_id: string | null
          title: string
          transaction_id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before?: number
          created_at?: string | null
          date?: string | null
          id?: string
          meta?: Json
          proof_image?: string | null
          reference_id?: string | null
          title: string
          transaction_id: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          date?: string | null
          id?: string
          meta?: Json
          proof_image?: string | null
          reference_id?: string | null
          title?: string
          transaction_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          id: string
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          balance: number | null
          country: string
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_claim_at: string | null
          last_name: string
          phone: string
          profile_image: string | null
          referral_code: string
          referral_count: number
          referred_by: string | null
          rpc_code: string | null
          rpc_purchased: boolean | null
          status: string | null
          user_id: string
        }
        Insert: {
          auth_user_id?: string | null
          balance?: number | null
          country: string
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_claim_at?: string | null
          last_name: string
          phone: string
          profile_image?: string | null
          referral_code: string
          referral_count?: number
          referred_by?: string | null
          rpc_code?: string | null
          rpc_purchased?: boolean | null
          status?: string | null
          user_id: string
        }
        Update: {
          auth_user_id?: string | null
          balance?: number | null
          country?: string
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_claim_at?: string | null
          last_name?: string
          phone?: string
          profile_image?: string | null
          referral_code?: string
          referral_count?: number
          referred_by?: string | null
          rpc_code?: string | null
          rpc_purchased?: boolean | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_referral: {
        Args: { _amount?: number; _new_user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
