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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          application_id: string
          created_at: string | null
          donor_id: string
          hospital_id: string
          id: string
          location: string | null
          notes: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          donor_id: string
          hospital_id: string
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          donor_id?: string
          hospital_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "donor_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_inventory: {
        Row: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          hospital_id: string
          id: string
          last_updated: string | null
          units_available: number
        }
        Insert: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          hospital_id: string
          id?: string
          last_updated?: string | null
          units_available?: number
        }
        Update: {
          blood_group?: Database["public"]["Enums"]["blood_group"]
          hospital_id?: string
          id?: string
          last_updated?: string | null
          units_available?: number
        }
        Relationships: [
          {
            foreignKeyName: "blood_inventory_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_requests: {
        Row: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          contact_info: string | null
          created_at: string | null
          expires_at: string | null
          hospital_address: string | null
          hospital_id: string
          id: string
          is_emergency: boolean
          notes: string | null
          quantity_needed: number
          status: Database["public"]["Enums"]["blood_request_status"]
          updated_at: string | null
          urgency_level: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          contact_info?: string | null
          created_at?: string | null
          expires_at?: string | null
          hospital_address?: string | null
          hospital_id: string
          id?: string
          is_emergency?: boolean
          notes?: string | null
          quantity_needed: number
          status?: Database["public"]["Enums"]["blood_request_status"]
          updated_at?: string | null
          urgency_level?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          blood_group?: Database["public"]["Enums"]["blood_group"]
          contact_info?: string | null
          created_at?: string | null
          expires_at?: string | null
          hospital_address?: string | null
          hospital_id?: string
          id?: string
          is_emergency?: boolean
          notes?: string | null
          quantity_needed?: number
          status?: Database["public"]["Enums"]["blood_request_status"]
          updated_at?: string | null
          urgency_level?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "blood_requests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_history: {
        Row: {
          appointment_id: string | null
          blood_group: Database["public"]["Enums"]["blood_group"]
          created_at: string | null
          donation_date: string
          donor_id: string
          hospital_id: string
          id: string
          notes: string | null
          units_donated: number
        }
        Insert: {
          appointment_id?: string | null
          blood_group: Database["public"]["Enums"]["blood_group"]
          created_at?: string | null
          donation_date: string
          donor_id: string
          hospital_id: string
          id?: string
          notes?: string | null
          units_donated?: number
        }
        Update: {
          appointment_id?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group"]
          created_at?: string | null
          donation_date?: string
          donor_id?: string
          hospital_id?: string
          id?: string
          notes?: string | null
          units_donated?: number
        }
        Relationships: [
          {
            foreignKeyName: "donation_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_history_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_history_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_applications: {
        Row: {
          created_at: string | null
          donor_id: string
          id: string
          message: string | null
          request_id: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          donor_id: string
          id?: string
          message?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          donor_id?: string
          id?: string
          message?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donor_applications_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_applications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "blood_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          address: string | null
          avatar_url: string | null
          blood_group: Database["public"]["Enums"]["blood_group"]
          created_at: string | null
          date_of_birth: string
          email: string | null
          full_name: string
          gender: string
          health_declaration: boolean
          id: string
          last_donation_date: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          updated_at: string | null
          weight: number
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          blood_group: Database["public"]["Enums"]["blood_group"]
          created_at?: string | null
          date_of_birth: string
          email?: string | null
          full_name: string
          gender: string
          health_declaration?: boolean
          id: string
          last_donation_date?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string | null
          weight: number
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group"]
          created_at?: string | null
          date_of_birth?: string
          email?: string | null
          full_name?: string
          gender?: string
          health_declaration?: boolean
          id?: string
          last_donation_date?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string | null
          weight?: number
        }
        Relationships: []
      }
      expo_push_tokens: {
        Row: {
          created_at: string | null
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          address: string
          created_at: string | null
          email: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          phone: string | null
          type: Database["public"]["Enums"]["hospital_type"]
          updated_at: string | null
          verified: boolean
        }
        Insert: {
          address: string
          created_at?: string | null
          email?: string | null
          id: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          type: Database["public"]["Enums"]["hospital_type"]
          updated_at?: string | null
          verified?: boolean
        }
        Update: {
          address?: string
          created_at?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          type?: Database["public"]["Enums"]["hospital_type"]
          updated_at?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_eligible: {
        Args: { donor_row: Database["public"]["Tables"]["donors"]["Row"] }
        Returns: boolean
      }
    }
    Enums: {
      application_status: "pending" | "approved" | "rejected"
      appointment_status: "scheduled" | "completed" | "cancelled" | "no_show"
      blood_group: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
      blood_request_status: "active" | "fulfilled" | "cancelled"
      hospital_type: "hospital" | "blood_bank"
      notification_type:
        | "new_request"
        | "application_status"
        | "appointment"
        | "emergency"
        | "donation_confirmed"
      urgency_level: "normal" | "urgent" | "emergency"
      user_role: "donor" | "hospital"
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
      application_status: ["pending", "approved", "rejected"],
      appointment_status: ["scheduled", "completed", "cancelled", "no_show"],
      blood_group: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      blood_request_status: ["active", "fulfilled", "cancelled"],
      hospital_type: ["hospital", "blood_bank"],
      notification_type: [
        "new_request",
        "application_status",
        "appointment",
        "emergency",
        "donation_confirmed",
      ],
      urgency_level: ["normal", "urgent", "emergency"],
      user_role: ["donor", "hospital"],
    },
  },
} as const
