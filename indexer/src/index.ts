#!/usr/bin/env node
/**
 * @musebook/svm-8004-indexer
 *
 * Ingests deployed 8004 Agent Registry + ATOM accounts (read-only) and
 * serves the PostgREST-shaped REST API expected by IndexerClient.
 *
 * GraphQL v2 is a documented follow-up (the SDK prefers GraphQL when a
 * URL is configured, but REST v1 is fully spoken by IndexerClient).
 */

import { loadConfig } from './config.js';
import { Ingestor } from './ingest.js';
import { listen } from './server.js';
import { openStore } from './store.js';

export { loadConfig } from './config.js';
export { Ingestor } from './ingest.js';
export { createServer, listen } from './server.js';
export { openStore, SqliteStore, PostgresStore } from './store.js';
export { parseQuery, applyQuery } from './query.js';

async function main(): Promise<void> {
  const config = loadConfig();
  if (config.cluster === 'mainnet-beta') {
    console.warn('Refusing to start against mainnet-beta by default. This indexer is intended for devnet/localnet.');
    process.exit(2);
  }

  const store = await openStore(config.databaseUrl);
  const ingestor = new Ingestor(store, config);
  const server = await listen({
    store,
    port: config.port,
    host: config.host,
    apiKey: config.apiKey,
    ingestor,
  });

  console.log(
    `svm-8004 indexer listening on http://${config.host}:${config.port} ` +
      `(cluster=${config.cluster} rpc=${config.rpcUrl} store=${store.kind} ` +
      `registry=${config.registryProgramId.toBase58()})`,
  );

  try {
    const status = await ingestor.backfill();
    console.log(
      `backfill complete: agents=${status.agents} feedbacks=${status.feedbacks} ` +
        `metadata=${status.metadata} responses=${status.responses} revocations=${status.revocations}`,
    );
  } catch (error) {
    console.error('backfill failed (server is still up; retrying via poll):', error);
  }

  ingestor.startPolling();

  const shutdown = async () => {
    ingestor.stopPolling();
    server.close();
    await store.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

const isMain = process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('index.ts'));
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
