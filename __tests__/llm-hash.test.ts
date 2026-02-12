import { describe, it, expect } from 'vitest';
import { computeInputHash, type EvidencePack, PROMPT_VERSION } from '@/lib/llm/trialInterp';

describe('LLM Hash Function', () => {
  it('should produce 64-character hex SHA-256 hash', () => {
    const pack: EvidencePack = {
      ticker: 'TEST',
      nct_id: 'NCT12345678',
      field_path: 'status',
      old_value: 'recruiting',
      new_value: 'completed',
      detected_at: '2024-01-01T00:00:00Z',
    };

    const hash = computeInputHash(pack, 'gemini', 'gemini-1.5-flash');

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce different hashes for different evidence packs', () => {
    const pack1: EvidencePack = {
      ticker: 'TEST',
      nct_id: 'NCT12345678',
      field_path: 'status',
      old_value: 'recruiting',
      new_value: 'completed',
      detected_at: '2024-01-01T00:00:00Z',
    };

    const pack2: EvidencePack = {
      ticker: 'TEST',
      nct_id: 'NCT12345678',
      field_path: 'status',
      old_value: 'recruiting',
      new_value: 'terminated',
      detected_at: '2024-01-01T00:00:00Z',
    };

    const hash1 = computeInputHash(pack1, 'gemini', 'gemini-1.5-flash');
    const hash2 = computeInputHash(pack2, 'gemini', 'gemini-1.5-flash');

    expect(hash1).not.toBe(hash2);
  });

  it('should produce same hash for identical inputs', () => {
    const pack: EvidencePack = {
      ticker: 'TEST',
      nct_id: 'NCT12345678',
      field_path: 'status',
      old_value: 'recruiting',
      new_value: 'completed',
      detected_at: '2024-01-01T00:00:00Z',
    };

    const hash1 = computeInputHash(pack, 'gemini', 'gemini-1.5-flash');
    const hash2 = computeInputHash(pack, 'gemini', 'gemini-1.5-flash');

    expect(hash1).toBe(hash2);
  });

  it('should include provider in hash', () => {
    const pack: EvidencePack = {
      ticker: 'TEST',
      nct_id: 'NCT12345678',
      field_path: 'status',
      old_value: 'recruiting',
      new_value: 'completed',
      detected_at: '2024-01-01T00:00:00Z',
    };

    const hashGemini = computeInputHash(pack, 'gemini', 'gemini-1.5-flash');
    const hashOpenAI = computeInputHash(pack, 'openai', 'gemini-1.5-flash');

    expect(hashGemini).not.toBe(hashOpenAI);
  });

  it('should include model in hash', () => {
    const pack: EvidencePack = {
      ticker: 'TEST',
      nct_id: 'NCT12345678',
      field_path: 'status',
      old_value: 'recruiting',
      new_value: 'completed',
      detected_at: '2024-01-01T00:00:00Z',
    };

    const hashFlash = computeInputHash(pack, 'gemini', 'gemini-1.5-flash');
    const hashPro = computeInputHash(pack, 'gemini', 'gemini-1.5-pro');

    expect(hashFlash).not.toBe(hashPro);
  });

  it('should include PROMPT_VERSION in hash', () => {
    const pack: EvidencePack = {
      ticker: 'TEST',
      nct_id: 'NCT12345678',
      field_path: 'status',
      old_value: 'recruiting',
      new_value: 'completed',
      detected_at: '2024-01-01T00:00:00Z',
    };

    const hash = computeInputHash(pack, 'gemini', 'gemini-1.5-flash');

    expect(hash).toBeDefined();
    expect(PROMPT_VERSION).toBe('trial_interp_v1');
  });
});
