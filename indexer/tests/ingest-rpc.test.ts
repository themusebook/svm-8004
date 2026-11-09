import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { PublicKey, type Connection } from '@solana/web3.js';
import { loadConfig } from '../src/config.ts';
import { Ingestor } from '../src/ingest.ts';
import {
  MAX_SUPPORTED_TRANSACTION_VERSION,
  TX_READ_CONFIG,
  backoffDelayMs,
  isRateLimitError,
  withRpcRetry,
} from '../src/rpc.ts';
import type { IndexerStore, Row } from '../src/store.ts';

function memoryStore(): IndexerStore {
  const tables = new Map<string, Row[]>();
  const cursors = new Map<string, string>();
  return {
    kind: 'sqlite',
    upsert(table, row, conflictKey) {
      const list = tables.get(table) ?? [];
      const idx = list.findIndex((item) => item[conflictKey] === row[conflictKey]);
      if (idx >= 0) list[idx] = { ...list[idx], ...row };
      else list.push(row);
      tables.set(table, list);
    },
    all(table) {
      return tables.get(table) ?? [];
    },
    getCursor(key) {
      return cursors.get(key);
    },
    setCursor(key, value) {
      cursors.set(key, value);
    },
    counts() {
      return {
        agents: (tables.get('agents') ?? []).length,
        feedbacks: (tables.get('feedbacks') ?? []).length,
        metadata: (tables.get('metadata') ?? []).length,
        responses: (tables.get('feedback_responses') ?? []).length,
        revocations: (tables.get('revocations') ?? []).length,
      };
    },
    close() {},
  };
}

describe('RPC retry and transaction version', () => {
  it('recognizes HTTP and JSON-RPC 429 errors', () => {
    assert.equal(isRateLimitError(new Error('429 Too Many Requests: body')), true);
    assert.equal(isRateLimitError({ code: 429, message: 'Too many requests for a specific RPC call' }), true);
    assert.equal(isRateLimitError({ status: 429 }), true);
    assert.equal(isRateLimitError(new Error('failed to get transaction: Transaction version (1) is not supported')), false);
  });

  it('applies exponential backoff with jitter and a cap', () => {
    assert.equal(backoffDelayMs(1, 500, 16_000, () => 0.5), 500);
    assert.equal(backoffDelayMs(2, 500, 16_000, () => 0.5), 1_000);
    assert.equal(backoffDelayMs(3, 500, 16_000, () => 0.5), 2_000);
    assert.equal(backoffDelayMs(10, 500, 16_000, () => 0.5), 16_000);
    const low = backoffDelayMs(1, 500, 16_000, () => 0);
    const high = backoffDelayMs(1, 500, 16_000, () => 1);
    assert.equal(low, 250);
    assert.equal(high, 750);
  });

  it('retries 429s then succeeds', async () => {
    const delays: number[] = [];
    let attempts = 0;
    const result = await withRpcRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('429 Too Many Requests');
        return 'ok';
      },
      {
        random: () => 0.5,
        sleep: async (ms) => {
          delays.push(ms);
        },
      },
    );
    assert.equal(result, 'ok');
    assert.equal(attempts, 3);
    assert.deepEqual(delays, [500, 1000]);
  });
});

describe('loadConfig RPC env', () => {
  const keys = [
    'SVM8004_RPC_URL',
    'SOLANA_RPC_URL',
    'SVM8004_CLUSTER',
    'SVM8004_POLL_INTERVAL_MS',
    'SVM8004_MAX_SIGNATURES_PER_POLL',
    'PORT',
    'HOST',
    'DATABASE_URL',
  ];
  const saved = new Map(keys.map((key) => [key, process.env[key]]));
  after(() => {
    for (const key of keys) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('reads SOLANA_RPC_URL when SVM8004_RPC_URL is unset', () => {
    delete process.env.SVM8004_RPC_URL;
    process.env.SOLANA_RPC_URL = 'https://devnet-dedicated.example/rpc';
    process.env.SVM8004_CLUSTER = 'devnet';
    delete process.env.SVM8004_POLL_INTERVAL_MS;
    delete process.env.SVM8004_MAX_SIGNATURES_PER_POLL;
    const config = loadConfig();
    assert.equal(config.rpcUrl, 'https://devnet-dedicated.example/rpc');
    assert.equal(config.cluster, 'devnet');
    assert.equal(config.pollIntervalMs, 30_000);
    assert.equal(config.maxSignaturesPerPoll, 40);
  });

  it('lets SVM8004_RPC_URL win over SOLANA_RPC_URL', () => {
    process.env.SVM8004_RPC_URL = 'https://preferred.example/rpc';
    process.env.SOLANA_RPC_URL = 'https://devnet-dedicated.example/rpc';
    const config = loadConfig();
    assert.equal(config.rpcUrl, 'https://preferred.example/rpc');
  });
});

describe('Ingestor signature polling', () => {
  it('requests maxSupportedTransactionVersion 1 and retries 429s', async () => {
    assert.equal(MAX_SUPPORTED_TRANSACTION_VERSION, 1);
    assert.equal(TX_READ_CONFIG.maxSupportedTransactionVersion, 1);

    const txCalls: Array<{ signature: string; config: unknown }> = [];
    let failuresLeft = 1;
    const connection = {
      getSignaturesForAddress: async () => [
        { signature: 'sig-b', slot: 20, err: null, memo: null, blockTime: null },
        { signature: 'sig-a', slot: 10, err: null, memo: null, blockTime: null },
        { signature: 'sig-old', slot: 5, err: null, memo: null, blockTime: null },
      ],
      getTransaction: async (signature: string, config: unknown) => {
        txCalls.push({ signature, config });
        if (failuresLeft > 0) {
          failuresLeft -= 1;
          throw Object.assign(new Error('429 Too Many Requests: rate limited'), { code: 429 });
        }
        return {
          slot: 20,
          transaction: { message: { accountKeys: [] } },
          meta: null,
        };
      },
      getMultipleAccountsInfo: async () => [],
    } as unknown as Connection;

    const store = memoryStore();
    await store.setCursor('registry:last_signature', 'sig-old');
    const delays: number[] = [];
    const config = loadConfig({
      rpcUrl: 'http://127.0.0.1:8899',
      registryProgramId: new PublicKey('8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C'),
      maxSignaturesPerPoll: 2,
      pollIntervalMs: 60_000,
    });
    const ingestor = new Ingestor(store, config, connection, {
      random: () => 0.5,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    await ingestor.pollSignatures();

    assert.deepEqual(txCalls.map((call) => call.signature), ['sig-a', 'sig-a', 'sig-b']);
    for (const call of txCalls) {
      assert.deepEqual(call.config, TX_READ_CONFIG);
    }
    assert.deepEqual(delays, [500, 200]);
    assert.equal(await store.getCursor('registry:last_signature'), 'sig-b');
    assert.equal(ingestor.status.signaturesProcessed, 2);
  });

  it('pauses a tick on an exhausted 429 without failing later signatures', async () => {
    const txCalls: string[] = [];
    const connection = {
      getSignaturesForAddress: async () => [
        { signature: 'sig-c', slot: 30, err: null, memo: null, blockTime: null },
        { signature: 'sig-b', slot: 20, err: null, memo: null, blockTime: null },
        { signature: 'sig-a', slot: 10, err: null, memo: null, blockTime: null },
      ],
      getTransaction: async (signature: string) => {
        txCalls.push(signature);
        if (signature === 'sig-b') {
          throw Object.assign(new Error('429 Too Many Requests: rate limited'), { code: 429 });
        }
        return {
          slot: 10,
          transaction: { message: { accountKeys: [] } },
          meta: null,
        };
      },
      getMultipleAccountsInfo: async () => [],
    } as unknown as Connection;

    const store = memoryStore();
    const config = loadConfig({
      rpcUrl: 'http://127.0.0.1:8899',
      registryProgramId: new PublicKey('8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C'),
      maxSignaturesPerPoll: 10,
      pollIntervalMs: 60_000,
    });
    const ingestor = new Ingestor(store, config, connection, {
      retries: 2,
      random: () => 0.5,
      sleep: async () => {},
    });
    await ingestor.pollSignatures();
    assert.deepEqual(txCalls, ['sig-a', 'sig-b', 'sig-b']);
    assert.equal(await store.getCursor('registry:last_signature'), 'sig-a');
    assert.equal(ingestor.status.signaturesProcessed, 1);
  });
});
