import { generateJSON, getDefaultProvider, getDefaultModel, type LLMProvider } from './provider';
import type { Detection } from '@/lib/engine/types';

export const PROMPT_VERSION = 'trial_interp_v1';

export interface EvidencePack {
  ticker: string;
  nct_id: string;
  field_path: string;
  old_value: string | null;
  new_value: string | null;
  official_title?: string;
  condition?: string;
  phase?: string;
  detected_at: string;
}

export interface TrialInterpretation {
  why_it_matters: string[];
  benign_explanation: string;
  bear_case: string;
  next_checks: string[];
  noise_flag: 'low' | 'medium' | 'high';
  confidence: number;
}

interface TrialMeta {
  official_title?: string;
  condition?: string;
  phase?: string;
}

function truncateValue(val: string | null | undefined, maxLen = 200): string | null {
  if (!val) return null;
  if (val.length <= maxLen) return val;
  return val.slice(0, maxLen) + '...';
}

export function buildEvidencePack(
  detection: Detection,
  trialMeta?: TrialMeta | null
): EvidencePack {
  return {
    ticker: detection.ticker,
    nct_id: detection.nct_id ?? '',
    field_path: detection.field_path ?? '',
    old_value: truncateValue(detection.old_value),
    new_value: truncateValue(detection.new_value),
    official_title: trialMeta?.official_title,
    condition: trialMeta?.condition,
    phase: trialMeta?.phase,
    detected_at: detection.detected_at,
  };
}

const SYSTEM_PROMPT = `You are a biotech trial-change interpreter for investors. Use ONLY the provided evidence pack to analyze the significance of a clinical trial record change. If information is missing, acknowledge it. Do not invent facts or speculate beyond the evidence.

Output STRICT JSON only with this exact schema:
{
  "why_it_matters": ["string", "string", ...],  // 2-4 short bullets
  "benign_explanation": "string",                // innocent reason for change
  "bear_case": "string",                         // negative interpretation
  "next_checks": ["string", "string", ...],      // 2-3 action items
  "noise_flag": "low" | "medium" | "high",       // likelihood this is admin noise
  "confidence": 0.0 to 1.0                       // material significance vs admin churn
}`;

function buildUserPrompt(pack: EvidencePack): string {
  const lines = [
    'Analyze this clinical trial record change:',
    '',
    `Ticker: ${pack.ticker}`,
    `NCT ID: ${pack.nct_id}`,
    `Field Changed: ${pack.field_path}`,
    `Old Value: ${pack.old_value ?? '(none)'}`,
    `New Value: ${pack.new_value ?? '(none)'}`,
  ];

  if (pack.official_title) lines.push(`Trial Title: ${pack.official_title}`);
  if (pack.condition) lines.push(`Condition: ${pack.condition}`);
  if (pack.phase) lines.push(`Phase: ${pack.phase}`);
  lines.push(`Detected At: ${pack.detected_at}`);

  lines.push('');
  lines.push('Provide your analysis as JSON.');

  return lines.join('\n');
}

export function buildFallbackInterpretation(fieldPath: string): TrialInterpretation {
  return {
    why_it_matters: [
      `Trial record changed: ${fieldPath}`,
      'Review context in CT.gov for details',
    ],
    benign_explanation: 'Could be routine administrative update',
    bear_case: 'May indicate substantive change to trial conduct',
    next_checks: [
      'Check CT.gov history tab',
      'Review company press releases',
    ],
    noise_flag: 'high',
    confidence: 0.2,
  };
}

function validateInterpretation(obj: unknown): TrialInterpretation | null {
  if (!obj || typeof obj !== 'object') return null;

  const o = obj as Record<string, unknown>;

  if (!Array.isArray(o.why_it_matters) || o.why_it_matters.length < 1) return null;
  if (typeof o.benign_explanation !== 'string') return null;
  if (typeof o.bear_case !== 'string') return null;
  if (!Array.isArray(o.next_checks) || o.next_checks.length < 1) return null;

  const validNoiseFlags = ['low', 'medium', 'high'];
  if (!validNoiseFlags.includes(o.noise_flag as string)) {
    o.noise_flag = 'medium';
  }

  let confidence = typeof o.confidence === 'number' ? o.confidence : 0.5;
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;
  o.confidence = confidence;

  return {
    why_it_matters: o.why_it_matters.map(String).slice(0, 4),
    benign_explanation: String(o.benign_explanation),
    bear_case: String(o.bear_case),
    next_checks: o.next_checks.map(String).slice(0, 3),
    noise_flag: o.noise_flag as 'low' | 'medium' | 'high',
    confidence,
  };
}

export async function interpretTrial(
  detection: Detection,
  trialMeta?: TrialMeta | null
): Promise<{ interpretation: TrialInterpretation; provider: LLMProvider; model: string }> {
  const provider = getDefaultProvider();
  const model = getDefaultModel(provider);

  const pack = buildEvidencePack(detection, trialMeta);
  const userPrompt = buildUserPrompt(pack);

  const result = await generateJSON({
    provider,
    model,
    system: SYSTEM_PROMPT,
    user: userPrompt,
    temperature: 0.2,
  });

  const validated = validateInterpretation(result);
  if (!validated) {
    return {
      interpretation: buildFallbackInterpretation(detection.field_path ?? 'unknown'),
      provider,
      model,
    };
  }

  return { interpretation: validated, provider, model };
}

export function computeInputHash(
  pack: EvidencePack,
  provider: string,
  model: string
): string {
  const payload = JSON.stringify({ pack, provider, model, version: PROMPT_VERSION });
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${PROMPT_VERSION}_${hex}`;
}
