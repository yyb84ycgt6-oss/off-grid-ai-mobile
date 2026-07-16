/**
 * API Forge — the bot-vs-miniAI decision engine.
 *
 * Deterministic, explainable heuristics. An entity whose fields are all
 * flat and structured gets a bot script (cheap, predictable CRUD). An
 * entity that carries natural language, many relations, or query needs
 * gets a mini AI (LLM-backed adapter through the Free AI router).
 */

import { ApiGap, ForgeDecision } from './types';

/** Score ≥ this threshold → mini-ai. */
export const MINI_AI_THRESHOLD = 0.4;

export function decide(gap: ApiGap): ForgeDecision {
  const { entity, missingOperations } = gap;
  const reasons: string[] = [];
  let score = 0;

  const freetext = entity.fields.filter((f) => f.semantic === 'freetext');
  if (freetext.length > 0) {
    score += 0.35 * Math.min(freetext.length, 2);
    reasons.push(
      `${freetext.length} natural-language field(s) (${freetext.map((f) => f.name).join(', ')}) benefit from semantic handling`,
    );
  }

  const refs = entity.fields.filter((f) => f.semantic === 'ref');
  if (refs.length >= 2) {
    score += 0.2;
    reasons.push(`${refs.length} relations — cross-entity reasoning likely`);
  }

  if (missingOperations.includes('query')) {
    score += 0.15;
    reasons.push('needs a query/search surface — language-driven filtering fits');
  }

  if (entity.fields.length > 10) {
    score += 0.1;
    reasons.push(`wide entity (${entity.fields.length} fields)`);
  }

  const binary = entity.fields.some((f) => f.semantic === 'binary');
  if (binary) {
    score -= 0.3;
    reasons.push('binary payloads present — deterministic handling is safer');
  }

  score = Math.max(0, Math.min(1, score));
  const verdict = score >= MINI_AI_THRESHOLD ? 'mini-ai' : 'bot-script';

  if (reasons.length === 0) {
    reasons.push('flat structured fields, plain CRUD — a bot script is sufficient');
  }

  return { entity: entity.name, verdict, aiScore: Number(score.toFixed(2)), reasons };
}

export function decideAll(gaps: ApiGap[]): ForgeDecision[] {
  return gaps.map(decide);
}
