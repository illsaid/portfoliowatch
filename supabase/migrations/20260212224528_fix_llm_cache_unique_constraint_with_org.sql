/*
  # Fix LLM Cache UNIQUE Constraint to Include org_id

  ## Summary
  Updates the llm_cache table's UNIQUE constraint to properly scope cache entries by organization.

  ## Changes

  1. Modified Constraints
    - Drop old UNIQUE constraint on (provider, model, prompt_version, input_hash)
    - Add new UNIQUE constraint on (org_id, provider, model, prompt_version, input_hash)

  ## Rationale
  - With multi-tenancy support, cache entries must be scoped to organizations
  - Different organizations may have the same input_hash but need separate cache entries
  - This prevents cache pollution between organizations
  - Ensures cache hits only occur within the same organization

  ## Important Notes
  - The input_hash is now generated using SHA-256 (64-character hex)
  - Hash input includes: JSON.stringify(evidence_pack) + provider + model + PROMPT_VERSION
  - No data migration needed as existing cache entries will remain valid
*/

-- Drop the old unique constraint that doesn't include org_id
ALTER TABLE llm_cache DROP CONSTRAINT IF EXISTS llm_cache_provider_model_prompt_version_input_hash_key;

-- Create new unique constraint scoped to org_id
CREATE UNIQUE INDEX IF NOT EXISTS llm_cache_org_provider_model_version_hash_key
  ON llm_cache (org_id, provider, model, prompt_version, input_hash);
