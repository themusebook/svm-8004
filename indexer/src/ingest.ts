import {
  Connection,
  PublicKey,
  type AccountInfo,
  type ConfirmedSignatureInfo,
} from '@solana/web3.js';
import {
  ACCOUNT_DISCRIMINATORS,
  PDAHelpers,
  matchesDiscriminator,
} from '@musebook/svm-8004';
import bs58 from 'bs58';
import type { IndexerConfig } from './config.js';
import {
  decodeAgent,
  decodeAtomStats,
  decodeFeedback,
  decodeMetadata,
  decodeResponse,
  decodeResponseIndex,
  decodeTags,
  sortKey,
} from './decode.js';
import type { IndexerStore, Row } from './store.js';

export interface IngestStatus {
  running: boolean;
  lastError?: string;
  lastBackfillAt?: string;
  lastPollAt?: string;
  agents: number;
  feedbacks: number;
  metadata: number;
  responses: number;
  revocations: number;
  signaturesProcessed: number;
}

function discFilter(discriminator: Buffer) {
  return {
    memcmp: {
      offset: 0,
      bytes: bs58.encode(discriminator),
    },
  };
}

async function getProgramAccountsSafe(
  connection: Connection,
  programId: PublicKey,
  discriminator: Buffer,
): Promise<ReadonlyArray<{ pubkey: PublicKey; account: AccountInfo<Buffer> }>> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await connection.getProgramAccounts(programId, {
        commitment: 'confirmed',
        filters: [discFilter(discriminator)],
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
      }
    }
  }
  throw new Error(`getProgramAccounts failed for ${programId.toBase58()}: ${lastError?.message}`);
}

async function chunkedGetMultiple(
  connection: Connection,
  keys: PublicKey[],
  size = 100,
): Promise<Array<AccountInfo<Buffer> | null>> {
  const out: Array<AccountInfo<Buffer> | null> = [];
  for (let i = 0; i < keys.length; i += size) {
    const slice = keys.slice(i, i + size);
    const infos = await connection.getMultipleAccountsInfo(slice, 'confirmed');
    out.push(...infos);
  }
  return out;
}

export class Ingestor {
  readonly status: IngestStatus = {
    running: false,
    signaturesProcessed: 0,
    agents: 0,
    feedbacks: 0,
    metadata: 0,
    responses: 0,
    revocations: 0,
  };
  private timer?: NodeJS.Timeout;
  private readonly connection: Connection;

  constructor(
    private readonly store: IndexerStore,
    private readonly config: IndexerConfig,
    connection?: Connection,
  ) {
    this.connection = connection ?? new Connection(config.rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: config.wsUrl,
    });
  }

  async backfill(): Promise<IngestStatus> {
    this.status.running = true;
    try {
      await this.ingestAgents();
      await this.ingestFeedbacks();
      await this.ingestMetadata();
      await this.ingestAtomStats();
      await this.enrichFeedbackTagsAndResponses();
      await this.refreshCounts();
      this.status.lastBackfillAt = new Date().toISOString();
      this.status.lastError = undefined;
    } catch (error) {
      this.status.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      this.status.running = false;
    }
    return this.status;
  }

  startPolling(): void {
    if (this.timer) return;
    const tick = async () => {
      try {
        await this.pollSignatures();
        await this.refreshCounts();
        this.status.lastPollAt = new Date().toISOString();
        this.status.lastError = undefined;
      } catch (error) {
        this.status.lastError = error instanceof Error ? error.message : String(error);
      }
    };
    void tick();
    this.timer = setInterval(() => void tick(), this.config.pollIntervalMs);
    this.timer.unref?.();
  }

  stopPolling(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async ingestAgents(): Promise<void> {
    const accounts = await getProgramAccountsSafe(
      this.connection,
      this.config.registryProgramId,
      ACCOUNT_DISCRIMINATORS.AgentAccount,
    );
    for (const item of accounts) {
      const row = decodeAgent(Buffer.from(item.account.data));
      if (row) await this.store.upsert('agents', row, 'asset');
    }
  }

  private async ingestFeedbacks(): Promise<void> {
    const accounts = await getProgramAccountsSafe(
      this.connection,
      this.config.registryProgramId,
      ACCOUNT_DISCRIMINATORS.FeedbackAccount,
    );
    for (const item of accounts) {
      const row = decodeFeedback(Buffer.from(item.account.data));
      if (!row) continue;
      await this.store.upsert('feedbacks', row, 'id');
      if (row.is_revoked) {
        await this.store.upsert('revocations', {
          id: String(row.id),
          asset: row.asset,
          client_address: row.client_address,
          feedback_index: row.feedback_index,
          original_score: row.score,
          slot: row.block_slot,
          atom_enabled: false,
          had_impact: true,
          tx_signature: row.tx_signature,
          created_at: row.revoked_at ?? row.created_at,
        }, 'id');
      }
    }
  }

  private async ingestMetadata(): Promise<void> {
    const accounts = await getProgramAccountsSafe(
      this.connection,
      this.config.registryProgramId,
      ACCOUNT_DISCRIMINATORS.MetadataEntryPda,
    );
    for (const item of accounts) {
      const row = decodeMetadata(Buffer.from(item.account.data));
      if (row) await this.store.upsert('metadata', row, 'id');
    }
  }

  private async ingestAtomStats(): Promise<void> {
    const accounts = await getProgramAccountsSafe(
      this.connection,
      this.config.atomProgramId,
      ACCOUNT_DISCRIMINATORS.AtomStats,
    );
    const agents = await this.store.all('agents');
    const byAsset = new Map(agents.map((row) => [String(row.asset), row]));
    for (const item of accounts) {
      const stats = decodeAtomStats(Buffer.from(item.account.data));
      if (!stats?.asset) continue;
      const existing = byAsset.get(String(stats.asset));
      if (!existing) continue;
      const merged: Row = {
        ...existing,
        trust_tier: stats.trust_tier,
        quality_score: stats.quality_score,
        confidence: stats.confidence,
        risk_score: stats.risk_score,
        diversity_ratio: stats.diversity_ratio,
        feedback_count: stats.feedback_count ?? existing.feedback_count,
        raw_avg_score: stats.raw_avg_score,
        sort_key: stats.sort_key ?? sortKey(Number(stats.trust_tier), Number(stats.quality_score), Number(stats.feedback_count ?? 0)),
        atom_enabled: true,
        updated_at: new Date().toISOString(),
      };
      await this.store.upsert('agents', merged, 'asset');
    }
  }

  private async enrichFeedbackTagsAndResponses(): Promise<void> {
    const feedbacks = await this.store.all('feedbacks');
    const tagKeys: PublicKey[] = [];
    const indexKeys: PublicKey[] = [];
    for (const fb of feedbacks) {
      const asset = new PublicKey(String(fb.asset));
      const index = Number(fb.feedback_index);
      tagKeys.push(PDAHelpers.getFeedbackTagsPDA(asset, index, this.config.registryProgramId)[0]);
      indexKeys.push(PDAHelpers.getResponseIndexPDA(asset, index, this.config.registryProgramId)[0]);
    }
    const tagInfos = await chunkedGetMultiple(this.connection, tagKeys);
    for (let i = 0; i < feedbacks.length; i++) {
      const info = tagInfos[i];
      if (!info) continue;
      const tags = decodeTags(Buffer.from(info.data));
      if (!tags) continue;
      await this.store.upsert('feedbacks', { ...feedbacks[i], ...tags }, 'id');
    }

    const indexInfos = await chunkedGetMultiple(this.connection, indexKeys);
    const responseKeys: PublicKey[] = [];
    const responseMeta: Array<{ asset: string; client?: string; feedbackIndex: number; responseIndex: number }> = [];
    for (let i = 0; i < feedbacks.length; i++) {
      const info = indexInfos[i];
      if (!info) continue;
      const count = decodeResponseIndex(Buffer.from(info.data)) ?? 0;
      const asset = String(feedbacks[i].asset);
      const feedbackIndex = Number(feedbacks[i].feedback_index);
      for (let r = 0; r < count && r < 32; r++) {
        responseKeys.push(
          PDAHelpers.getResponsePDA(new PublicKey(asset), feedbackIndex, r, this.config.registryProgramId)[0],
        );
        responseMeta.push({
          asset,
          client: feedbacks[i].client_address ? String(feedbacks[i].client_address) : undefined,
          feedbackIndex,
          responseIndex: r,
        });
      }
    }
    const responseInfos = await chunkedGetMultiple(this.connection, responseKeys);
    for (let i = 0; i < responseKeys.length; i++) {
      const info = responseInfos[i];
      if (!info) continue;
      const row = decodeResponse(Buffer.from(info.data), {
        asset: responseMeta[i].asset,
        clientAddress: responseMeta[i].client,
        feedbackIndex: responseMeta[i].feedbackIndex,
      });
      if (row) await this.store.upsert('feedback_responses', row, 'id');
    }
  }

  async pollSignatures(): Promise<void> {
    const before = await this.store.getCursor('registry:last_signature');
    const sigs: ConfirmedSignatureInfo[] = [];
    let cursor: string | undefined;
    // Walk newest-first until we hit the cursor or run out of pages (cap 5 pages).
    for (let page = 0; page < 5; page++) {
      const batch = await this.connection.getSignaturesForAddress(this.config.registryProgramId, {
        limit: 200,
        before: cursor,
      });
      if (batch.length === 0) break;
      let hitKnown = false;
      for (const info of batch) {
        if (before && info.signature === before) {
          hitKnown = true;
          break;
        }
        sigs.push(info);
      }
      if (hitKnown || batch.length < 200) break;
      cursor = batch[batch.length - 1].signature;
    }
    // Process oldest first so the cursor advances correctly.
    sigs.reverse();
    for (const info of sigs) {
      await this.ingestSignature(info);
      await this.store.setCursor('registry:last_signature', info.signature);
      this.status.signaturesProcessed += 1;
    }
  }

  private async ingestSignature(info: ConfirmedSignatureInfo): Promise<void> {
    const tx = await this.connection.getTransaction(info.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
    if (!tx) return;
    const message = tx.transaction.message as {
      accountKeys?: Array<PublicKey | { pubkey?: PublicKey; toString(): string }>;
      staticAccountKeys?: PublicKey[];
    };
    const rawKeys: Array<PublicKey | string> = [];
    if (message.accountKeys) {
      for (const key of message.accountKeys) {
        rawKeys.push(key instanceof PublicKey ? key : (key.pubkey ?? String(key)));
      }
    } else if (message.staticAccountKeys) {
      rawKeys.push(...message.staticAccountKeys);
      rawKeys.push(...(tx.meta?.loadedAddresses?.writable ?? []));
      rawKeys.push(...(tx.meta?.loadedAddresses?.readonly ?? []));
    }
    const pubkeys = rawKeys.map((key) => (key instanceof PublicKey ? key : new PublicKey(key)));
    const infos = await chunkedGetMultiple(this.connection, pubkeys);
    const extras = { slot: tx.slot, signature: info.signature };
    for (const account of infos) {
      if (!account) continue;
      const owner = account.owner.toBase58();
      if (owner !== this.config.registryProgramId.toBase58() && owner !== this.config.atomProgramId.toBase58()) {
        continue;
      }
      const data = Buffer.from(account.data);
      if (matchesDiscriminator(data, ACCOUNT_DISCRIMINATORS.AgentAccount)) {
        const row = decodeAgent(data, extras);
        if (row) await this.store.upsert('agents', row, 'asset');
      } else if (matchesDiscriminator(data, ACCOUNT_DISCRIMINATORS.FeedbackAccount)) {
        const row = decodeFeedback(data, extras);
        if (row) await this.store.upsert('feedbacks', row, 'id');
      } else if (matchesDiscriminator(data, ACCOUNT_DISCRIMINATORS.MetadataEntryPda)) {
        const row = decodeMetadata(data, extras);
        if (row) await this.store.upsert('metadata', row, 'id');
      } else if (matchesDiscriminator(data, ACCOUNT_DISCRIMINATORS.AtomStats)) {
        const stats = decodeAtomStats(data);
        if (stats?.asset) {
          const agents = await this.store.all('agents');
          const existing = agents.find((row) => row.asset === stats.asset);
          if (existing) await this.store.upsert('agents', { ...existing, ...stats, updated_at: new Date().toISOString() }, 'asset');
        }
      }
    }
  }

  private async refreshCounts(): Promise<void> {
    const counts = await this.store.counts();
    Object.assign(this.status, counts);
  }
}
