/**
 * API Forge — detection engine.
 *
 * Two jobs:
 *  1. Parse entity definitions out of source text (zod schemas and TS
 *     interfaces — the two shapes used across the incorporated templates).
 *  2. Diff detected entities against known routes to find API gaps.
 */

import {
  ALL_OPERATIONS,
  ApiGap,
  ApiOperation,
  EntityDescriptor,
  EntityField,
  FieldSemantic,
} from './types';

const FREETEXT_HINTS = /desc|note|comment|summary|prompt|bio|body|content|message|about/i;
const ID_HINTS = /^(id|uuid|publicUuid|_id)$|Id$|Uuid$/;
const REF_HINTS = /(Id|Uuid|Key|Ref)$/;
const EMAIL_HINTS = /email/i;
const DATE_HINTS = /(At|Date|Time|On)$|^date/;

/** Classify a field name+type into a semantic bucket. */
export function classifyField(name: string, type: string): FieldSemantic {
  const t = type.toLowerCase();
  if (ID_HINTS.test(name)) return 'id';
  if (EMAIL_HINTS.test(name)) return 'email';
  if (t.includes('date') || DATE_HINTS.test(name)) return 'date';
  if (t.includes('number') || t.includes('int') || t.includes('float')) return 'number';
  if (t.includes('boolean') || t.includes('bool')) return 'boolean';
  if (t.includes('enum') || t.includes('union')) return 'enum';
  if (t.includes('uint8array') || t.includes('buffer') || t.includes('blob') || t.includes('bytea')) return 'binary';
  if (REF_HINTS.test(name)) return 'ref';
  if (FREETEXT_HINTS.test(name)) return 'freetext';
  return 'text';
}

/**
 * Extract fields from zod schema source, e.g.
 *   name: z.string({ ... }),
 *   createdAt: z.date().optional(),
 * Pattern adopted from cloudnative-template's entities-schemas package.
 */
export function parseZodSchema(source: string): EntityField[] {
  const fields: EntityField[] = [];
  const re = /(\w+)\s*:\s*z\.(\w+)\(([^)]*)?\)((?:\.\w+\(\))*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const [, name, zType, , chain] = m;
    if (name === 'z') continue;
    fields.push({
      name,
      type: `z.${zType}`,
      required: !(chain || '').includes('.optional()'),
      semantic: classifyField(name, zType),
    });
  }
  return fields;
}

/**
 * Extract fields from a TS interface body, e.g.
 *   interface User { name: string; age?: number }
 */
export function parseInterface(source: string): EntityField[] {
  const fields: EntityField[] = [];
  const bodyMatch = source.match(/(?:interface|type)\s+\w+\s*(?:=\s*)?\{([\s\S]*?)\}/);
  if (!bodyMatch) return fields;
  const re = /(\w+)(\?)?\s*:\s*([^;,\n]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bodyMatch[1])) !== null) {
    const [, name, optional, type] = m;
    fields.push({
      name,
      type: type.trim(),
      required: !optional,
      semantic: classifyField(name, type),
    });
  }
  return fields;
}

/** Parse an entity from raw source (auto-picks zod vs interface). */
export function parseEntity(name: string, source: string, origin = 'inline'): EntityDescriptor {
  const fields = source.includes('z.') ? parseZodSchema(source) : parseInterface(source);
  return { name, source: origin, fields, coveredOperations: [] };
}

/**
 * Infer which operations existing routes already cover for an entity.
 * Route strings like "GET /tenants", "POST /tenant", "PUT /tenants/:id".
 */
export function coverageFromRoutes(entityName: string, routes: string[]): ApiOperation[] {
  const covered = new Set<ApiOperation>();
  const stem = entityName.toLowerCase().replace(/s$/, '');
  for (const route of routes) {
    const r = route.toLowerCase();
    if (!r.includes(stem)) continue;
    const hasParam = /:(id|uuid)|\{id\}/.test(r);
    if (r.startsWith('get')) covered.add(hasParam ? 'get' : 'list');
    else if (r.startsWith('post')) covered.add(r.includes('query') || r.includes('search') ? 'query' : 'create');
    else if (r.startsWith('put') || r.startsWith('patch')) covered.add('update');
    else if (r.startsWith('delete')) covered.add('delete');
  }
  return [...covered];
}

/** Diff entities against coverage → the gaps the Forge must fill. */
export function detectGaps(entities: EntityDescriptor[], routes: string[] = []): ApiGap[] {
  return entities
    .map((entity) => {
      const covered = new Set([
        ...entity.coveredOperations,
        ...coverageFromRoutes(entity.name, routes),
      ]);
      const missing = ALL_OPERATIONS.filter((op) => !covered.has(op));
      return { entity, missingOperations: missing };
    })
    .filter((gap) => gap.missingOperations.length > 0);
}
