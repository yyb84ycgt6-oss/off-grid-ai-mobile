/**
 * ToolboxService — the single owning seam for the global tool registry.
 *
 * Every surface (the Toolbox UI, Jackie, Eru, any AI) depends on THIS interface,
 * never on a concrete pack or tool. Packs register here once; callers run tools
 * by id through `run()`. The service owns:
 *   - the registry (id → tool)
 *   - installed-state persistence (localStorage, offline)
 *   - the usage log (who ran what, when)
 *   - the AI-facing manifest + dispatch used by window.CyberneticToolbox
 *
 * Adding a new tool or pack requires zero changes to any caller (OCP).
 */
import {
  ToolboxTool,
  ToolCategory,
  ToolResult,
  ToolUsageEntry,
  AIManifestEntry,
  ToolboxStats,
  TOOL_CATEGORY_LABELS,
} from './types';
import { textPack } from './packs/textPack';
import { encodePack } from './packs/encodePack';
import { cryptoPack } from './packs/cryptoPack';
import { convertPack } from './packs/convertPack';
import { mathPack } from './packs/mathPack';
import { devPack } from './packs/devPack';
import { colorPack } from './packs/colorPack';
import { datetimePack } from './packs/datetimePack';
import { networkPack } from './packs/networkPack';
import { generatePack } from './packs/generatePack';
import { financePack } from './packs/financePack';
import { healthPack } from './packs/healthPack';
import { geoPack } from './packs/geoPack';
import { sciencePack } from './packs/sciencePack';
import { electronicsPack } from './packs/electronicsPack';
import { musicPack } from './packs/musicPack';
import { dataPack } from './packs/dataPack';
import { gamingPack } from './packs/gamingPack';
import { writingPack } from './packs/writingPack';
import { cookingPack } from './packs/cookingPack';
import { logicPack } from './packs/logicPack';
import { randomPack } from './packs/randomPack';
import { seoPack } from './packs/seoPack';
import { autoPack } from './packs/autoPack';
import { constructionPack } from './packs/constructionPack';

const INSTALL_KEY = 'cybernetic_toolbox_installed';
const USAGE_KEY = 'cybernetic_toolbox_usage';
const MACRO_KEY = 'cybernetic_toolbox_macros';
const MAX_USAGE = 200;

/** A saved pipeline: run tools in order, each output feeding the next input. */
export interface ToolboxMacro {
  name: string;
  toolIds: string[];
  createdAt: number;
}

export interface ChainStepResult {
  toolId: string;
  ok: boolean;
  output: string;
}

export type ToolboxListener = () => void;

export class ToolboxService {
  private registry = new Map<string, ToolboxTool>();
  private installed = new Set<string>();
  private usage: ToolUsageEntry[] = [];
  private macros: ToolboxMacro[] = [];
  private listeners = new Set<ToolboxListener>();

  constructor(packs: ToolboxTool[][] = [
    textPack, encodePack, cryptoPack, convertPack, mathPack,
    devPack, colorPack, datetimePack, networkPack, generatePack, financePack,
    healthPack, geoPack, sciencePack, electronicsPack, musicPack, dataPack,
    gamingPack, writingPack, cookingPack, logicPack, randomPack, seoPack,
    autoPack, constructionPack,
  ]) {
    packs.forEach((pack) => this.registerPack(pack));
    this.installed = new Set(this.loadJson(INSTALL_KEY, [] as string[]).filter((id) => this.registry.has(id)));
    this.usage = this.loadJson(USAGE_KEY, [] as ToolUsageEntry[]);
    this.macros = this.loadJson(MACRO_KEY, [] as ToolboxMacro[]).filter((m) => m.toolIds.every((id) => this.registry.has(id)));
  }

  // ── Registration ──────────────────────────────────────────────
  registerPack(pack: ToolboxTool[]): void {
    pack.forEach((tool) => {
      if (this.registry.has(tool.id)) {
        throw new Error(`Duplicate tool id: ${tool.id}`);
      }
      this.registry.set(tool.id, tool);
    });
  }

  // ── Queries (read-only projection for the View) ───────────────
  list(): ToolboxTool[] {
    return [...this.registry.values()];
  }

  get(id: string): ToolboxTool | undefined {
    return this.registry.get(id);
  }

  categories(): ToolCategory[] {
    const present = new Set<ToolCategory>();
    this.registry.forEach((t) => present.add(t.category));
    return (Object.keys(TOOL_CATEGORY_LABELS) as ToolCategory[]).filter((c) => present.has(c));
  }

  byCategory(category: ToolCategory): ToolboxTool[] {
    return this.list().filter((t) => t.category === category);
  }

  /** Free-text search over name, description, tags, and category label. */
  search(query: string): ToolboxTool[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.list();
    const terms = q.split(/\s+/);
    return this.list().filter((t) => {
      const hay = `${t.name} ${t.description} ${t.tags.join(' ')} ${TOOL_CATEGORY_LABELS[t.category]}`.toLowerCase();
      return terms.every((term) => hay.includes(term));
    });
  }

  // ── Installed set (home-screen / favorites) ───────────────────
  isInstalled(id: string): boolean {
    return this.installed.has(id);
  }

  getInstalled(): ToolboxTool[] {
    return [...this.installed].map((id) => this.registry.get(id)).filter(Boolean) as ToolboxTool[];
  }

  install(id: string): void {
    if (!this.registry.has(id) || this.installed.has(id)) return;
    this.installed.add(id);
    this.persistInstalled();
    this.emit();
  }

  uninstall(id: string): void {
    if (this.installed.delete(id)) {
      this.persistInstalled();
      this.emit();
    }
  }

  toggleInstall(id: string): void {
    this.installed.has(id) ? this.uninstall(id) : this.install(id);
  }

  // ── Execution (the one uniform entry point) ───────────────────
  async run(id: string, input: string, caller = 'user'): Promise<ToolResult> {
    const tool = this.registry.get(id);
    const started = Date.now();
    if (!tool) {
      const result: ToolResult = { ok: false, toolId: id, output: `Unknown tool: ${id}`, durationMs: 0, timestamp: started };
      return result;
    }
    let output: string;
    let ok = true;
    try {
      output = await tool.run(input ?? '');
    } catch (e) {
      ok = false;
      output = `Error: ${(e as Error).message}`;
    }
    const result: ToolResult = { ok, toolId: id, output, durationMs: Date.now() - started, timestamp: started };
    this.recordUsage({ toolId: id, toolName: tool.name, ok, timestamp: started, caller });
    return result;
  }

  /**
   * Batch mode: run one tool over every line of the input independently
   * (map, not reduce). Blank lines are preserved as blanks in the output.
   */
  async runBatch(id: string, multilineInput: string, caller = 'user'): Promise<ToolResult> {
    const started = Date.now();
    if (!this.registry.has(id)) {
      return { ok: false, toolId: id, output: `Unknown tool: ${id}`, durationMs: 0, timestamp: started };
    }
    const lines = (multilineInput ?? '').split(/\r?\n/);
    const outputs: string[] = [];
    let allOk = true;
    for (const line of lines) {
      if (line.trim() === '') { outputs.push(''); continue; }
      const res = await this.run(id, line, caller);
      if (!res.ok) allOk = false;
      outputs.push(res.output);
    }
    return { ok: allOk, toolId: id, output: outputs.join('\n'), durationMs: Date.now() - started, timestamp: started };
  }

  /**
   * Chain mode: pipe one input through a sequence of tools — each tool's
   * output becomes the next tool's input. Stops at the first failure.
   */
  async runChain(ids: string[], input: string, caller = 'user'): Promise<{ ok: boolean; output: string; steps: ChainStepResult[] }> {
    const steps: ChainStepResult[] = [];
    let current = input ?? '';
    for (const id of ids) {
      const res = await this.run(id, current, caller);
      steps.push({ toolId: id, ok: res.ok, output: res.output });
      if (!res.ok) return { ok: false, output: res.output, steps };
      current = res.output;
    }
    return { ok: true, output: current, steps };
  }

  // ── Macros (named saved chains, persisted offline) ────────────
  getMacros(): ToolboxMacro[] {
    return [...this.macros];
  }

  saveMacro(name: string, toolIds: string[]): string | null {
    const clean = name.trim();
    if (!clean) return 'Macro needs a name.';
    if (!toolIds.length) return 'Macro needs at least one tool.';
    const missing = toolIds.filter((id) => !this.registry.has(id));
    if (missing.length) return `Unknown tool(s): ${missing.join(', ')}`;
    this.macros = this.macros.filter((m) => m.name !== clean);
    this.macros.push({ name: clean, toolIds: [...toolIds], createdAt: Date.now() });
    this.persist(MACRO_KEY, this.macros);
    this.emit();
    return null;
  }

  deleteMacro(name: string): void {
    const before = this.macros.length;
    this.macros = this.macros.filter((m) => m.name !== name);
    if (this.macros.length !== before) {
      this.persist(MACRO_KEY, this.macros);
      this.emit();
    }
  }

  async runMacro(name: string, input: string, caller = 'user'): Promise<{ ok: boolean; output: string; steps: ChainStepResult[] }> {
    const macro = this.macros.find((m) => m.name === name);
    if (!macro) return { ok: false, output: `Unknown macro: ${name}`, steps: [] };
    return this.runChain(macro.toolIds, input, caller);
  }

  // ── Usage log ─────────────────────────────────────────────────
  getUsage(): ToolUsageEntry[] {
    return [...this.usage];
  }

  clearUsage(): void {
    this.usage = [];
    this.persist(USAGE_KEY, this.usage);
    this.emit();
  }

  private recordUsage(entry: ToolUsageEntry): void {
    this.usage.unshift(entry);
    if (this.usage.length > MAX_USAGE) this.usage.length = MAX_USAGE;
    this.persist(USAGE_KEY, this.usage);
    this.emit();
  }

  // ── AI-facing surface (global accessibility) ──────────────────
  /** Compact manifest an AI can read to discover every available tool. */
  getAIManifest(): AIManifestEntry[] {
    return this.list().map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      inputHint: t.inputHint,
    }));
  }

  stats(): ToolboxStats {
    const perCategory: Record<string, number> = {};
    this.categories().forEach((c) => (perCategory[c] = this.byCategory(c).length));
    return {
      totalTools: this.registry.size,
      installedTools: this.installed.size,
      categories: this.categories().length,
      perCategory,
      totalRuns: this.usage.length,
    };
  }

  // ── Subscription (thin reactive projection) ───────────────────
  subscribe(listener: ToolboxListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  // ── Persistence helpers (offline-first, guarded) ──────────────
  private persistInstalled(): void {
    this.persist(INSTALL_KEY, [...this.installed]);
  }

  private persist(key: string, value: unknown): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or unavailable — stay in memory */
    }
  }

  private loadJson<T>(key: string, fallback: T): T {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }
}

/** App-wide singleton. Every AI and the UI share this one instance. */
export const toolboxService = new ToolboxService();
