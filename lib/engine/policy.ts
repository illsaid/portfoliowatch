import yaml from 'js-yaml';
import type { Detection, ParsedPolicy, PolicyEvalResult, PolicyContext, PolicyRule } from './types';

export function parsePolicy(yamlText: string): ParsedPolicy {
  const parsed = yaml.load(yamlText) as Record<string, unknown>;
  const suppression = (parsed.suppression ?? []) as PolicyRule[];
  const hard_alerts = (parsed.hard_alerts ?? []) as PolicyRule[];
  return { suppression, hard_alerts };
}

function matchesCondition(
  detection: Pick<Detection, 'source_tier' | 'change_type' | 'llm_confidence'>,
  condition: Record<string, unknown>,
  ctx: PolicyContext
): boolean {
  for (const [key, value] of Object.entries(condition)) {
    switch (key) {
      case 'source_tier':
        if (detection.source_tier !== value) return false;
        break;

      case 'source_tier_not':
        if ((value as string[]).includes(detection.source_tier)) return false;
        break;

      case 'change_type':
        if (detection.change_type !== value) return false;
        break;

      case 'change_type_in':
        if (!(value as string[]).includes(detection.change_type)) return false;
        break;

      case 'change_type_not':
        if ((value as string[]).includes(detection.change_type)) return false;
        break;

      case 'llm_confidence_lt':
        if (detection.llm_confidence >= (value as number)) return false;
        break;

      case 'time_to_catalyst_days_gt':
        if (ctx.timeToCatalystDays <= (value as number)) return false;
        break;

      case 'market_gap_lte':
        if (ctx.marketGap == null || ctx.marketGap > (value as number)) return false;
        break;

      default:
        break;
    }
  }
  return true;
}

export function evaluateDetection(
  detection: Pick<Detection, 'source_tier' | 'change_type' | 'llm_confidence'>,
  policy: ParsedPolicy,
  ctx: PolicyContext
): PolicyEvalResult {
  for (const rule of policy.hard_alerts) {
    if (matchesCondition(detection, rule.if, ctx)) {
      return { action: 'pause', ruleId: rule.id, ruleLabel: rule.label };
    }
  }

  for (const rule of policy.suppression) {
    if (matchesCondition(detection, rule.if, ctx)) {
      return {
        action: rule.action as 'suppress' | 'quarantine',
        ruleId: rule.id,
        ruleLabel: rule.label,
      };
    }
  }

  return { action: 'allow', ruleId: null, ruleLabel: null };
}
