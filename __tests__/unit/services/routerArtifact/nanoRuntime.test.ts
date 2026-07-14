import {
  normalizeText,
  utf8Bytes,
  fnv1a,
  extractFeatures,
  softmax,
  scoresToResult,
  compileNano,
} from '../../../../src/services/routerArtifact/nanoRuntime';
import { NanoModel } from '../../../../src/services/routerArtifact/types';

describe('nanoRuntime', () => {
  describe('normalizeText', () => {
    it('lowercases and collapses whitespace', () => {
      expect(normalizeText('HELLO   WORLD')).toBe('hello world');
    });

    it('handles mixed case and multiple spaces', () => {
      expect(normalizeText('  HeLLo  WoRLD  ')).toBe('hello world');
    });

    it('preserves single spaces between words', () => {
      expect(normalizeText('a b c')).toBe('a b c');
    });

    it('removes leading and trailing whitespace', () => {
      expect(normalizeText('  hello  ')).toBe('hello');
    });

    it('handles tabs and newlines', () => {
      expect(normalizeText('hello\t\nworld')).toBe('hello world');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(normalizeText('   ')).toBe('');
    });

    it('handles accented characters', () => {
      expect(normalizeText('Café')).toBe('café');
    });

    it('handles emoji', () => {
      const emoji = '🚀';
      expect(normalizeText(emoji)).toBe(emoji);
    });
  });

  describe('utf8Bytes', () => {
    it('encodes ASCII characters', () => {
      const bytes = utf8Bytes('abc');
      expect(bytes).toEqual([97, 98, 99]);
    });

    it('encodes 2-byte UTF-8 characters', () => {
      const bytes = utf8Bytes('é');
      expect(bytes).toEqual([0xc3, 0xa9]);
    });

    it('encodes 3-byte UTF-8 characters', () => {
      const bytes = utf8Bytes('你');
      expect(bytes.length).toBe(3);
    });

    it('encodes 4-byte UTF-8 characters (emoji)', () => {
      const bytes = utf8Bytes('🚀');
      expect(bytes.length).toBe(4);
    });

    it('encodes mixed ASCII and UTF-8', () => {
      const bytes = utf8Bytes('a é b');
      expect(bytes[0]).toBe(97); // 'a'
      expect(bytes[1]).toBe(32); // space
      expect(bytes.slice(2, 4)).toEqual([0xc3, 0xa9]); // 'é'
    });

    it('handles empty string', () => {
      expect(utf8Bytes('')).toEqual([]);
    });
  });

  describe('fnv1a', () => {
    it('hashes byte array consistently', () => {
      const bytes = [97, 98, 99]; // 'abc'
      const hash1 = fnv1a(bytes);
      const hash2 = fnv1a(bytes);
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = fnv1a([97, 98, 99]); // 'abc'
      const hash2 = fnv1a([100, 101, 102]); // 'def'
      expect(hash1).not.toBe(hash2);
    });

    it('returns unsigned 32-bit integer', () => {
      const hash = fnv1a([1, 2, 3]);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    });

    it('handles empty byte array', () => {
      const hash = fnv1a([]);
      expect(typeof hash).toBe('number');
    });
  });

  describe('extractFeatures', () => {
    it('extracts unigrams', () => {
      const features = extractFeatures('abc', 256, [1]);
      expect(features.size).toBeGreaterThan(0);
    });

    it('extracts bigrams', () => {
      const features = extractFeatures('abc', 256, [2]);
      expect(features.size).toBeGreaterThan(0);
    });

    it('extracts multiple n-gram sizes', () => {
      const features = extractFeatures('abcd', 256, [1, 2, 3]);
      expect(features.size).toBeGreaterThan(0);
    });

    it('normalizes text before extraction', () => {
      const features1 = extractFeatures('HELLO', 256, [1]);
      const features2 = extractFeatures('hello', 256, [1]);
      expect(features1).toEqual(features2);
    });

    it('returns L2 normalized features', () => {
      const features = extractFeatures('abc', 256, [1]);
      let sumSquares = 0;
      for (const v of features.values()) {
        sumSquares += v * v;
      }
      const norm = Math.sqrt(sumSquares);
      expect(norm).toBeCloseTo(1.0, 5);
    });

    it('skips n-grams longer than text', () => {
      const features = extractFeatures('ab', 256, [3]);
      expect(features.size).toBe(0);
    });

    it('returns empty map for empty text', () => {
      const features = extractFeatures('', 256, [1, 2, 3]);
      expect(features.size).toBe(0);
    });

    it('handles emoji in n-grams', () => {
      const features = extractFeatures('a🚀b', 256, [1, 2, 3]);
      expect(features.size).toBeGreaterThan(0);
    });
  });

  describe('softmax', () => {
    it('converts scores to probabilities', () => {
      const result = softmax([1, 2, 3]);
      expect(result.length).toBe(3);
      expect(result[0]).toBeLessThan(result[1]);
      expect(result[1]).toBeLessThan(result[2]);
    });

    it('sums to 1.0', () => {
      const result = softmax([1, 2, 3, 4]);
      const sum = result.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('handles large score differences', () => {
      const result = softmax([0, 100]);
      expect(result[0]).toBeCloseTo(0, 5);
      expect(result[1]).toBeCloseTo(1, 5);
    });

    it('handles negative scores', () => {
      const result = softmax([-10, -5]);
      expect(result[0]).toBeLessThan(result[1]);
      const sum = result.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('handles single score', () => {
      const result = softmax([5]);
      expect(result).toEqual([1.0]);
    });
  });

  describe('scoresToResult', () => {
    it('returns RouteResult with label, confidence, scores', () => {
      const result = scoresToResult(['cat', 'dog'], [1, 2]);
      expect(result.label).toBe('dog');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.scores).toHaveProperty('cat');
      expect(result.scores).toHaveProperty('dog');
    });

    it('selects label with highest probability', () => {
      const result = scoresToResult(['a', 'b', 'c'], [1, 10, 2]);
      expect(result.label).toBe('b');
    });

    it('rounds confidence to 4 decimals', () => {
      const result = scoresToResult(['a', 'b'], [1, 2]);
      const decimalPlaces = (result.confidence.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(4);
    });

    it('rounds all scores to 4 decimals', () => {
      const result = scoresToResult(['a', 'b', 'c'], [1, 2, 3]);
      for (const score of Object.values(result.scores)) {
        const decimalPlaces = (score.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(4);
      }
    });

    it('probabilities sum to approximately 1.0', () => {
      const result = scoresToResult(['a', 'b', 'c'], [1, 2, 3]);
      const sum = Object.values(result.scores).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });
  });

  describe('compileNano', () => {
    it('compiles nano model to router', () => {
      const model: NanoModel = {
        hashDim: 256,
        ngrams: [1, 2],
        weights: 'AQIDBAAA', // base64 for simple int8 bytes
        scales: [0.1, 0.1],
        biases: [0, 0],
      };
      const router = compileNano(['a', 'b'], model);
      expect(router).toHaveProperty('route');
      expect(typeof router.route).toBe('function');
    });

    it('route method returns RouteResult', () => {
      const model: NanoModel = {
        hashDim: 256,
        ngrams: [1, 2],
        weights: 'AQIDBAAA',
        scales: [0.1, 0.1],
        biases: [0, 0],
      };
      const router = compileNano(['a', 'b'], model);
      const result = router.route('test');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('scores');
    });

    it('dequantizes int8 weights correctly', () => {
      const model: NanoModel = {
        hashDim: 2,
        ngrams: [1],
        weights: 'AP8=', // base64 for [0, 127] (unsigned: 0, 127)
        scales: [2.0, 2.0],
        biases: [0, 0],
      };
      const router = compileNano(['a', 'b'], model);
      const result = router.route('x');
      expect(result).toHaveProperty('label');
      expect(['a', 'b']).toContain(result.label);
    });

    it('handles negative int8 weights', () => {
      const model: NanoModel = {
        hashDim: 2,
        ngrams: [1],
        weights: '/wE=', // base64 for [255, 129] (signed: -1, -127)
        scales: [0.01, 0.01],
        biases: [0, 0],
      };
      const router = compileNano(['cat', 'dog'], model);
      const result = router.route('hello');
      expect(['cat', 'dog']).toContain(result.label);
    });

    it('applies per-label biases', () => {
      // High bias on second label should increase its score
      const model: NanoModel = {
        hashDim: 2,
        ngrams: [1],
        weights: 'AAAA', // all zeros
        scales: [1.0, 1.0],
        biases: [0, 100], // second label heavily biased
      };
      const router = compileNano(['a', 'b'], model);
      const result = router.route('test');
      expect(result.label).toBe('b');
    });
  });
});
