/*
  # Add diagnostics_json to poll_run table

  ## Summary
  Adds a diagnostics_json column to the poll_run table to store diagnostic information
  about poll run failures and warnings without leaking secrets.

  ## Changes

  1. Modified Tables
    - `poll_run` - Add diagnostics_json column (jsonb, nullable)

  ## Purpose
  - Store structured diagnostic information for debugging poll runs
  - Enable health check endpoint to report detailed status
  - Keep diagnostic data separate from user-facing error messages
  - Ensure no secrets or sensitive data are logged

  ## Important Notes
  - Column is nullable as not all runs will have diagnostics
  - Existing rows will have NULL diagnostics_json
  - Data should never contain API keys, tokens, or sensitive credentials
*/

-- Add diagnostics_json column to poll_run table
ALTER TABLE poll_run 
  ADD COLUMN IF NOT EXISTS diagnostics_json jsonb;
