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
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string | null
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          start_date: string | null
          end_date: string | null
          progress: number | null
          status: 'in_progress' | 'completed' | 'archived' | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          progress?: number | null
          status?: 'in_progress' | 'completed' | 'archived' | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          progress?: number | null
          status?: 'in_progress' | 'completed' | 'archived' | null
          created_at?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          goal_id: string | null
          title: string
          is_completed: boolean | null
          tag_type: 'learning' | 'coding' | 'writing' | 'general' | null
          priority: 'high' | 'medium' | 'low' | null
          estimated_minutes: number | null
          due_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          goal_id?: string | null
          title: string
          is_completed?: boolean | null
          tag_type?: 'learning' | 'coding' | 'writing' | 'general' | null
          priority?: 'high' | 'medium' | 'low' | null
          estimated_minutes?: number | null
          due_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string | null
          title?: string
          is_completed?: boolean | null
          tag_type?: 'learning' | 'coding' | 'writing' | 'general' | null
          priority?: 'high' | 'medium' | 'low' | null
          estimated_minutes?: number | null
          due_date?: string | null
          created_at?: string | null
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          source_task_id: string | null
          linked_goal_id: string | null
          title: string
          content: string | null
          is_published: boolean | null
          slug: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          source_task_id?: string | null
          linked_goal_id?: string | null
          title: string
          content?: string | null
          is_published?: boolean | null
          slug?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          source_task_id?: string | null
          linked_goal_id?: string | null
          title?: string
          content?: string | null
          is_published?: boolean | null
          slug?: string | null
          created_at?: string | null
        }
      }
    }
  }
}
