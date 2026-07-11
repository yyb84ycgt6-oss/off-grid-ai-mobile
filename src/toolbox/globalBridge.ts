/**
 * Global Toolbox Bridge — makes the toolbox accessible to EVERY AI in the app.
 *
 * Any AI surface (Jackie, Eru, Ollama, the LLM environment, function-calling
 * kitchens) can, without importing anything, call:
 *
 *   window.CyberneticToolbox.list()               → AI manifest of every tool
 *   window.CyberneticToolbox.search('base64')     → matching tools
 *   await window.CyberneticToolbox.run(id, input) → execute a tool offline
 *   window.CyberneticToolbox.openAiFunctions()    → OpenAI-style function specs
 *
 * This is the single dispatch point (DIP): AIs depend on this stable contract,
 * never on individual packs. Everything runs locally — no network egress.
 */
import { toolboxService, ChainStepResult, ToolboxMacro } from './toolboxService';
import { runToolCalls, AIToolCall, ToolCallOutcome } from './toolCallExecutor';
import { AIManifestEntry } from './types';

export interface OpenAIFunctionSpec {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: { input: { type: 'string'; description: string } };
    required: string[];
  };
}

export interface CyberneticToolboxGlobal {
  /** Every tool as a compact manifest an AI can reason over. */
  list: () => AIManifestEntry[];
  /** Search tools by keyword(s). */
  search: (query: string) => AIManifestEntry[];
  /** Execute a tool by id with a single string input. Returns the output text. */
  run: (id: string, input: string, caller?: string) => Promise<string>;
  /** Execute and return the full structured result. */
  runDetailed: (id: string, input: string, caller?: string) => Promise<{ ok: boolean; output: string; durationMs: number }>;
  /** Tool ids grouped by category, for menu building. */
  categories: () => Record<string, AIManifestEntry[]>;
  /** OpenAI/Anthropic-style function specs for tool-calling loops. */
  openAiFunctions: () => OpenAIFunctionSpec[];
  /** Count of registered tools. */
  count: () => number;
  /** Human-readable capability summary an AI can paste into its context. */
  describe: () => string;
  /** Batch: run one tool over every line of the input (map). */
  batch: (id: string, multilineInput: string, caller?: string) => Promise<string>;
  /** Chain: pipe input through tools in order; each output feeds the next. */
  chain: (ids: string[], input: string, caller?: string) => Promise<{ ok: boolean; output: string; steps: ChainStepResult[] }>;
  /** Saved macros — named chains any AI can create, list, run, delete. */
  macros: {
    list: () => ToolboxMacro[];
    save: (name: string, toolIds: string[]) => string | null;
    run: (name: string, input: string, caller?: string) => Promise<{ ok: boolean; output: string; steps: ChainStepResult[] }>;
    remove: (name: string) => void;
  };
  /** Execute OpenAI-style tool calls (names from openAiFunctions()) in one shot. */
  executeToolCalls: (calls: AIToolCall[], caller?: string) => Promise<ToolCallOutcome[]>;
}

const buildGlobal = (): CyberneticToolboxGlobal => ({
  list: () => toolboxService.getAIManifest(),

  search: (query: string) =>
    toolboxService.search(query).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      inputHint: t.inputHint,
    })),

  run: async (id: string, input: string, caller = 'ai') => {
    const result = await toolboxService.run(id, input, caller);
    return result.output;
  },

  runDetailed: async (id: string, input: string, caller = 'ai') => {
    const result = await toolboxService.run(id, input, caller);
    return { ok: result.ok, output: result.output, durationMs: result.durationMs };
  },

  categories: () => {
    const out: Record<string, AIManifestEntry[]> = {};
    toolboxService.categories().forEach((c) => {
      out[c] = toolboxService.byCategory(c).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        inputHint: t.inputHint,
      }));
    });
    return out;
  },

  openAiFunctions: () =>
    toolboxService.list().map((t) => ({
      name: `toolbox_${t.id.replace(/-/g, '_')}`,
      description: `${t.description} (input format: ${t.inputHint})`,
      parameters: {
        type: 'object' as const,
        properties: {
          input: { type: 'string' as const, description: t.inputHint },
        },
        required: ['input'],
      },
    })),

  count: () => toolboxService.stats().totalTools,

  batch: async (id: string, multilineInput: string, caller = 'ai') => {
    const result = await toolboxService.runBatch(id, multilineInput, caller);
    return result.output;
  },

  chain: (ids: string[], input: string, caller = 'ai') => toolboxService.runChain(ids, input, caller),

  macros: {
    list: () => toolboxService.getMacros(),
    save: (name: string, toolIds: string[]) => toolboxService.saveMacro(name, toolIds),
    run: (name: string, input: string, caller = 'ai') => toolboxService.runMacro(name, input, caller),
    remove: (name: string) => toolboxService.deleteMacro(name),
  },

  executeToolCalls: (calls: AIToolCall[], caller = 'ai') => runToolCalls(calls, caller),

  describe: () => {
    const stats = toolboxService.stats();
    const lines = toolboxService
      .categories()
      .map((c) => `  - ${c}: ${stats.perCategory[c]} tools`);
    return [
      `Cybernetic Toolbox — ${stats.totalTools} offline tools across ${stats.categories} categories.`,
      'All tools run locally on-device with zero network calls. Call window.CyberneticToolbox.run(id, input).',
      'Also: batch(id, lines) maps a tool over every line; chain([ids], input) pipes tools together;',
      'macros.save/list/run/remove manage named pipelines that persist offline.',
      ...lines,
    ].join('\n');
  },
});

/**
 * Install the toolbox onto the global object so every AI can reach it.
 * Idempotent and SSR-safe. Call once at app startup.
 */
export function installGlobalToolbox(): CyberneticToolboxGlobal {
  const api = buildGlobal();
  if (typeof window !== 'undefined') {
    (window as unknown as { CyberneticToolbox: CyberneticToolboxGlobal }).CyberneticToolbox = api;
    (window as unknown as { toolboxService: typeof toolboxService }).toolboxService = toolboxService;
  }
  return api;
}
