/**
 * Global Toolbox — Type Contracts
 * Every tool is a compressed "seed" (Jackie toolbox lineage): tiny definition,
 * executed on demand, fully offline, free public access, and globally
 * accessible by every AI surface in the OS via window.CyberneticToolbox.
 */

export type ToolCategory =
  | 'text'
  | 'encode'
  | 'crypto'
  | 'convert'
  | 'math'
  | 'dev'
  | 'color'
  | 'datetime'
  | 'network'
  | 'generate'
  | 'finance'
  | 'health'
  | 'geo'
  | 'science'
  | 'electronics'
  | 'music'
  | 'data'
  | 'gaming'
  | 'writing'
  | 'cooking'
  | 'logic'
  | 'random'
  | 'seo'
  | 'auto'
  | 'construction';

export const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
  text: 'Text Ops',
  encode: 'Encoders & Ciphers',
  crypto: 'Hashing & Crypto',
  convert: 'Unit Converters',
  math: 'Math & Numbers',
  dev: 'Developer Tools',
  color: 'Color Lab',
  datetime: 'Date & Time',
  network: 'Network Calc',
  generate: 'Generators',
  finance: 'Finance Calc',
  health: 'Health & Fitness',
  geo: 'Geo & Maps',
  science: 'Science Lab',
  electronics: 'Electronics Bench',
  music: 'Music & Audio',
  data: 'Data Wrangling',
  gaming: 'Games & Dice',
  writing: 'Writing Studio',
  cooking: 'Kitchen Calc',
  logic: 'Logic & Bits',
  random: 'Randomizers',
  seo: 'Web & SEO',
  auto: 'Automotive',
  construction: 'Home & DIY',
};

export interface ToolboxTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  tags: string[];
  /** What to type into the input box. Multi-argument tools use `::` separators. */
  inputHint: string;
  /** Optional example input the UI can auto-fill. */
  example?: string;
  /** Compression-pod aesthetic: dormant seed footprint. */
  seedSize: string;
  /** Every tool in the global toolbox is free for public use. */
  access: 'free';
  /** Pure, offline execution. May be async (WebCrypto digests). */
  run: (input: string) => string | Promise<string>;
}

export interface ToolResult {
  ok: boolean;
  toolId: string;
  output: string;
  durationMs: number;
  timestamp: number;
}

export interface ToolUsageEntry {
  toolId: string;
  toolName: string;
  ok: boolean;
  timestamp: number;
  /** Which surface ran it: 'user' (Toolbox UI) or an AI identifier. */
  caller: string;
}

export interface AIManifestEntry {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  inputHint: string;
}

export interface ToolboxStats {
  totalTools: number;
  installedTools: number;
  categories: number;
  perCategory: Record<string, number>;
  totalRuns: number;
}
