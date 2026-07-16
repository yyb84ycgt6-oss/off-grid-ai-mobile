/**
 * API Forge — compression-law enforcement.
 *
 * Every artifact the Forge produces is stored SEALED through the eYe pod
 * pipeline (deflate-9 → AES-256-GCM with a PBKDF2-derived key → SHA-256
 * integrity gate). These are the application's compression laws; the
 * Forge refuses to persist plaintext artifacts.
 */

import { sealPod, openPodText, Pod } from '../pods/eyePod';
import { GeneratedApi } from './types';

export const COMPRESSION_LAWS = [
  'Artifacts are compressed with deflate level 9 before encryption.',
  'Encryption is AES-256-GCM; keys derive from the secret via PBKDF2 (210k iterations) — no key files.',
  'A SHA-256 checksum gates every open; tampered pods refuse to unseal.',
  'Generated artifacts persist only as sealed pods, never plaintext.',
] as const;

export interface SealedArtifact {
  entity: string;
  pod: Pod;
  sealedBytes: number;
  rawBytes: number;
  ratio: number;
}

/** Seal a generated API per the compression laws. */
export async function sealArtifact(api: GeneratedApi, secret: string): Promise<SealedArtifact> {
  const raw = JSON.stringify(api);
  const pod = await sealPod(raw, secret);
  return {
    entity: api.entity,
    pod,
    sealedBytes: pod.bytes.length,
    rawBytes: raw.length,
    ratio: Number((raw.length / pod.bytes.length).toFixed(2)),
  };
}

/** Unseal a previously sealed artifact (integrity-gated). */
export async function openArtifact(sealed: SealedArtifact, secret: string): Promise<GeneratedApi> {
  const text = await openPodText(sealed.pod.bytes, secret);
  return JSON.parse(text) as GeneratedApi;
}
