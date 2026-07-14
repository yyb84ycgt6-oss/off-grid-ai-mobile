import fixture from '../../../fixtures/router-fixture-v1.json';
import { validateArtifact } from '../../../../src/services/routerArtifact/validate';
import { compileNano } from '../../../../src/services/routerArtifact/nanoRuntime';
import { routeWithEmbedding } from '../../../../src/services/routerArtifact/embedRuntime';

/**
 * CONTRACT TEST: Python forge ↔ TypeScript runtime parity
 *
 * This test is THE guard against divergence between the Python router
 * forge (jacky) and the TypeScript runtime (off-grid-ai-mobile). Both must
 * produce byte-identical outputs for the same inputs.
 *
 * - Load router-fixture-v1.json (generated once by Python, committed to both repos)
 * - Run every test case through the TypeScript runtime
 * - Assert label exact match + scores within 1e-4 of Python's recorded values
 *
 * This is NOT a mock test. The TS runtime is real; the fixture is the source of truth.
 * If this fails, the runtimes have diverged and MUST be reconciled before shipping.
 */
describe('router-forge contract: Python ↔ TypeScript parity', () => {
  const { artifacts, cases } = fixture as any;

  if (!artifacts || !cases) {
    throw new Error('Invalid fixture: missing artifacts or cases');
  }

  describe('nano router', () => {
    const nanoArtifact = artifacts.nano;
    if (!nanoArtifact) {
      throw new Error('Fixture missing nano artifact');
    }

    const validated = validateArtifact(nanoArtifact);
    const compiled = compileNano(validated.labels, validated.model as any);

    const nanoCases = cases.nano || [];
    nanoCases.forEach((testCase: any, idx: number) => {
      it(`case ${idx}: ${testCase.text}`, () => {
        const result = compiled.route(testCase.text);
        const expected = testCase.expected;

        expect(result.label).toBe(expected.label);
        expect(result.confidence).toBeCloseTo(expected.confidence, 4);

        for (const label of validated.labels) {
          expect(result.scores[label]).toBeCloseTo(expected.scores[label], 4);
        }
      });
    });
  });

  describe('embed router', () => {
    const embedArtifact = artifacts.embed;
    if (!embedArtifact) {
      throw new Error('Fixture missing embed artifact');
    }

    const validated = validateArtifact(embedArtifact);

    /**
     * Embed router requires a query embedding. For contract testing, we use a
     * deterministic fake embedder that produces the same vectors the Python
     * fixture used. This ensures the embed runtime is tested identically.
     */
    const fakeEmbedder = (text: string): number[] => {
      const dims = (validated.model as any).dims;
      const normalized = text.toLowerCase().trim();
      // eslint-disable-next-line no-bitwise
      const seed = normalized.split('').reduce((s, c) => ((s << 5) - s + c.charCodeAt(0)) | 0, 0);

      const values: number[] = [];
      for (let i = 0; i < dims; i++) {
        const x = Math.sin(seed + i) * Math.cos(seed * i);
        values.push(x);
      }

      let sum = 0;
      for (const v of values) {
        sum += v * v;
      }
      const norm = Math.sqrt(sum) || 1;
      return values.map(v => v / norm);
    };

    const embedCases = cases.embed || [];
    embedCases.forEach((testCase: any, idx: number) => {
      it(`case ${idx}: ${testCase.text}`, () => {
        const queryVector = fakeEmbedder(testCase.text);
        const result = routeWithEmbedding(validated.labels, validated.model as any, queryVector);
        const expected = testCase.expected;

        expect(result.label).toBe(expected.label);
        expect(result.confidence).toBeCloseTo(expected.confidence, 4);

        for (const label of validated.labels) {
          expect(result.scores[label]).toBeCloseTo(expected.scores[label], 4);
        }
      });
    });
  });
});
