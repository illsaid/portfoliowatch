export interface Database {
  public: {
    Tables: {
      market_data: {
        Row: {
          id: number;
          ticker: string;
          date: string;
          daily_move: number | null;
          open_price: number | null;
          close_price: number | null;
          high_price: number | null;
          low_price: number | null;
          volume: number | null;
          fetched_at: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          ticker: string;
          date: string;
          daily_move?: number | null;
          open_price?: number | null;
          close_price?: number | null;
          high_price?: number | null;
          low_price?: number | null;
          volume?: number | null;
          fetched_at?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          ticker?: string;
          date?: string;
          daily_move?: number | null;
          open_price?: number | null;
          close_price?: number | null;
          high_price?: number | null;
          low_price?: number | null;
          volume?: number | null;
          fetched_at?: string;
          created_at?: string;
        };
      };
      watchlist: {
        Row: {
          id: number;
          ticker: string;
          dependency: number;
          is_active: boolean;
          added_at: string;
        };
        Insert: {
          id?: number;
          ticker: string;
          dependency?: number;
          is_active?: boolean;
          added_at?: string;
        };
        Update: {
          id?: number;
          ticker?: string;
          dependency?: number;
          is_active?: boolean;
          added_at?: string;
        };
      };
      trials_watchlist: {
        Row: {
          id: number;
          nct_id: string;
          ticker: string;
          is_active: boolean;
          added_at: string;
        };
        Insert: {
          id?: number;
          nct_id: string;
          ticker: string;
          is_active?: boolean;
          added_at?: string;
        };
        Update: {
          id?: number;
          nct_id?: string;
          ticker?: string;
          is_active?: boolean;
          added_at?: string;
        };
      };
      poll_run: {
        Row: {
          id: number;
          run_date: string;
          status: string;
          started_at: string;
          finished_at: string | null;
          error_message: string | null;
        };
        Insert: {
          id?: number;
          run_date: string;
          status?: string;
          started_at?: string;
          finished_at?: string | null;
          error_message?: string | null;
        };
        Update: {
          id?: number;
          run_date?: string;
          status?: string;
          started_at?: string;
          finished_at?: string | null;
          error_message?: string | null;
        };
      };
      detection: {
        Row: {
          id: number;
          run_id: number;
          ticker: string;
          source_tier: string;
          change_type: string;
          detected_at: string;
          score_raw: number;
          score_final: number;
          score_explanation: string;
          policy_action: string;
          state: string;
          url: string | null;
          snippet: string | null;
          diff_summary: string | null;
          llm_confidence: number | null;
          market_move: number | null;
          time_to_catalyst_days: number | null;
        };
        Insert: {
          id?: number;
          run_id: number;
          ticker: string;
          source_tier: string;
          change_type: string;
          detected_at?: string;
          score_raw: number;
          score_final: number;
          score_explanation: string;
          policy_action: string;
          state: string;
          url?: string | null;
          snippet?: string | null;
          diff_summary?: string | null;
          llm_confidence?: number | null;
          market_move?: number | null;
          time_to_catalyst_days?: number | null;
        };
        Update: {
          id?: number;
          run_id?: number;
          ticker?: string;
          source_tier?: string;
          change_type?: string;
          detected_at?: string;
          score_raw?: number;
          score_final?: number;
          score_explanation?: string;
          policy_action?: string;
          state?: string;
          url?: string | null;
          snippet?: string | null;
          diff_summary?: string | null;
          llm_confidence?: number | null;
          market_move?: number | null;
          time_to_catalyst_days?: number | null;
        };
      };
      state_transition: {
        Row: {
          id: number;
          detection_id: number;
          from_state: string;
          to_state: string;
          transitioned_at: string;
          reason: string | null;
        };
        Insert: {
          id?: number;
          detection_id: number;
          from_state: string;
          to_state: string;
          transitioned_at?: string;
          reason?: string | null;
        };
        Update: {
          id?: number;
          detection_id?: number;
          from_state?: string;
          to_state?: string;
          transitioned_at?: string;
          reason?: string | null;
        };
      };
      miss_log: {
        Row: {
          id: number;
          run_id: number;
          ticker: string;
          source_tier: string;
          change_type: string;
          detected_at: string;
          score_final: number;
          policy_action: string;
          suppression_reason: string;
          market_move: number | null;
        };
        Insert: {
          id?: number;
          run_id: number;
          ticker: string;
          source_tier: string;
          change_type: string;
          detected_at?: string;
          score_final: number;
          policy_action: string;
          suppression_reason: string;
          market_move?: number | null;
        };
        Update: {
          id?: number;
          run_id?: number;
          ticker?: string;
          source_tier?: string;
          change_type?: string;
          detected_at?: string;
          score_final?: number;
          policy_action?: string;
          suppression_reason?: string;
          market_move?: number | null;
        };
      };
      notification_thermostat: {
        Row: {
          id: number;
          detection_id: number;
          email_sent_at: string | null;
          sms_sent_at: string | null;
          last_attempt_at: string | null;
          attempt_count: number;
          status: string;
        };
        Insert: {
          id?: number;
          detection_id: number;
          email_sent_at?: string | null;
          sms_sent_at?: string | null;
          last_attempt_at?: string | null;
          attempt_count?: number;
          status?: string;
        };
        Update: {
          id?: number;
          detection_id?: number;
          email_sent_at?: string | null;
          sms_sent_at?: string | null;
          last_attempt_at?: string | null;
          attempt_count?: number;
          status?: string;
        };
      };
      policy_config: {
        Row: {
          id: number;
          policy_yaml: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          policy_yaml: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          policy_yaml?: string;
          updated_at?: string;
        };
      };
      ctgov_snapshot: {
        Row: {
          id: number;
          nct_id: string;
          snapshot_date: string;
          raw_json: any;
          content_hash: string;
        };
        Insert: {
          id?: number;
          nct_id: string;
          snapshot_date: string;
          raw_json: any;
          content_hash: string;
        };
        Update: {
          id?: number;
          nct_id?: string;
          snapshot_date?: string;
          raw_json?: any;
          content_hash?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
