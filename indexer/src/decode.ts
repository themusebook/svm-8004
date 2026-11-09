import { PublicKey } from '@solana/web3.js';
import {
  AgentAccount,
  AtomStats,
  FeedbackAccount,
  FeedbackTagsPda,
  MetadataEntryPda,
  ResponseAccount,
  ResponseIndexAccount,
} from '@musebook/svm-8004';
import { createHash } from 'node:crypto';
import type { Row } from './store.js';

function pk(bytes: Uint8Array | null | undefined): string | null {
  if (!bytes) return null;
  return new PublicKey(bytes).toBase58();
}

function now(): string {
  return new Date().toISOString();
}

export function sortKey(trustTier: number, qualityScore: number, feedbackCount: number): string {
  return (
    BigInt(trustTier) * 10n ** 12n +
    BigInt(qualityScore) * 10n ** 6n +
    BigInt(feedbackCount)
  ).toString();
}

export function decodeAgent(data: Buffer, extras?: { slot?: number; signature?: string }): Row | null {
  try {
    const account = AgentAccount.deserialize(data);
    const asset = account.getAssetPublicKey().toBase58();
    const feedbackCount = Number(account.feedback_count);
    const stamp = now();
    return {
      asset,
      owner: account.getOwnerPublicKey().toBase58(),
      creator: account.getCreatorPublicKey().toBase58(),
      agent_uri: account.agent_uri || null,
      agent_wallet: account.getAgentWalletPublicKey()?.toBase58() ?? null,
      collection: account.getCollectionPublicKey().toBase58(),
      collection_pointer: account.col || null,
      col_locked: Boolean(account.col_locked),
      parent_asset: account.getParentAssetPublicKey()?.toBase58() ?? null,
      parent_locked: Boolean(account.parent_locked),
      nft_name: account.nft_name || null,
      atom_enabled: Boolean(account.atom_enabled),
      trust_tier: 0,
      quality_score: 0,
      confidence: 0,
      risk_score: 0,
      diversity_ratio: 0,
      feedback_count: feedbackCount,
      raw_avg_score: 0,
      sort_key: sortKey(0, 0, feedbackCount),
      block_slot: extras?.slot ?? 0,
      tx_signature: extras?.signature ?? '',
      updated_at: stamp,
      created_at: stamp,
    };
  } catch {
    return null;
  }
}

export function decodeAtomStats(data: Buffer): Row | null {
  try {
    const stats = AtomStats.deserialize(data);
    const feedbackCount = Number(stats.feedback_count);
    return {
      asset: pk(stats.asset),
      collection: pk(stats.collection),
      trust_tier: stats.trust_tier,
      quality_score: stats.quality_score,
      confidence: stats.confidence,
      risk_score: stats.risk_score,
      diversity_ratio: stats.diversity_ratio,
      feedback_count: feedbackCount,
      raw_avg_score: stats.last_score ?? 0,
      sort_key: sortKey(stats.trust_tier, stats.quality_score, feedbackCount),
      atom_enabled: true,
    };
  } catch {
    return null;
  }
}

export function decodeFeedback(data: Buffer, extras?: { slot?: number; signature?: string }): Row | null {
  try {
    const account = FeedbackAccount.deserialize(data);
    const asset = account.getAssetPublicKey().toBase58();
    const client = account.getClientPublicKey().toBase58();
    const index = Number(account.feedback_index);
    const stamp = now();
    return {
      id: `${asset}:${client}:${index}`,
      asset,
      client_address: client,
      feedback_index: index,
      value: String(account.score),
      value_decimals: 0,
      score: account.score,
      tag1: null,
      tag2: null,
      endpoint: null,
      feedback_uri: null,
      running_digest: null,
      feedback_hash: null,
      proof_pass_auth: null,
      is_revoked: Boolean(account.is_revoked),
      revoked_at: account.is_revoked ? stamp : null,
      block_slot: extras?.slot ?? 0,
      tx_signature: extras?.signature ?? '',
      created_at: stamp,
    };
  } catch {
    return null;
  }
}

export function decodeTags(data: Buffer): { tag1: string | null; tag2: string | null } | null {
  try {
    const tags = FeedbackTagsPda.deserialize(data);
    return {
      tag1: tags.tag1 || null,
      tag2: tags.tag2 || null,
    };
  } catch {
    return null;
  }
}

export function decodeMetadata(data: Buffer, extras?: { slot?: number; signature?: string }): Row | null {
  try {
    const entry = MetadataEntryPda.deserialize(data);
    const asset = entry.getAssetPublicKey().toBase58();
    const key = entry.metadata_key ?? entry.key;
    const value = entry.getValueString();
    const stamp = now();
    return {
      id: `${asset}:${key}`,
      asset,
      key,
      key_hash: createHash('sha256').update(key).digest('hex'),
      value: Buffer.from(value, 'utf8').toString('base64'),
      immutable: Boolean(entry.isImmutable),
      block_slot: extras?.slot ?? 0,
      tx_signature: extras?.signature ?? '',
      created_at: stamp,
      updated_at: stamp,
    };
  } catch {
    return null;
  }
}

export function decodeResponse(
  data: Buffer,
  extras: { asset: string; clientAddress?: string; feedbackIndex: number; slot?: number; signature?: string },
): Row | null {
  try {
    const account = ResponseAccount.deserialize(data);
    const responder = account.getResponderPublicKey().toBase58();
    const stamp = now();
    return {
      id: `${extras.asset}:${extras.feedbackIndex}:${responder}`,
      asset: extras.asset,
      client_address: extras.clientAddress ?? null,
      feedback_index: extras.feedbackIndex,
      responder,
      response_uri: null,
      response_hash: null,
      running_digest: null,
      response_count: null,
      block_slot: extras.slot ?? 0,
      tx_signature: extras.signature ?? '',
      created_at: stamp,
    };
  } catch {
    return null;
  }
}

export function decodeResponseIndex(data: Buffer): number | null {
  try {
    const account = ResponseIndexAccount.deserialize(data);
    return Number(account.response_count);
  } catch {
    return null;
  }
}
