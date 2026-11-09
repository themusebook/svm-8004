/**
 * Read-only verification: backfill devnet 8004 accounts, serve REST,
 * and confirm IndexerClient can read real agents through this indexer.
 * Never sends a transaction.
 */
import { IndexerClient, DEFAULT_AGENT_REGISTRY_PROGRAM_ID } from '@musebook/svm-8004';
import { loadConfig } from '../src/config.ts';
import { Ingestor } from '../src/ingest.ts';
import { listen } from '../src/server.ts';
import { openStore } from '../src/store.ts';

const port = Number(process.env.VERIFY_PORT ?? 3005);

async function main(): Promise<void> {
  const config = loadConfig({
    cluster: 'devnet',
    port,
    host: '127.0.0.1',
    databaseUrl: process.env.DATABASE_URL ?? 'sqlite:./data/verify-devnet.db',
  });
  if (config.cluster !== 'devnet') {
    throw new Error('verify-devnet is hard-wired to devnet');
  }

  const store = await openStore(config.databaseUrl);
  const ingestor = new Ingestor(store, config);
  const server = await listen({ store, port: config.port, host: config.host, ingestor });
  const started = Date.now();
  console.log(`registry ${config.registryProgramId.toBase58()} (expected ${DEFAULT_AGENT_REGISTRY_PROGRAM_ID.toBase58()})`);
  console.log(`rpc ${config.rpcUrl}`);

  const status = await ingestor.backfill();
  const elapsed = Date.now() - started;
  console.log(`backfill ${elapsed}ms`, status);

  const client = new IndexerClient({
    baseUrl: [`http://127.0.0.1:${config.port}/rest/v1`],
    timeout: 15_000,
    retries: 1,
  });

  const count = await client.getCount('agents', {});
  const agents = await client.getAgents({ limit: 5, order: 'created_at.desc' });
  console.log(`IndexerClient.getCount(agents) = ${count}`);
  console.log(`IndexerClient.getAgents(limit=5) = ${agents.length}`);
  for (const agent of agents) {
    console.log(
      `  asset=${agent.asset} owner=${agent.owner} name=${agent.nft_name} uri=${agent.agent_uri} feedbacks=${agent.feedback_count} tier=${agent.trust_tier}`,
    );
  }
  if (agents[0]) {
    const one = await client.getAgent(agents[0].asset);
    console.log(`IndexerClient.getAgent(${agents[0].asset}) => ${one ? one.nft_name ?? one.asset : 'null'}`);
    const feedbacks = await client.getFeedbacks(agents[0].asset);
    console.log(`IndexerClient.getFeedbacks(${agents[0].asset}) => ${feedbacks.length}`);
  }
  const stats = await client.getGlobalStats();
  console.log('global_stats', stats);

  const ok = count > 0 && agents.length > 0;
  console.log(ok ? 'VERIFY_OK' : 'VERIFY_EMPTY');
  server.close();
  await store.close();
  process.exit(ok ? 0 : 3);
}

main().catch((error) => {
  console.error('VERIFY_FAILED', error);
  process.exit(1);
});
