import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { IndexerClient } from '@musebook/svm-8004';
import { SqliteStore } from '../src/store.ts';
import { listen } from '../src/server.ts';

const PORT = 34567;
const store = new SqliteStore('sqlite::memory:');
const now = '2026-01-02T00:00:00.000Z';

store.upsert('agents', {
  asset: 'Agent111111111111111111111111111111111111111',
  owner: 'Owner111111111111111111111111111111111111111',
  creator: 'Creator11111111111111111111111111111111111',
  agent_uri: 'ipfs://agent',
  agent_wallet: null,
  collection: 'Collection11111111111111111111111111111111',
  collection_pointer: 'c1:abc',
  col_locked: false,
  nft_name: 'Test Agent',
  atom_enabled: true,
  trust_tier: 2,
  quality_score: 8000,
  confidence: 5000,
  risk_score: 10,
  diversity_ratio: 200,
  feedback_count: 1,
  raw_avg_score: 80,
  sort_key: '2000000008000000001',
  block_slot: 10,
  tx_signature: 'sig',
  created_at: now,
  updated_at: now,
}, 'asset');

store.upsert('feedbacks', {
  id: 'Agent111111111111111111111111111111111111111:Client11111111111111111111111111111111111111:0',
  asset: 'Agent111111111111111111111111111111111111111',
  client_address: 'Client11111111111111111111111111111111111111',
  feedback_index: 0,
  value: '80',
  value_decimals: 0,
  score: 80,
  tag1: 'starred',
  tag2: null,
  is_revoked: false,
  block_slot: 11,
  tx_signature: 'sig-fb',
  created_at: now,
}, 'id');

const server = await listen({ store, port: PORT, host: '127.0.0.1' });
const client = new IndexerClient({
  baseUrl: [`http://127.0.0.1:${PORT}/rest/v1`],
  timeout: 5_000,
  retries: 0,
});

describe('REST surface vs IndexerClient', () => {
  it('serves health', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/health`);
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string; counts: { agents: number } };
    assert.equal(body.status, 'ok');
    assert.equal(body.counts.agents, 1);
  });

  it('lets the SDK read an agent, list agents, and count', async () => {
    const agent = await client.getAgent('Agent111111111111111111111111111111111111111');
    assert.ok(agent);
    assert.equal(agent.nft_name, 'Test Agent');
    assert.equal(agent.collection_pointer, 'c1:abc');
    const list = await client.getAgents({ limit: 10 });
    assert.equal(list.length, 1);
    const count = await client.getCount('agents', {});
    assert.equal(count, 1);
  });

  it('lets the SDK read feedbacks, reputation, and leaderboard', async () => {
    const feedbacks = await client.getFeedbacks('Agent111111111111111111111111111111111111111');
    assert.equal(feedbacks.length, 1);
    assert.equal(Number(feedbacks[0].score), 80);
    const reputation = await client.getAgentReputation('Agent111111111111111111111111111111111111111');
    assert.ok(reputation);
    assert.equal(Number(reputation.feedback_count), 1);
    const board = await client.getLeaderboard({ limit: 5 });
    assert.equal(board.length, 1);
    assert.equal(board[0].asset, 'Agent111111111111111111111111111111111111111');
  });

  it('serves global stats and collection views', async () => {
    const stats = await client.getGlobalStats();
    assert.equal(stats.total_agents, 1);
    assert.equal(stats.total_feedbacks, 1);
    const collections = await client.getCollectionPointers();
    assert.ok(collections.length >= 1);
  });
});

after(async () => {
  server.close();
  store.close();
});
