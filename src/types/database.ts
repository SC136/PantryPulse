/* eslint-disable @typescript-eslint/no-explicit-any */
// Supabase Database types — using relaxed types for compatibility
// Regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      pantry_items: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          quantity: number
          unit: string
          purchase_date: string
          expiry_date: string | null
          days_until_expiry: number | null
          price: number | null
          store: string | null
          image_url: string | null
          is_used: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: string
          quantity?: number
          unit?: string
          purchase_date?: string
          expiry_date?: string | null
          price?: number | null
          store?: string | null
          image_url?: string | null
          is_used?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          quantity?: number
          unit?: string
          purchase_date?: string
          expiry_date?: string | null
          price?: number | null
          store?: string | null
          image_url?: string | null
          is_used?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          id: string
          user_id: string
          title: string
          ingredients: Json
          instructions: string
          cook_time_minutes: number | null
          servings: number
          tags: string[] | null
          is_favorited: boolean
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          ingredients: Json
          instructions: string
          cook_time_minutes?: number | null
          servings?: number
          tags?: string[] | null
          is_favorited?: boolean
          generated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          ingredients?: Json
          instructions?: string
          cook_time_minutes?: number | null
          servings?: number
          tags?: string[] | null
          is_favorited?: boolean
          generated_at?: string
        }
        Relationships: []
      }
      grocery_list: {
        Row: {
          id: string
          user_id: string
          name: string
          quantity: number
          unit: string
          is_purchased: boolean
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          quantity?: number
          unit?: string
          is_purchased?: boolean
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          quantity?: number
          unit?: string
          is_purchased?: boolean
          added_at?: string
        }
        Relationships: []
      }
      waste_log: {
        Row: {
          id: string
          user_id: string
          item_name: string
          estimated_price: number | null
          wasted_at: string
          reason: string
        }
        Insert: {
          id?: string
          user_id: string
          item_name: string
          estimated_price?: number | null
          wasted_at?: string
          reason?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_name?: string
          estimated_price?: number | null
          wasted_at?: string
          reason?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          dietary_preferences: string[]
          cuisine_preferences: string[]
          cooking_skill: string
          household_size: number
          has_air_fryer: boolean
          has_instant_pot: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          dietary_preferences?: string[]
          cuisine_preferences?: string[]
          cooking_skill?: string
          household_size?: number
          has_air_fryer?: boolean
          has_instant_pot?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          dietary_preferences?: string[]
          cuisine_preferences?: string[]
          cooking_skill?: string
          household_size?: number
          has_air_fryer?: boolean
          has_instant_pot?: boolean
          created_at?: string
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
      [_ in never]: never
    }
  }
}
