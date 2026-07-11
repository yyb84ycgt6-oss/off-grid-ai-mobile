/**
 * Tool-call executor — the shared adapter between an LLM's function-calling
 * output and the Toolbox (backlog #66).
 *
 * Every AI surface produces the same shape (OpenAI/Anthropic-style tool calls
 * whose function names come from openAiFunctions(): `toolbox_<id>` with
 * hyphens flattened to underscores). This module is the ONE place that maps
 * those names back to tool ids and dispatches through the ToolboxService —
 * no AI app parses or dispatches on its own (single source of truth).
 */
import { toolboxService } from './toolboxService';

export interface AIToolCall {
  /** Function name as emitted by the model, e.g. "toolbox_text_uppercase". */
  name: string;
  /** JSON string or already-parsed object holding { input: string }. */
  arguments: string | { input?: unknown };
}

export interface ToolCallOutcome {
  name: string;
  toolId: string;
  ok: boolean;
  output: string;
  durationMs: number;
}

/** Reverse of openAiFunctions() naming: toolbox_text_uppercase → text-uppercase. */
export function toolIdFromFunctionName(name: string): string | null {
  if (!name.startsWith('toolbox_')) return null;
  return name.slice('toolbox_'.length).replace(/_/g, '-');
}

/**
 * Execute a batch of model tool calls in order and return one outcome per
 * call. Never throws: malformed names/arguments become failed outcomes so an
 * AI loop can feed them straight back to the model as tool results.
 */
export async function runToolCalls(calls: AIToolCall[], caller = 'ai'): Promise<ToolCallOutcome[]> {
  const outcomes: ToolCallOutcome[] = [];
  for (const call of calls) {
    const toolId = toolIdFromFunctionName(call.name ?? '');
    if (!toolId) {
      outcomes.push({ name: call.name ?? '', toolId: '', ok: false, output: `Not a toolbox function: ${call.name}`, durationMs: 0 });
      continue;
    }
    let input: string;
    try {
      const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments || '{}') : (call.arguments ?? {});
      const raw = (args as { input?: unknown }).input;
      input = typeof raw === 'string' ? raw : raw === undefined || raw === null ? '' : String(raw);
    } catch (e) {
      outcomes.push({ name: call.name, toolId, ok: false, output: `Invalid JSON arguments: ${(e as Error).message}`, durationMs: 0 });
      continue;
    }
    const res = await toolboxService.run(toolId, input, caller);
    outcomes.push({ name: call.name, toolId, ok: res.ok, output: res.output, durationMs: res.durationMs });
  }
  return outcomes;
}
