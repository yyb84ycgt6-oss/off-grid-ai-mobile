import { decodeBase64 } from '../../../../src/services/routerArtifact/base64';
import { RouterArtifactError } from '../../../../src/services/routerArtifact/types';

describe('base64', () => {
  describe('decodeBase64', () => {
    it('decodes simple ASCII', () => {
      const result = decodeBase64('SGVsbG8=');
      expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]); // "Hello"
    });

    it('decodes without padding', () => {
      const result = decodeBase64('SGVsbG8');
      expect(result.length).toBeGreaterThan(0);
    });

    it('decodes with single padding', () => {
      const result = decodeBase64('SGVsbG8h');
      expect(result.length).toBeGreaterThan(0);
    });

    it('decodes with double padding', () => {
      const result = decodeBase64('SGVsbA==');
      expect(result.length).toBeGreaterThan(0);
    });

    it('removes padding before processing', () => {
      const withPadding = decodeBase64('SGVsbG8=');
      const withoutPadding = decodeBase64('SGVsbG8');
      expect(withPadding.length).toBeGreaterThan(0);
      expect(withoutPadding.length).toBeGreaterThan(0);
    });

    it('decodes empty string', () => {
      const result = decodeBase64('');
      expect(result.length).toBe(0);
    });

    it('handles standard base64 alphabet', () => {
      // "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
      const result = decodeBase64('/+/+/w==');
      expect(result.length).toBeGreaterThan(0);
    });

    it('rejects invalid base64 characters', () => {
      expect(() => decodeBase64('SGVs!G8=')).toThrow(RouterArtifactError);
    });

    it('rejects non-alphabet characters', () => {
      expect(() => decodeBase64('SGVs@G8=')).toThrow(RouterArtifactError);
    });

    it('rejects truncated base64 (no second character)', () => {
      expect(() => decodeBase64('S')).toThrow(RouterArtifactError);
    });

    it('handles complete 4-character groups', () => {
      // 4 complete groups of 4 chars
      const result = decodeBase64('SGVsbG8gV29ybGQ=');
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles whitespace edge case (validates clean input)', () => {
      // Base64 decoder expects clean input - spaces are invalid
      expect(() => decodeBase64('SGVs bG8=')).toThrow(RouterArtifactError);
    });

    it('produces Uint8Array', () => {
      const result = decodeBase64('SGVsbG8=');
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('decodes 3-byte groups correctly', () => {
      // 3 bytes = 24 bits = 4 base64 chars
      const result = decodeBase64('AQIDBA==');
      expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    });

    it('decodes with partial final group (2 chars + padding)', () => {
      const result = decodeBase64('AQ==');
      expect(result.length).toBeGreaterThan(0);
    });

    it('decodes with partial final group (3 chars + padding)', () => {
      const result = decodeBase64('AQI=');
      expect(result.length).toBeGreaterThan(0);
    });

    it('decodes null bytes', () => {
      const result = decodeBase64('AAAA');
      expect(Array.from(result)).toEqual([0, 0, 0]);
    });

    it('decodes high bytes', () => {
      const result = decodeBase64('/w==');
      expect(result[0]).toBe(255);
    });
  });
});
